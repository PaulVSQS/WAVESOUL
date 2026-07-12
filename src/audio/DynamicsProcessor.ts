import type { AudioAnalysisData, ProcessedAudioData, SongProfile } from '../types/audio';
import { EmotionalMemory } from './EmotionalMemory';
import { SongProfiler } from './SongProfiler';
import { IntentionEngine } from './IntentionEngine';

/**
 * DynamicsProcessor — Sistema DSP de compresión, suavizado perceptual,
 * y orquestador del motor emocional consciente.
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
 *   9. → EmotionalMemory (tensión, valencia, momentum)
 *  10. → SongProfiler (perfil único por canción)
 *  11. → IntentionEngine (anticipación, diálogo)
 */
export class DynamicsProcessor {
  // ── Envelope followers (suavizado asimétrico por banda) ──
  private envEnergy = 0;
  private envBass = 0;
  private envMid = 0;
  private envTreble = 0;
  private envIntensity = 0;

  // ── Attack/Release BASE en factor por frame (a 60fps) ──
  // Estos se modulan dinámicamente por el SongProfile
  private readonly baseAttackEnergy = 0.12;
  private readonly baseReleaseEnergy = 0.035;
  private readonly baseAttackBass = 0.10;
  private readonly baseReleaseBass = 0.03;
  private readonly baseAttackMid = 0.12;
  private readonly baseReleaseMid = 0.03;
  private readonly baseAttackTreble = 0.14;
  private readonly baseReleaseTreble = 0.045;

  // ── Historial de energía para normalización adaptativa ──
  private readonly historySize = 150;
  private energyHistory: number[] = [];
  private historyMax = 0.3;

  // ── Soft compressor params ──
  private readonly threshold = 0.35;
  private readonly knee = 0.25;
  private readonly ratio = 4;
  private readonly ceiling = 0.92;

  // ── Waveform processing ──
  private smoothWaveform: Float32Array;
  private readonly waveformPoints = 200;
  private readonly waveformSmoothing = 0.15;

  // ── Peak detection con histéresis ──
  private peakCooldown = 0;
  private readonly peakCooldownFrames = 14;
  private prevEnergy = 0;
  private prevPrevEnergy = 0;

  // ── Breathing ──
  private breathPhase = 0;

  // ── Segunda capa de suavizado (EMA de la EMA) ──
  private smoothEnergy2 = 0;
  private smoothBass2 = 0;
  private smoothMid2 = 0;
  private smoothTreble2 = 0;
  private readonly secondSmoothFactor = 0.22;

  // ══════════════════════════════════════════════════════
  // MÓDULOS EMOCIONALES
  // ══════════════════════════════════════════════════════
  private emotionalMemory: EmotionalMemory;
  private songProfiler: SongProfiler;
  private intentionEngine: IntentionEngine;

  constructor() {
    this.smoothWaveform = new Float32Array(this.waveformPoints);
    this.emotionalMemory = new EmotionalMemory();
    this.songProfiler = new SongProfiler();
    this.intentionEngine = new IntentionEngine();
    this.intentionEngine.setMemory(this.emotionalMemory);
  }

