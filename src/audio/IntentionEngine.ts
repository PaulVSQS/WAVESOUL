import type { IntentionData } from '../types/audio';
import type { EmotionalMemory } from './EmotionalMemory';

/**
 * IntentionEngine — La línea no sigue la música, dialoga con ella.
 *
 * Analiza tendencias, detecta frases vocales, identifica silencios
 * intencionales, y genera micro-anticipación controlada.
 *
 * Subsistemas:
 *   1. Detector de tendencia — regresión lineal sobre ventana de frames
 *   2. Micro-anticipación — empuje sutil cuando se detecta subida sostenida
 *   3. Detector de frases vocales — mid sostenido con variación baja
 *   4. Detector de silencio intencional — caída abrupta después de intensidad
 */
export class IntentionEngine {
  // ── Trend detection ──
  private readonly trendWindow = 45;  // ~750ms de ventana para tendencia
  private smoothTrend = 0;
  private readonly trendSmoothing = 0.06;

  // ── Anticipation ──
  private anticipation = 0;
  private readonly anticipationAttack = 0.04;
  private readonly anticipationDecay = 0.02;
  private sustainedRiseFrames = 0;
  private readonly minRiseFramesForAnticipation = 12; // ~200ms de subida para activar

  // ── Vocal phrase detection ──
  private vocalPhrase = false;
  private vocalPhraseDuration = 0;
  private readonly vocalMidThreshold = 0.18;    // Mid mínimo para considerar voz
  private readonly vocalVarianceMax = 0.008;     // Variación máxima para considerar sostenida
  private readonly minVocalFrames = 20;          // ~330ms para ser frase vocal
  private midHistory: number[] = [];
  private readonly midHistorySize = 30;          // ~500ms de historia para varianza

  // ── Intentional silence ──
  private intentionalSilence = false;
  private waitFactor = 0;
  private presilenceEnergy = 0;
  private silenceFrames = 0;
  private readonly silenceThreshold = 0.08;       // Energía bajo la cual es "silencio"
  private readonly presilenceMinEnergy = 0.35;    // Energía mínima antes del silencio para ser "intencional"
  private readonly maxWaitFrames = 120;           // ~2s de espera máxima
  private readonly waitDecay = 0.008;

  // ── Reference to EmotionalMemory for buffer access ──
  private memoryRef: EmotionalMemory | null = null;

  /**
   * Conectar con EmotionalMemory para acceso al buffer circular.
   */
  setMemory(memory: EmotionalMemory): void {
    this.memoryRef = memory;
  }

  /**
   * Actualiza la intención basada en los datos del frame actual.
   */
  update(energy: number, mid: number): IntentionData {
    // ── 1. TREND DETECTION ──
    const trend = this.detectTrend();
    this.smoothTrend += (trend - this.smoothTrend) * this.trendSmoothing;

    // ── 2. ANTICIPATION ──
    this.updateAnticipation(this.smoothTrend);

    // ── 3. VOCAL PHRASE ──
    this.updateVocalPhrase(mid);

    // ── 4. INTENTIONAL SILENCE ──
    this.updateIntentionalSilence(energy);

    return {
      trend: this.clamp(this.smoothTrend, -1, 1),
      anticipation: this.clamp(this.anticipation, 0, 1),
      vocalPhrase: this.vocalPhrase,
      vocalPhraseDuration: this.vocalPhraseDuration,
      intentionalSilence: this.intentionalSilence,
      waitFactor: this.clamp(this.waitFactor, 0, 1),
    };
  }

  /**
   * Detecta la tendencia usando regresión lineal simple
   * sobre los últimos N frames del buffer circular.
   */
  private detectTrend(): number {
    if (!this.memoryRef) return 0;

    const recentEnergy = this.memoryRef.getRecentEnergy(this.trendWindow);
    const n = recentEnergy.length;
    if (n < 10) return 0; // No suficientes datos

    // Regresión lineal simple: y = a + b*x
    // b (pendiente) indica tendencia
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentEnergy[i];
      sumXY += i * recentEnergy[i];
      sumXX += i * i;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (Math.abs(denominator) < 0.0001) return 0;

    const slope = (n * sumXY - sumX * sumY) / denominator;

    // Normalizar la pendiente a un rango sensible
    // Multiplicar por n para hacer la escala independiente del tamaño de ventana
    return this.clamp(slope * n * 3, -1, 1);
  }

  /**
   * Actualiza la anticipación basada en la tendencia.
   * Solo se activa con subida sostenida — nunca forzada.
   */
  private updateAnticipation(trend: number): void {
    if (trend > 0.15) {
      // Tendencia ascendente
      this.sustainedRiseFrames++;

      if (this.sustainedRiseFrames > this.minRiseFramesForAnticipation) {
        // Subida sostenida → generar anticipación proporcional
        const targetAnticipation = Math.min(1,
          (this.sustainedRiseFrames - this.minRiseFramesForAnticipation) * 0.02 * trend
        );
        this.anticipation += (targetAnticipation - this.anticipation) * this.anticipationAttack;
      }
    } else {
      // No hay subida → decay de anticipación
      this.sustainedRiseFrames = Math.max(0, this.sustainedRiseFrames - 2);
      this.anticipation = Math.max(0, this.anticipation - this.anticipationDecay);
    }
  }

