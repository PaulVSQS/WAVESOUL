import type { AudioAnalysisData, ProcessedAudioData } from '../types/audio';

/**
 * DynamicsProcessor — Sistema DSP de compresión y suavizado perceptual.
 *
 * Transforma datos crudos del AudioAnalyzer en señales visualmente estables,
 * emocionalmente expresivas y matemáticamente acotadas.
 *
 * Pipeline interno:
 *   1. Band mixing balanceado (reduce dominancia del bass)
 *   2. Soft compression (comprime picos sin cortarlos)
 *   3. Envelope follower (attack/release asimétricos)
 *   4. Curva perceptual (logarítmica, modela audición humana)
 *   5. Normalización adaptativa (historial de energía)
 *   6. Waveform smoothing + limiting
 *   7. Peak detection con histéresis
 *   8. Breathing phase (modulación orgánica)
 */
export class DynamicsProcessor {
  // ── Envelope followers (suavizado asimétrico por banda) ──
  private envEnergy = 0;
  private envBass = 0;
  private envMid = 0;
  private envTreble = 0;
  private envIntensity = 0;

  // ── Attack/Release en factor por frame (a 60fps) ──
  // Attack lento = movimiento orgánico al subir
  // Release más lento = la línea "respira" al bajar
  private readonly attackEnergy = 0.06;    // ~270ms to reach target
  private readonly releaseEnergy = 0.025;  // ~660ms to decay
  private readonly attackBass = 0.05;      // Bass sube lento (evita kicks explosivos)
  private readonly releaseBass = 0.03;     // Bass baja suave
  private readonly attackMid = 0.08;       // Mid (voz) algo más rápido
  private readonly releaseMid = 0.025;     // Pero baja suave
  private readonly attackTreble = 0.10;    // Treble puede ser algo más reactivo
  private readonly releaseTreble = 0.04;

  // ── Historial de energía para normalización adaptativa ──
  private readonly historySize = 150;      // ~2.5 segundos a 60fps
  private energyHistory: number[] = [];
  private historyMax = 0.3;               // Valor inicial conservador

  // ── Soft compressor params ──
  private readonly threshold = 0.35;       // Punto donde empieza la compresión
  private readonly knee = 0.25;            // Suavidad de la transición
  private readonly ratio = 4;              // Ratio de compresión sobre threshold
  private readonly ceiling = 0.92;         // Máximo absoluto de salida

  // ── Waveform processing ──
  private smoothWaveform: Float32Array;
  private readonly waveformPoints = 200;   // Puntos de la línea visual
  private readonly waveformSmoothing = 0.12; // Suavizado de la forma de onda

  // ── Peak detection con histéresis ──
  private peakCooldown = 0;
  private readonly peakCooldownFrames = 18; // ~300ms entre peaks
  private prevEnergy = 0;
  private prevPrevEnergy = 0;

  // ── Breathing ──
  private breathPhase = 0;

  // ── Segunda capa de suavizado (EMA de la EMA) ──
  private smoothEnergy2 = 0;
  private smoothBass2 = 0;
  private smoothMid2 = 0;
  private smoothTreble2 = 0;
  private readonly secondSmoothFactor = 0.15;

  constructor() {
    this.smoothWaveform = new Float32Array(this.waveformPoints);
  }

