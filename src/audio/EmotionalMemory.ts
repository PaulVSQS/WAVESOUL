import type { EmotionalState, EnergyLevel } from '../types/audio';

/**
 * EmotionalMemory — Motor de memoria emocional persistente.
 *
 * Esto NO es smoothing. Es acumulación con histéresis.
 * La línea recuerda cómo se sentía hace segundos.
 *
 * Subsistemas:
 *   1. Tensor de tensión — acumula energía, se libera con decay lento
 *   2. Valencia emocional — dirección emocional con inercia
 *   3. Momentum — derivada suavizada de la energía
 *   4. Histéresis de estado — resistencia al cambio de estado
 *   5. Buffer circular — ventana de 10 segundos para análisis de tendencia
 */
export class EmotionalMemory {
  // ── Tensión acumulada ──
  // Se acumula con energía alta, decay de ~3-5 segundos
  private tension = 0;
  private readonly tensionAccumRate = 0.08;   // Velocidad de acumulación
  private readonly tensionDecayRate = 0.006;  // Decay muy lento (~170 frames = ~2.8s)
  private readonly tensionThreshold = 0.25;   // Energía mínima para acumular

  // ── Valencia emocional ──
  // -1 (decayendo) a +1 (creciendo), con inercia
  private valence = 0;
  private readonly valenceInertia = 0.03;  // Muy lento de cambiar

  // ── Momentum ──
  // Derivada suavizada de la energía
  private momentum = 0;
  private prevEnergy = 0;
  private readonly momentumSmoothing = 0.08;

  // ── Decay phase ──
  // Cuánto tiempo llevamos cayendo después de un pico
  private decayPhase = 0;
  private peakEnergyRecent = 0;

  // ── Histéresis de estado ──
  // El estado actual tiene "peso" — no cambia fácilmente
  private currentState: EnergyLevel = 'silence';
  private stateConfidence = 0;
  private stateFrames = 0;  // Cuántos frames llevamos en el estado actual
  private readonly minFramesForChange = 12;  // ~200ms mínimo en un estado
  private readonly confidenceGrowth = 0.04;
  private readonly confidenceDecay = 0.02;

  // ── Emoción acumulada a largo plazo ──
  private accumulatedEmotion = 0;
  private readonly emotionAccumRate = 0.002;
  private readonly emotionDecayRate = 0.0003;

  // ── Buffer circular (10 segundos @ 60fps = 600 frames) ──
  private readonly bufferSize = 600;
  private energyBuffer: Float32Array;
  private bassBuffer: Float32Array;
  private midBuffer: Float32Array;
  private trebleBuffer: Float32Array;
  private bufferIndex = 0;
  private bufferFilled = 0;

  constructor() {
    this.energyBuffer = new Float32Array(this.bufferSize);
    this.bassBuffer = new Float32Array(this.bufferSize);
    this.midBuffer = new Float32Array(this.bufferSize);
    this.trebleBuffer = new Float32Array(this.bufferSize);
  }

