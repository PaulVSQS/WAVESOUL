import type { MotifData } from '../types/audio';

/**
 * MotifEngine — Motor de motivos visuales con memoria de frases musicales.
 *
 * Principio:
 *   Cada ~400ms (ventana de frames) calcula un "fingerprint" de 8 valores
 *   que describe el perfil espectral-energético de esa frase.
 *   Compara el fingerprint actual con los últimos N motivos almacenados.
 *   Si hay similitud suficiente, reutiliza (con variación) el gesto visual
 *   de ese motivo previo.
 *
 * La línea parece RECORDAR la música, no solo reaccionar a ella.
 *
 * Fingerprint (8 componentes):
 *   [0] Energía media de la ventana
 *   [1] Desviación estándar de energía (variabilidad)
 *   [2] Ratio bass / energía total
 *   [3] Ratio mid / energía total
 *   [4] Ratio treble / energía total
 *   [5] Slope de energía (tendencia ascendente/descendente)
 *   [6] Varianza de mid (estabilidad melódica)
 *   [7] Densidad de peaks (cuántos peaks hubo en la ventana)
 *
 * Gestos del motivo:
 *   Cada motivo tiene una frecuencia y amplitud de onda característica.
 *   Cuando se reconoce un motivo, se modula suavemente la línea con esa onda.
 *   La amplitud es muy pequeña (máx 0.008) para no interferir con la voz.
 */

interface MotifRecord {
  fingerprint: Float32Array;
  frequency: number;     // Frecuencia angular del gesto (rad/frame)
  amplitude: number;     // Amplitud del gesto (0 a 0.008)
  phaseOffset: number;   // Desfase de fase inicial
  timestamp: number;     // Frame en que se creó este motivo
  useCount: number;      // Cuántas veces se ha reconocido
}

const FINGERPRINT_SIZE = 8;
const WINDOW_FRAMES = 24;    // ~400ms @ 60fps
const BANK_SIZE = 10;        // Últimos 10 motivos en memoria
const SIMILARITY_THRESHOLD = 0.72; // Similitud mínima para reconocer un motivo
const MIN_ENERGY_FOR_MOTIF = 0.08;

export class MotifEngine {
  // ── Ventana deslizante de frames ──
  private windowEnergy: number[] = [];
  private windowBass: number[] = [];
  private windowMid: number[] = [];
  private windowTreble: number[] = [];
  private windowPeaks: boolean[] = [];
  private frameCount = 0;

  // ── Banco de motivos ──
  private motifBank: MotifRecord[] = [];

  // ── Estado del motivo activo ──
  private activeMotifIndex = -1;
  private activeSimilarity = 0;
  private motifPhase = 0;
  private smoothAmplitude = 0;
  private smoothFrequency = 0.04;
  private matchCooldown = 0;
  private readonly matchCooldownFrames = 30; // ~500ms entre reconocimientos

  // ── Variación por estado emocional ──
  private variationSmooth = 0;