  /**
   * Procesa un frame de datos crudos y devuelve datos visualmente seguros.
   */
  process(raw: AudioAnalysisData): ProcessedAudioData {
    // ── 1. BAND MIXING BALANCEADO ──
    // Reduce la dominancia del bass, prioriza mid (voz/melodía)
    const rawMixed = 
      raw.bassEnergy * 0.25 +
      raw.midEnergy * 0.40 +
      raw.trebleEnergy * 0.20 +
      raw.averageAmplitude * 0.15;

    // ── 2. CURVA PERCEPTUAL ──
    // La percepción humana de volumen es logarítmica
    // pow(x, 0.4) modela la relación energía→percepción (similar a ISO 226)
    const perceptualEnergy = this.perceptualCurve(rawMixed);
    const perceptualBass = this.perceptualCurve(raw.bassEnergy);
    const perceptualMid = this.perceptualCurve(raw.midEnergy);
    const perceptualTreble = this.perceptualCurve(raw.trebleEnergy);

    // ── 3. SOFT COMPRESSION ──
    // Los picos se comprimen gradualmente, nunca se cortan abruptamente
    const compressedEnergy = this.softCompress(perceptualEnergy);
    const compressedBass = this.softCompress(perceptualBass);
    const compressedMid = this.softCompress(perceptualMid);
    const compressedTreble = this.softCompress(perceptualTreble);

    // ── 4. NORMALIZACIÓN ADAPTATIVA ──
    // Usa el historial para escalar relativo al nivel medio del track
    this.updateHistory(compressedEnergy);
    const normalized = this.adaptiveNormalize(compressedEnergy);

    // ── 5. ENVELOPE FOLLOWER (asimétrico) ──
    // Attack lento, release más lento → movimiento orgánico
    this.envEnergy = this.envelope(this.envEnergy, normalized, this.attackEnergy, this.releaseEnergy);
    this.envBass = this.envelope(this.envBass, compressedBass, this.attackBass, this.releaseBass);
    this.envMid = this.envelope(this.envMid, compressedMid, this.attackMid, this.releaseMid);
    this.envTreble = this.envelope(this.envTreble, compressedTreble, this.attackTreble, this.releaseTreble);

    // ── 6. SEGUNDA CAPA DE SUAVIZADO (EMA²) ──
    // Elimina el jitter residual sin matar la reactividad
    this.smoothEnergy2 += (this.envEnergy - this.smoothEnergy2) * this.secondSmoothFactor;
    this.smoothBass2 += (this.envBass - this.smoothBass2) * this.secondSmoothFactor;
    this.smoothMid2 += (this.envMid - this.smoothMid2) * this.secondSmoothFactor;
    this.smoothTreble2 += (this.envTreble - this.smoothTreble2) * this.secondSmoothFactor;

    // ── 7. INTENSIDAD VISUAL ──
    // Interpolación muy suave para grosor/glow (no debe saltar)
    const targetIntensity = this.clamp(this.smoothEnergy2 * 1.2);
    this.envIntensity = this.envelope(this.envIntensity, targetIntensity, 0.04, 0.015);

    // ── 8. WAVEFORM PROCESSING ──
    this.processWaveform(raw.timeDomainData, this.smoothEnergy2);

    // ── 9. PEAK DETECTION CON HISTÉRESIS ──
    const isPeak = this.detectPeak(this.smoothEnergy2);

    // ── 10. BREATHING PHASE ──
    // Velocidad de respiración modulada por energía (más rápido con más energía)
    const breathSpeed = 0.006 + this.smoothEnergy2 * 0.012;
    this.breathPhase += breathSpeed;

    return {
      energy: this.clamp(this.smoothEnergy2),
      bass: this.clamp(this.smoothBass2),
      mid: this.clamp(this.smoothMid2),
      treble: this.clamp(this.smoothTreble2),
      waveform: this.smoothWaveform,
      isPeak,
      breathPhase: this.breathPhase,
      intensity: this.clamp(this.envIntensity),
    };
  }

  /**
   * Devuelve datos "silencio" cuando no hay audio disponible.
   */
  silence(): ProcessedAudioData {
    // Seguir respirando incluso sin audio
    this.breathPhase += 0.005;

    // Decay suave hacia cero
    this.envEnergy *= 0.97;
    this.envBass *= 0.97;
    this.envMid *= 0.97;
    this.envTreble *= 0.97;
    this.envIntensity *= 0.97;
    this.smoothEnergy2 *= 0.97;
    this.smoothBass2 *= 0.97;
    this.smoothMid2 *= 0.97;
    this.smoothTreble2 *= 0.97;

    // Suavizar la waveform hacia cero
    for (let i = 0; i < this.waveformPoints; i++) {
      this.smoothWaveform[i] *= 0.95;
    }

    return {
      energy: this.clamp(this.smoothEnergy2),
      bass: this.clamp(this.smoothBass2),
      mid: this.clamp(this.smoothMid2),
      treble: this.clamp(this.smoothTreble2),
      waveform: this.smoothWaveform,
      isPeak: false,
      breathPhase: this.breathPhase,
      intensity: this.clamp(this.envIntensity),
    };
  }

  // ══════════════════════════════════════════════════════
  // FUNCIONES DSP INTERNAS
  // ══════════════════════════════════════════════════════

  /**
   * Curva perceptual — modela la relación no-lineal entre
   * energía física y percepción humana de volumen.
   * pow(x, 0.4) es similar a la curva de loudness ISO 226.
   */
  private perceptualCurve(x: number): number {
    if (x <= 0) return 0;
    return Math.pow(x, 0.4);
  }