  /**
   * Detecta frases vocales: mid sostenido con baja variación.
   * Una frase vocal es un período donde la voz mantiene una nota
   * o melodía sin cambios bruscos.
   */
  private updateVocalPhrase(mid: number): void {
    // Mantener historial de mid
    this.midHistory.push(mid);
    if (this.midHistory.length > this.midHistorySize) {
      this.midHistory.shift();
    }

    if (this.midHistory.length < this.midHistorySize) {
      return; // No suficiente historial
    }

    // Calcular si mid está sostenido
    const avgMid = this.midHistory.reduce((a, b) => a + b, 0) / this.midHistory.length;

    if (avgMid < this.vocalMidThreshold) {
      // Mid muy bajo → no hay voz
      if (this.vocalPhrase) {
        this.vocalPhraseDuration = 0;
        this.vocalPhrase = false;
      }
      return;
    }

    // Calcular varianza del mid
    let varianceSum = 0;
    for (const m of this.midHistory) {
      const diff = m - avgMid;
      varianceSum += diff * diff;
    }
    const variance = varianceSum / this.midHistory.length;

    // Frase vocal = mid presente + baja variación
    if (variance < this.vocalVarianceMax && avgMid > this.vocalMidThreshold) {
      this.vocalPhraseDuration++;
      if (this.vocalPhraseDuration > this.minVocalFrames) {
        this.vocalPhrase = true;
      }
    } else {
      this.vocalPhraseDuration = Math.max(0, this.vocalPhraseDuration - 3);
      if (this.vocalPhraseDuration < this.minVocalFrames * 0.5) {
        this.vocalPhrase = false;
      }
    }
  }

  /**
   * Detecta silencios intencionales: caída abrupta después de intensidad.
   * La línea no colapsa — espera, respira.
   */
  private updateIntentionalSilence(energy: number): void {
    if (energy > this.presilenceMinEnergy) {
      // Almacenar la energía pre-silencio
      this.presilenceEnergy = energy;
      this.silenceFrames = 0;
      this.intentionalSilence = false;
      this.waitFactor = Math.max(0, this.waitFactor - 0.03);
      return;
    }

    if (energy < this.silenceThreshold && this.presilenceEnergy > this.presilenceMinEnergy) {
      // Caída abrupta desde energía alta → silencio intencional
      this.silenceFrames++;

      if (this.silenceFrames > 5 && this.silenceFrames < this.maxWaitFrames) {
        this.intentionalSilence = true;
        // waitFactor sube rápido al inicio y luego decae
        const progress = this.silenceFrames / this.maxWaitFrames;
        this.waitFactor = Math.sin(progress * Math.PI) * 0.8; // Curva de campana
      } else if (this.silenceFrames >= this.maxWaitFrames) {
        // Demasiado tiempo → ya no es intencional, es silencio real
        this.intentionalSilence = false;
        this.waitFactor = Math.max(0, this.waitFactor - this.waitDecay);
        this.presilenceEnergy *= 0.95; // Decay gradual de la referencia
      }
    } else {
      // Energía entre umbral y presilence → decay normal
      this.silenceFrames = 0;
      this.intentionalSilence = false;
      this.waitFactor = Math.max(0, this.waitFactor - this.waitDecay * 2);
      this.presilenceEnergy *= 0.98;
    }
  }

  /**
   * Devuelve datos de intención en silencio.
   */
  silence(): IntentionData {
    this.smoothTrend *= 0.95;
    this.anticipation *= 0.95;
    this.vocalPhrase = false;
    this.vocalPhraseDuration = 0;
    this.intentionalSilence = false;
    this.waitFactor = Math.max(0, this.waitFactor - 0.01);

    return {
      trend: this.smoothTrend,
      anticipation: this.anticipation,
      vocalPhrase: false,
      vocalPhraseDuration: 0,
      intentionalSilence: false,
      waitFactor: this.waitFactor,
    };
  }

  /**
   * Reset completo — al cargar nueva canción.
   */
  reset(): void {
    this.smoothTrend = 0;
    this.anticipation = 0;
    this.sustainedRiseFrames = 0;
    this.vocalPhrase = false;
    this.vocalPhraseDuration = 0;
    this.midHistory = [];
    this.intentionalSilence = false;
    this.waitFactor = 0;
    this.presilenceEnergy = 0;
    this.silenceFrames = 0;
  }

  private clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
  }
}