  /**
   * Procesa un frame de datos crudos y devuelve datos visualmente seguros
   * enriquecidos con consciencia emocional.
   */
  process(raw: AudioAnalysisData): ProcessedAudioData {
    // ── 1. BAND MIXING BALANCEADO ──
    const rawMixed =
      raw.bassEnergy * 0.25 +
      raw.midEnergy * 0.40 +
      raw.trebleEnergy * 0.20 +
      raw.averageAmplitude * 0.15;

    // ── 2. CURVA PERCEPTUAL ──
    const perceptualEnergy = this.perceptualCurve(rawMixed);
    const perceptualBass = this.perceptualCurve(raw.bassEnergy);
    const perceptualMid = this.perceptualCurve(raw.midEnergy);
    const perceptualTreble = this.perceptualCurve(raw.trebleEnergy);

    // ── 3. SOFT COMPRESSION ──
    const compressedEnergy = this.softCompress(perceptualEnergy);
    const compressedBass = this.softCompress(perceptualBass);
    const compressedMid = this.softCompress(perceptualMid);
    const compressedTreble = this.softCompress(perceptualTreble);

    // ── 4. NORMALIZACIÓN ADAPTATIVA ──
    this.updateHistory(compressedEnergy);
    const normalized = this.adaptiveNormalize(compressedEnergy);

    // ── 5. SONG PROFILE (modula attack/release dinámicamente) ──
    const songProfile = this.songProfiler.update(
      normalized, compressedBass, compressedMid, compressedTreble
    );

    // Modular velocidades de envelope por el perfil de la canción
    const speedMod = songProfile.reactionSpeed;
    const elastMod = songProfile.elasticity;

    // ── 6. ENVELOPE FOLLOWER (asimétrico, modulado por perfil) ──
    const attackEnergy = this.baseAttackEnergy * speedMod;
    const releaseEnergy = this.baseReleaseEnergy * (2 - elastMod); // Menos elástico = release más lento
    this.envEnergy = this.envelope(this.envEnergy, normalized, attackEnergy, releaseEnergy);

    const attackBass = this.baseAttackBass * speedMod;
    const releaseBass = this.baseReleaseBass * (2 - elastMod);
    this.envBass = this.envelope(this.envBass, compressedBass, attackBass, releaseBass);

    const attackMid = this.baseAttackMid * speedMod;
    const releaseMid = this.baseReleaseMid * (2 - elastMod);
    this.envMid = this.envelope(this.envMid, compressedMid, attackMid, releaseMid);

    const attackTreble = this.baseAttackTreble * speedMod;
    const releaseTreble = this.baseReleaseTreble * (2 - elastMod);
    this.envTreble = this.envelope(this.envTreble, compressedTreble, attackTreble, releaseTreble);

    // ── 7. SEGUNDA CAPA DE SUAVIZADO (EMA²) ──
    const smoothFactor = this.secondSmoothFactor * (0.8 + elastMod * 0.4);
    this.smoothEnergy2 += (this.envEnergy - this.smoothEnergy2) * smoothFactor;
    this.smoothBass2 += (this.envBass - this.smoothBass2) * smoothFactor;
    this.smoothMid2 += (this.envMid - this.smoothMid2) * smoothFactor;
    this.smoothTreble2 += (this.envTreble - this.smoothTreble2) * smoothFactor;

    // ── 8. INTENSIDAD VISUAL ──
    const targetIntensity = this.clamp(this.smoothEnergy2 * 1.5);
    this.envIntensity = this.envelope(this.envIntensity, targetIntensity, 0.04, 0.015);

    // ── 9. WAVEFORM PROCESSING ──
    this.processWaveform(raw.timeDomainData, this.smoothEnergy2, songProfile);

    // ── 10. PEAK DETECTION CON HISTÉRESIS ──
    const isPeak = this.detectPeak(this.smoothEnergy2);

    // ── 11. BREATHING PHASE (modulada por perfil) ──
    const breathSpeed = (0.006 + this.smoothEnergy2 * 0.012) * songProfile.breathRate;
    this.breathPhase += breathSpeed;

    // ══════════════════════════════════════════════════════
    // MÓDULOS EMOCIONALES
    // ══════════════════════════════════════════════════════

    // ── 12. COLOR ENGINE: obtener estado candidato para histéresis ──
    const candidateState = this.getCandidateEnergyLevel(
      this.smoothEnergy2, this.smoothBass2, this.smoothMid2, this.smoothTreble2, isPeak
    );

    // ── 13. EMOTIONAL MEMORY ──
    const emotionalState = this.emotionalMemory.update(
      this.smoothEnergy2, this.smoothBass2, this.smoothMid2, this.smoothTreble2,
      isPeak, candidateState
    );

    // ── 14. INTENTION ENGINE ──
    const intention = this.intentionEngine.update(this.smoothEnergy2, this.smoothMid2);

    return {
      energy: this.clamp(this.smoothEnergy2),
      bass: this.clamp(this.smoothBass2),
      mid: this.clamp(this.smoothMid2),
      treble: this.clamp(this.smoothTreble2),
      waveform: this.smoothWaveform,
      isPeak,
      breathPhase: this.breathPhase,
      intensity: this.clamp(this.envIntensity),
      emotionalState,
      songProfile,
      intention,
    };
  }

  /**
   * Devuelve datos "silencio" cuando no hay audio disponible.
   */
  silence(): ProcessedAudioData {
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

    for (let i = 0; i < this.waveformPoints; i++) {
      this.smoothWaveform[i] *= 0.95;
    }

    const emotionalState = this.emotionalMemory.silence();
    const songProfile = this.songProfiler.silence();
    const intention = this.intentionEngine.silence();

    return {
      energy: this.clamp(this.smoothEnergy2),
      bass: this.clamp(this.smoothBass2),
      mid: this.clamp(this.smoothMid2),
      treble: this.clamp(this.smoothTreble2),
      waveform: this.smoothWaveform,
      isPeak: false,
      breathPhase: this.breathPhase,
      intensity: this.clamp(this.envIntensity),
      emotionalState,
      songProfile,
      intention,
    };
  }

  /**
   * Reset completo de todos los módulos — al cargar nueva canción.
   */
  resetForNewSong(): void {
    this.emotionalMemory.reset();
    this.songProfiler.reset();
    this.intentionEngine.reset();

    // Reset del estado DSP base también
    this.envEnergy = 0;
    this.envBass = 0;
    this.envMid = 0;
    this.envTreble = 0;
    this.envIntensity = 0;
    this.smoothEnergy2 = 0;
    this.smoothBass2 = 0;
    this.smoothMid2 = 0;
    this.smoothTreble2 = 0;
    this.prevEnergy = 0;
    this.prevPrevEnergy = 0;
    this.peakCooldown = 0;
    this.energyHistory = [];
    this.historyMax = 0.3;
    this.smoothWaveform.fill(0);
  }