  /**
   * Compresor suave con knee gradual.
   * Modela un compresor analógico: debajo del threshold pasa limpio,
   * encima se comprime gradualmente con soft-knee.
   */
  private softCompress(input: number): number {
    if (input <= 0) return 0;

    let output: number;

    if (input < this.threshold) {
      // Debajo del threshold: pasa sin cambios
      output = input;
    } else {
      // Encima del threshold: compresión soft-knee
      const excess = input - this.threshold;
      const compressed = excess / (1 + (excess / this.knee) * (this.ratio - 1));
      output = this.threshold + compressed;
    }

    // Ceiling absoluto con saturación suave (tanh-like)
    if (output > this.ceiling * 0.8) {
      // Zona de saturación suave antes del ceiling
      const overshoot = (output - this.ceiling * 0.8) / (this.ceiling * 0.2);
      output = this.ceiling * 0.8 + this.ceiling * 0.2 * (overshoot / (1 + overshoot));
    }

    return Math.min(output, this.ceiling);
  }

  /**
   * Envelope follower asimétrico.
   * Attack y release son factores de lerp independientes.
   * Attack < release = sube más rápido que baja = movimiento orgánico.
   */
  private envelope(current: number, target: number, attack: number, release: number): number {
    const factor = target > current ? attack : release;
    return current + (target - current) * factor;
  }

  /**
   * Actualiza el historial de energía para normalización adaptativa.
   */
  private updateHistory(energy: number): void {
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // Calcular el máximo del historial con decay
    // No usar el máximo absoluto (un pico aislado no debería dominar)
    // Usar percentil ~90 para robustez
    if (this.energyHistory.length > 10) {
      const sorted = [...this.energyHistory].sort((a, b) => a - b);
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      // Lerp suave hacia el nuevo máximo (no saltar)
      this.historyMax += (Math.max(p90, 0.15) - this.historyMax) * 0.02;
    }
  }

  /**
   * Normalización adaptativa basada en el historial.
   * Escala la energía relativa al nivel "normal" del track actual.
   */
  private adaptiveNormalize(energy: number): number {
    // Escalar para que el percentil 90 del historial mapee a ~0.7
    const scale = 0.7 / Math.max(this.historyMax, 0.1);
    return Math.min(energy * scale, 1.0);
  }

  /**
   * Procesa la forma de onda para el renderer.
   * Aplica: downsampling, smoothing, y soft-limiting.
   */
  private processWaveform(timeDomain: Float32Array, energy: number): void {
    const inputLen = timeDomain.length;

    for (let i = 0; i < this.waveformPoints; i++) {
      const t = i / (this.waveformPoints - 1);

      // Muestrear la waveform con interpolación
      const floatIndex = t * (inputLen - 1);
      const idx = Math.floor(floatIndex);
      const frac = floatIndex - idx;
      const nextIdx = Math.min(idx + 1, inputLen - 1);
      const sample = timeDomain[idx] * (1 - frac) + timeDomain[nextIdx] * frac;

      // Aplicar la escala basada en la energía procesada (NO cruda)
      // La energía ya está comprimida, así que el factor es controlado
      const scale = 0.3 + energy * 1.8; // Rango: 0.3 (silencio) a 2.1 (máximo)
      let processed = sample * scale;

      // Soft-clip la waveform: evitar que los picos salgan del rango visual
      processed = this.softClipWaveform(processed);

      // Suavizado temporal: la waveform no salta frame-a-frame
      const smoothFactor = this.waveformSmoothing + energy * 0.08;
      this.smoothWaveform[i] += (processed - this.smoothWaveform[i]) * smoothFactor;
    }
  }

  /**
   * Soft-clip para valores de waveform.
   * Usa tanh para compresión suave simétrica.
   * Rango de salida: aproximadamente -0.8 a 0.8
   */
  private softClipWaveform(x: number): number {
    // tanh proporciona compresión suave natural
    // Escalar para que la zona lineal sea ±0.4 y sature hacia ±0.8
    return Math.tanh(x * 1.2) * 0.8;
  }

  /**
   * Detección de peaks con histéresis y cooldown.
   * Evita falsos positivos y detecciones repetidas.
   */
  private detectPeak(energy: number): boolean {
    // Decrementar cooldown
    if (this.peakCooldown > 0) {
      this.peakCooldown--;
      this.prevPrevEnergy = this.prevEnergy;
      this.prevEnergy = energy;
      return false;
    }

    // Detectar: la energía actual supera a los dos frames anteriores
    // Y la diferencia es significativa respecto al nivel base
    const delta = energy - this.prevEnergy;
    const accel = delta - (this.prevEnergy - this.prevPrevEnergy);
    const isRising = delta > 0.02 && accel > 0.005;
    const isSignificant = energy > 0.25 && delta > this.historyMax * 0.15;

    this.prevPrevEnergy = this.prevEnergy;
    this.prevEnergy = energy;

    if (isRising && isSignificant) {
      this.peakCooldown = this.peakCooldownFrames;
      return true;
    }

    return false;
  }

  /**
   * Clamp estricto a [0, 1].
   */
  private clamp(x: number): number {
    return Math.max(0, Math.min(1, x));
  }
}