  /**
   * Actualiza el estado emocional con los datos del frame actual.
   * Llamar cada frame con datos ya procesados por el DynamicsProcessor base.
   */
  update(
    energy: number,
    bass: number,
    mid: number,
    treble: number,
    isPeak: boolean,
    candidateState: EnergyLevel,
  ): EmotionalState {
    // ── 1. BUFFER CIRCULAR ──
    this.energyBuffer[this.bufferIndex] = energy;
    this.bassBuffer[this.bufferIndex] = bass;
    this.midBuffer[this.bufferIndex] = mid;
    this.trebleBuffer[this.bufferIndex] = treble;
    this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize;
    if (this.bufferFilled < this.bufferSize) this.bufferFilled++;

    // ── 2. TENSIÓN ──
    if (energy > this.tensionThreshold) {
      // Acumular tensión proporcional a la energía sobre el umbral
      const excess = energy - this.tensionThreshold;
      this.tension += excess * this.tensionAccumRate;
    }
    // Decay siempre activo, más lento si hay energía presente
    const decayFactor = energy > 0.15 ? this.tensionDecayRate * 0.5 : this.tensionDecayRate;
    this.tension = Math.max(0, this.tension - decayFactor);
    this.tension = Math.min(1, this.tension);

    // Peaks acumulan tensión extra
    if (isPeak) {
      this.tension = Math.min(1, this.tension + 0.06);
      this.peakEnergyRecent = energy;
    }

    // ── 3. VALENCIA ──
    const energyDelta = energy - this.prevEnergy;
    const targetValence = this.clamp(energyDelta * 8, -1, 1); // Amplificar la dirección
    this.valence += (targetValence - this.valence) * this.valenceInertia;

    // ── 4. MOMENTUM ──
    const rawMomentum = energy - this.prevEnergy;
    this.momentum += (rawMomentum * 5 - this.momentum) * this.momentumSmoothing;
    this.momentum = this.clamp(this.momentum, -1, 1);

    // ── 5. DECAY PHASE ──
    if (energy < this.peakEnergyRecent * 0.6 && this.peakEnergyRecent > 0.3) {
      // Estamos en fase de decay después de un pico significativo
      this.decayPhase = Math.min(1, this.decayPhase + 0.008);
    } else {
      this.decayPhase = Math.max(0, this.decayPhase - 0.015);
      if (energy > this.peakEnergyRecent) {
        this.peakEnergyRecent = energy;
      }
    }

    // ── 6. HISTÉRESIS DE ESTADO ──
    if (candidateState === this.currentState) {
      // Mismo estado → crecer confianza
      this.stateFrames++;
      this.stateConfidence = Math.min(1, this.stateConfidence + this.confidenceGrowth);
    } else {
      // Estado diferente → erosionar confianza
      this.stateConfidence = Math.max(0, this.stateConfidence - this.confidenceDecay);

      // Solo cambiar si la confianza cayó lo suficiente Y llevamos suficientes frames en el estado anterior
      if (this.stateConfidence < 0.15 && this.stateFrames >= this.minFramesForChange) {
        this.currentState = candidateState;
        this.stateConfidence = 0.3; // Confianza inicial del nuevo estado
        this.stateFrames = 1;
      }
    }

    // ── 7. EMOCIÓN ACUMULADA ──
    if (energy > 0.2) {
      this.accumulatedEmotion = Math.min(1,
        this.accumulatedEmotion + energy * this.emotionAccumRate
      );
    } else {
      this.accumulatedEmotion = Math.max(0,
        this.accumulatedEmotion - this.emotionDecayRate
      );
    }

    // ── Actualizar prevEnergy ──
    this.prevEnergy = energy;

    return {
      tension: this.tension,
      valence: this.valence,
      momentum: this.momentum,
      decayPhase: this.decayPhase,
      currentState: this.currentState,
      stateConfidence: this.stateConfidence,
      accumulatedEmotion: this.accumulatedEmotion,
    };
  }

  /**
   * Devuelve los últimos N valores de energía del buffer circular.
   * Útil para el IntentionEngine.
   */
  getRecentEnergy(frames: number): Float32Array {
    const count = Math.min(frames, this.bufferFilled);
    const result = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const idx = (this.bufferIndex - count + i + this.bufferSize) % this.bufferSize;
      result[i] = this.energyBuffer[idx];
    }
    return result;
  }

  /**
   * Devuelve los últimos N valores de mid del buffer circular.
   */
  getRecentMid(frames: number): Float32Array {
    const count = Math.min(frames, this.bufferFilled);
    const result = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const idx = (this.bufferIndex - count + i + this.bufferSize) % this.bufferSize;
      result[i] = this.midBuffer[idx];
    }
    return result;
  }

  /**
   * Devuelve el estado de silencio emocional (cuando no hay audio).
   */
  silence(): EmotionalState {
    // Decay suave de todo
    this.tension *= 0.97;
    this.valence *= 0.95;
    this.momentum *= 0.95;
    this.decayPhase = Math.max(0, this.decayPhase - 0.005);
    this.accumulatedEmotion *= 0.999;

    if (this.currentState !== 'silence' && this.stateConfidence < 0.1) {
      this.currentState = 'silence';
      this.stateConfidence = 0.5;
    } else {
      this.stateConfidence = Math.max(0, this.stateConfidence - 0.01);
    }

    return {
      tension: this.tension,
      valence: this.valence,
      momentum: this.momentum,
      decayPhase: this.decayPhase,
      currentState: this.currentState,
      stateConfidence: this.stateConfidence,
      accumulatedEmotion: this.accumulatedEmotion,
    };
  }

  /**
   * Reset completo — al cargar nueva canción.
   */
  reset(): void {
    this.tension = 0;
    this.valence = 0;
    this.momentum = 0;
    this.decayPhase = 0;
    this.prevEnergy = 0;
    this.peakEnergyRecent = 0;
    this.currentState = 'silence';
    this.stateConfidence = 0;
    this.stateFrames = 0;
    this.accumulatedEmotion = 0;
    this.bufferIndex = 0;
    this.bufferFilled = 0;
    this.energyBuffer.fill(0);
    this.bassBuffer.fill(0);
    this.midBuffer.fill(0);
    this.trebleBuffer.fill(0);
  }

  private clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
  }
}