  // ══════════════════════════════════════════════════════
  // FUNCIONES DSP INTERNAS
  // ══════════════════════════════════════════════════════

  /**
   * Determina el estado emocional candidato (sin histéresis).
   * La histéresis la aplica EmotionalMemory.
   */
  private getCandidateEnergyLevel(
    energy: number, bass: number, mid: number, treble: number, isPeak: boolean
  ): 'silence' | 'calm' | 'groove' | 'elevation' | 'vocal' | 'intensity' | 'climax' {
    if (energy < 0.03) return 'silence';
    if (energy < 0.10) return 'calm';

    const total = bass + mid + treble + 0.001;
    const bassDom = bass / total;
    const midDom = mid / total;

    if (isPeak && energy > 0.55) return 'climax';
    if (energy > 0.70) return 'climax';
    if (bassDom > 0.45 && energy > 0.35) return 'intensity';
    if (midDom > 0.40 && mid > 0.25) return 'vocal';
    if (energy > 0.30 && mid > 0.20) return 'elevation';
    if (energy > 0.12 && bass > 0.10) return 'groove';

    return 'calm';
  }

  /**
   * Curva perceptual — modela la relación no-lineal entre
   * energía física y percepción humana de volumen.
   */
  private perceptualCurve(x: number): number {
    if (x <= 0) return 0;
    return Math.pow(x, 0.4);
  }

  /**
   * Compresor suave con knee gradual.
   */
  private softCompress(input: number): number {
    if (input <= 0) return 0;

    let output: number;

    if (input < this.threshold) {
      output = input;
    } else {
      const excess = input - this.threshold;
      const compressed = excess / (1 + (excess / this.knee) * (this.ratio - 1));
      output = this.threshold + compressed;
    }

    if (output > this.ceiling * 0.8) {
      const overshoot = (output - this.ceiling * 0.8) / (this.ceiling * 0.2);
      output = this.ceiling * 0.8 + this.ceiling * 0.2 * (overshoot / (1 + overshoot));
    }

    return Math.min(output, this.ceiling);
  }

  /**
   * Envelope follower asimétrico.
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

    if (this.energyHistory.length > 10) {
      const sorted = [...this.energyHistory].sort((a, b) => a - b);
      const p85 = sorted[Math.floor(sorted.length * 0.85)];
      this.historyMax += (Math.max(p85, 0.15) - this.historyMax) * 0.03;
    }
  }

  /**
   * Normalización adaptativa basada en el historial.
   */
  private adaptiveNormalize(energy: number): number {
    const scale = 0.7 / Math.max(this.historyMax, 0.1);
    return Math.min(energy * scale, 1.0);
  }

  /**
   * Procesa la forma de onda para el renderer.
   * Ahora modulada por el SongProfile para adaptar la escala.
   */
  private processWaveform(timeDomain: Float32Array, energy: number, profile: SongProfile): void {
    const inputLen = timeDomain.length;

    for (let i = 0; i < this.waveformPoints; i++) {
      const t = i / (this.waveformPoints - 1);

      const floatIndex = t * (inputLen - 1);
      const idx = Math.floor(floatIndex);
      const frac = floatIndex - idx;
      const nextIdx = Math.min(idx + 1, inputLen - 1);
      const sample = timeDomain[idx] * (1 - frac) + timeDomain[nextIdx] * frac;

      // Escala adaptada al perfil de la canción
      const profileScale = 0.8 + profile.baseAmplitude * 0.4;
      const scale = (0.4 + energy * 2.8) * profileScale;
      let processed = sample * scale;

      processed = this.softClipWaveform(processed);

      const smoothFactor = this.waveformSmoothing + energy * 0.10;
      this.smoothWaveform[i] += (processed - this.smoothWaveform[i]) * smoothFactor;
    }
  }

  /**
   * Soft-clip para valores de waveform.
   */
  private softClipWaveform(x: number): number {
    return Math.tanh(x * 1.0) * 0.9;
  }

  /**
   * Detección de peaks con histéresis y cooldown.
   */
  private detectPeak(energy: number): boolean {
    if (this.peakCooldown > 0) {
      this.peakCooldown--;
      this.prevPrevEnergy = this.prevEnergy;
      this.prevEnergy = energy;
      return false;
    }

    const delta = energy - this.prevEnergy;
    const accel = delta - (this.prevEnergy - this.prevPrevEnergy);
    const isRising = delta > 0.015 && accel > 0.004;
    const isSignificant = energy > 0.18 && delta > this.historyMax * 0.12;

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