  /**
   * Actualiza el motor con datos del frame actual.
   * Se llama cada frame.
   */
  update(
    energy: number,
    bass: number,
    mid: number,
    treble: number,
    isPeak: boolean,
    tension: number,
    valence: number,
  ): MotifData {
    this.frameCount++;

    // ── 1. Acumular ventana deslizante ──
    this.windowEnergy.push(energy);
    this.windowBass.push(bass);
    this.windowMid.push(mid);
    this.windowTreble.push(treble);
    this.windowPeaks.push(isPeak);

    // Mantener ventana de WINDOW_FRAMES
    if (this.windowEnergy.length > WINDOW_FRAMES) {
      this.windowEnergy.shift();
      this.windowBass.shift();
      this.windowMid.shift();
      this.windowTreble.shift();
      this.windowPeaks.shift();
    }

    // Necesitamos la ventana completa
    if (this.windowEnergy.length < WINDOW_FRAMES) {
      return this.makeInactiveData();
    }

    // Energía promedio de la ventana
    const avgEnergy = this.windowEnergy.reduce((a, b) => a + b, 0) / WINDOW_FRAMES;
    if (avgEnergy < MIN_ENERGY_FOR_MOTIF) {
      return this.makeInactiveData();
    }

    // ── 2. Calcular fingerprint del frame actual ──
    const fingerprint = this.computeFingerprint(avgEnergy);

    // ── 3. Cada WINDOW_FRAMES, intentar reconocer o registrar motivo ──
    let isMotifActive = false;
    let similarity = 0;
    let motifIndex = -1;

    if (this.frameCount % WINDOW_FRAMES === 0 && this.matchCooldown <= 0) {
      const match = this.findBestMatch(fingerprint);

      if (match.similarity >= SIMILARITY_THRESHOLD && match.index >= 0) {
        // ── Motivo reconocido — reutilizar con variación ──
        this.activeMotifIndex = match.index;
        this.activeSimilarity = match.similarity;
        this.motifBank[match.index].useCount++;
        motifIndex = match.index;
        isMotifActive = true;
        similarity = match.similarity;
        this.matchCooldown = this.matchCooldownFrames;
      } else {
        // ── Motivo nuevo — registrar en el banco ──
        this.registerNewMotif(fingerprint);
      }
    } else if (this.matchCooldown > 0) {
      this.matchCooldown--;
    }

    // Si hay un motivo activo del frame anterior, mantenerlo activo
    if (this.activeMotifIndex >= 0 && this.activeSimilarity >= SIMILARITY_THRESHOLD) {
      isMotifActive = true;
      similarity = this.activeSimilarity;
      motifIndex = this.activeMotifIndex;
    }

    // Decay suave de la similitud activa
    this.activeSimilarity *= 0.996;
    if (this.activeSimilarity < SIMILARITY_THRESHOLD * 0.8) {
      this.activeMotifIndex = -1;
      isMotifActive = false;
    }

    // ── 4. Construir salida ──
    if (!isMotifActive || motifIndex < 0 || motifIndex >= this.motifBank.length) {
      return this.makeInactiveData();
    }

    const motif = this.motifBank[motifIndex];

    // Suavizar frecuencia y amplitud
    this.smoothFrequency += (motif.frequency - this.smoothFrequency) * 0.04;
    const targetAmplitude = motif.amplitude * similarity * (0.5 + tension * 0.5);
    this.smoothAmplitude += (targetAmplitude - this.smoothAmplitude) * 0.03;

    // Avanzar fase del motivo
    this.motifPhase += this.smoothFrequency;

    // Variación basada en estado emocional
    const targetVariation = 0.3 + Math.abs(valence) * 0.4 + tension * 0.3;
    this.variationSmooth += (targetVariation - this.variationSmooth) * 0.02;

    return {
      isMotifActive: true,
      similarity,
      motifIndex,
      motifFrequency: this.smoothFrequency,
      motifPhase: this.motifPhase,
      motifAmplitude: this.smoothAmplitude,
      variation: this.variationSmooth,
    };
  }

  /**
   * Calcula el fingerprint de 8 componentes de la ventana actual.
   */
  private computeFingerprint(avgEnergy: number): Float32Array {
    const fp = new Float32Array(FINGERPRINT_SIZE);
    const n = this.windowEnergy.length;

    // [0] Energía media
    fp[0] = avgEnergy;

    // [1] Desviación estándar de energía
    let variance = 0;
    for (const e of this.windowEnergy) {
      const d = e - avgEnergy;
      variance += d * d;
    }
    fp[1] = Math.sqrt(variance / n);

    // Promedios de banda
    const avgBass = this.windowBass.reduce((a, b) => a + b, 0) / n;
    const avgMid = this.windowMid.reduce((a, b) => a + b, 0) / n;
    const avgTreble = this.windowTreble.reduce((a, b) => a + b, 0) / n;
    const totalBand = avgBass + avgMid + avgTreble + 0.001;

    // [2] Ratio bass
    fp[2] = avgBass / totalBand;
    // [3] Ratio mid
    fp[3] = avgMid / totalBand;
    // [4] Ratio treble
    fp[4] = avgTreble / totalBand;

    // [5] Slope de energía (pendiente lineal simplificada)
    const firstHalf = this.windowEnergy.slice(0, n / 2).reduce((a, b) => a + b, 0) / (n / 2);
    const secondHalf = this.windowEnergy.slice(n / 2).reduce((a, b) => a + b, 0) / (n - n / 2);
    fp[5] = (secondHalf - firstHalf) * 3; // Amplificar para discriminar mejor

    // [6] Varianza de mid (estabilidad melódica)
    let midVariance = 0;
    for (const m of this.windowMid) {
      const d = m - avgMid;
      midVariance += d * d;
    }
    fp[6] = Math.sqrt(midVariance / n) * 5;

    // [7] Densidad de peaks
    const peakCount = this.windowPeaks.filter(p => p).length;
    fp[7] = peakCount / n;

    // Normalizar el fingerprint a longitud unitaria para comparación coseno
    let mag = 0;
    for (let i = 0; i < FINGERPRINT_SIZE; i++) mag += fp[i] * fp[i];
    mag = Math.sqrt(mag);
    if (mag > 0.001) {
      for (let i = 0; i < FINGERPRINT_SIZE; i++) fp[i] /= mag;
    }

    return fp;
  }

  /**
   * Busca el motivo más similar en el banco.
   */
  private findBestMatch(fingerprint: Float32Array): { index: number; similarity: number } {
    let bestIndex = -1;
    let bestSimilarity = 0;

    for (let i = 0; i < this.motifBank.length; i++) {
      const motif = this.motifBank[i];
      // Similitud coseno (ambos vectores ya normalizados)
      let dot = 0;
      for (let j = 0; j < FINGERPRINT_SIZE; j++) {
        dot += fingerprint[j] * motif.fingerprint[j];
      }
      // dot ya es similitud coseno porque ambos están normalizados
      const similarity = Math.max(0, dot);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestIndex = i;
      }
    }

    return { index: bestIndex, similarity: bestSimilarity };
  }

  /**
   * Registra un nuevo motivo en el banco circular.
   * Genera una frecuencia de gesto característica basada en el fingerprint.
   */
  private registerNewMotif(fingerprint: Float32Array): void {
    // Frecuencia del gesto derivada del fingerprint (determinística pero variada)
    // Rango: 0.02 - 0.08 rad/frame (período 78-314 frames = 1.3-5.2s)
    const freqBase = fingerprint[3] * 0.04 + fingerprint[2] * 0.02 + fingerprint[4] * 0.02;
    const frequency = Math.max(0.02, Math.min(0.08, freqBase + 0.025));

    // Amplitud: pequeña, basada en la energía del motivo (máx 0.008)
    const amplitude = Math.min(0.008, fingerprint[0] * 0.012);

    // Fase inicial aleatoria derivada del fingerprint para que cada motivo sea único
    const phaseOffset = (fingerprint[5] + fingerprint[6]) * Math.PI;

    const record: MotifRecord = {
      fingerprint: new Float32Array(fingerprint), // copia
      frequency,
      amplitude,
      phaseOffset,
      timestamp: this.frameCount,
      useCount: 0,
    };

    if (this.motifBank.length < BANK_SIZE) {
      this.motifBank.push(record);
    } else {
      // Reemplazar el motivo más antiguo con menos usos (LRU aproximado)
      let oldestIndex = 0;
      let oldestScore = this.motifBank[0].useCount * 10000 + this.motifBank[0].timestamp;
      for (let i = 1; i < this.motifBank.length; i++) {
        const score = this.motifBank[i].useCount * 10000 + this.motifBank[i].timestamp;
        if (score < oldestScore) {
          oldestScore = score;
          oldestIndex = i;
        }
      }
      this.motifBank[oldestIndex] = record;
    }
  }

  private makeInactiveData(): MotifData {
    this.smoothAmplitude *= 0.92;
    return {
      isMotifActive: false,
      similarity: 0,
      motifIndex: -1,
      motifFrequency: this.smoothFrequency,
      motifPhase: this.motifPhase,
      motifAmplitude: this.smoothAmplitude,
      variation: this.variationSmooth,
    };
  }

  reset(): void {
    this.windowEnergy = [];
    this.windowBass = [];
    this.windowMid = [];
    this.windowTreble = [];
    this.windowPeaks = [];
    this.frameCount = 0;
    this.motifBank = [];
    this.activeMotifIndex = -1;
    this.activeSimilarity = 0;
    this.motifPhase = 0;
    this.smoothAmplitude = 0;
    this.smoothFrequency = 0.04;
    this.matchCooldown = 0;
    this.variationSmooth = 0;
  }

  silence(): MotifData {
    this.smoothAmplitude *= 0.95;
    this.activeSimilarity *= 0.98;
    return {
      isMotifActive: false,
      similarity: 0,
      motifIndex: -1,
      motifFrequency: this.smoothFrequency,
      motifPhase: this.motifPhase,
      motifAmplitude: this.smoothAmplitude,
      variation: this.variationSmooth,
    };
  }
}
