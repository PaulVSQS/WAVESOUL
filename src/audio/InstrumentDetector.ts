import type { InstrumentData, InstrumentType, GestureType } from '../types/audio';

/**
 * InstrumentDetector — Detección de instrumento protagonista por análisis espectral.
 *
 * No usa IA. Usa heurística espectral sobre el frequencyData del AnalyserNode.
 *
 * Principio:
 *   Divide el espectro en 8 subbandas. Compara la energía actual de cada banda
 *   contra su media histórica. Si una banda supera su media por un margen
 *   significativo, y la distribución coincide con el perfil de un instrumento,
 *   ese instrumento se convierte en candidato.
 *
 * Bandas espectrales:
 *   Band 0:  20-120Hz    Sub-bass (kick, bass profundo)
 *   Band 1:  120-300Hz   Bass (bajo, cuerda baja)
 *   Band 2:  300-600Hz   Low-mid (saxofón, voz grave, piano bajo)
 *   Band 3:  600-1200Hz  Mid (piano, guitarra, voz media)
 *   Band 4:  1200-2500Hz Upper-mid (guitarra eléctrica, violín, trompeta)
 *   Band 5:  2500-5000Hz Presence (brillo instrumental)
 *   Band 6:  5000-10000Hz Brilliance (armónicos altos, flauta alta)
 *   Band 7:  10000-20000Hz Air (platillos, aire de flauta)
 */

const BANDS_HZ: [number, number][] = [
  [20,    120],
  [120,   300],
  [300,   600],
  [600,   1200],
  [1200,  2500],
  [2500,  5000],
  [5000,  10000],
  [10000, 20000],
];

const NUM_BANDS = BANDS_HZ.length;

const INSTRUMENT_PROFILES: Record<InstrumentType, number[]> = {
  none:              [0,    0,    0,    0,    0,    0,    0,    0],
  bass_deep:         [0.95, 0.70, 0.10, 0.05, 0.02, 0.01, 0,    0],
  saxophone:         [0.10, 0.35, 0.85, 0.60, 0.25, 0.10, 0.05, 0],
  piano:             [0.05, 0.20, 0.50, 0.85, 0.55, 0.30, 0.10, 0.02],
  guitar_acoustic:   [0.05, 0.25, 0.60, 0.70, 0.40, 0.20, 0.05, 0.01],
  violin_strings:    [0.02, 0.10, 0.30, 0.65, 0.85, 0.55, 0.25, 0.05],
  guitar_electric:   [0.05, 0.20, 0.40, 0.70, 0.90, 0.65, 0.30, 0.08],
  trumpet_brass:     [0.02, 0.10, 0.35, 0.70, 0.95, 0.70, 0.35, 0.10],
  flute:             [0,    0.05, 0.25, 0.50, 0.60, 0.55, 0.85, 0.40],
  pad_ambient:       [0.15, 0.25, 0.40, 0.45, 0.40, 0.30, 0.15, 0.08],
  percussion_latin:  [0.60, 0.40, 0.25, 0.30, 0.40, 0.35, 0.25, 0.15],
};

const INSTRUMENT_GESTURES: Record<InstrumentType, GestureType> = {
  none:              'none',
  piano:             'liquid_waves',
  guitar_acoustic:   'liquid_waves',
  guitar_electric:   'tension_edge',
  violin_strings:    'long_expansion',
  trumpet_brass:     'luminous_pulse',
  saxophone:         'warm_breath',
  flute:             'micro_float',
  pad_ambient:       'soft_bloom',
  percussion_latin:  'latin_impulse',
  bass_deep:         'deep_swell',
};

const DETECTABLE_INSTRUMENTS: InstrumentType[] = [
  'bass_deep', 'saxophone', 'piano', 'guitar_acoustic', 'violin_strings',
  'guitar_electric', 'trumpet_brass', 'flute', 'pad_ambient', 'percussion_latin',
];

const GESTURE_PHASE_SPEED: Record<GestureType, number> = {
  none:           0,
  liquid_waves:   0.04,
  long_expansion: 0.02,
  luminous_pulse: 0.08,
  tension_edge:   0.06,
  micro_float:    0.035,
  warm_breath:    0.025,
  latin_impulse:  0.10,
  deep_swell:     0.018,
  soft_bloom:     0.015,
};

export class InstrumentDetector {
  private readonly sampleRate: number;
  private readonly historySize = 300;

  private bandBins: [number, number][] = [];
  private bandHistory: Float32Array[] = [];
  private historyIndex = 0;
  private historyFilled = 0;
  private bandMeans: Float32Array;

  private smoothConfidence: Record<InstrumentType, number>;
  private currentInstrument: InstrumentType = 'none';
  private smoothInstrumentConfidence = 0;

  private changeCooldown = 0;
  private readonly minCooldownFrames = 18;

  private gesturePhase = 0;

  constructor(sampleRate: number, fftSize: number) {
    this.sampleRate = sampleRate;
    const binCount = fftSize / 2;
    const nyquist = sampleRate / 2;

    for (const [lo, hi] of BANDS_HZ) {
      const lowBin = Math.max(0, Math.floor((lo / nyquist) * binCount));
      const highBin = Math.min(binCount - 1, Math.floor((hi / nyquist) * binCount));
      this.bandBins.push([lowBin, highBin]);
    }

    for (let b = 0; b < NUM_BANDS; b++) {
      this.bandHistory.push(new Float32Array(this.historySize));
    }
    this.bandMeans = new Float32Array(NUM_BANDS);

    this.smoothConfidence = {} as Record<InstrumentType, number>;
    for (const inst of DETECTABLE_INSTRUMENTS) {
      this.smoothConfidence[inst] = 0;
    }
    this.smoothConfidence['none'] = 1;
  }

  /**
   * Procesa el frame y devuelve el instrumento protagonista detectado.
   */
  update(
    frequencyData: Uint8Array,
    energy: number,
    mid: number,
    vocalPhrase: boolean,
  ): InstrumentData {
    const bandEnergies = this.calculateBandEnergies(frequencyData);
    this.updateHistory(bandEnergies);

    if (energy < 0.08) {
      return this.makeInactive();
    }

    const bandExcess = new Float32Array(NUM_BANDS);
    for (let b = 0; b < NUM_BANDS; b++) {
      const mean = this.bandMeans[b];
      if (mean > 0.001) {
        bandExcess[b] = Math.max(0, (bandEnergies[b] - mean) / mean);
      }
    }

    let maxExcess = 0;
    for (let b = 0; b < NUM_BANDS; b++) {
      if (bandExcess[b] > maxExcess) maxExcess = bandExcess[b];
    }

    const normalizedExcess = new Float32Array(NUM_BANDS);
    if (maxExcess > 0.05) {
      for (let b = 0; b < NUM_BANDS; b++) {
        normalizedExcess[b] = bandExcess[b] / maxExcess;
      }
    } else {
      return this.makeInactive();
    }

    let bestInstrument: InstrumentType = 'none';
    let bestScore = 0;

    for (const inst of DETECTABLE_INSTRUMENTS) {
      const profile = INSTRUMENT_PROFILES[inst];
      let dotProduct = 0;
      let profileMag = 0;

      for (let b = 0; b < NUM_BANDS; b++) {
        dotProduct += normalizedExcess[b] * profile[b];
        profileMag += profile[b] * profile[b];
      }

      profileMag = Math.sqrt(profileMag);
      const score = profileMag > 0 ? dotProduct / profileMag : 0;
      this.smoothConfidence[inst] += (score - this.smoothConfidence[inst]) * 0.08;

      if (this.smoothConfidence[inst] > bestScore) {
        bestScore = this.smoothConfidence[inst];
        bestInstrument = inst;
      }
    }

    if (this.changeCooldown > 0) {
      this.changeCooldown--;
      bestInstrument = this.currentInstrument;
      bestScore = this.smoothConfidence[this.currentInstrument] ?? 0;
    } else if (bestInstrument !== this.currentInstrument && bestScore > 0.35) {
      this.currentInstrument = bestInstrument;
      this.changeCooldown = this.minCooldownFrames;
      this.gesturePhase = 0;
    }

    const vocalSuppression = vocalPhrase ? 0.4 : 1.0;
    const targetConfidence = bestScore * vocalSuppression;
    this.smoothInstrumentConfidence += (targetConfidence - this.smoothInstrumentConfidence) * 0.06;

    const isActive = this.smoothInstrumentConfidence > 0.28;
    const gestureType = isActive ? INSTRUMENT_GESTURES[this.currentInstrument] : 'none';

    const phaseSpeed = GESTURE_PHASE_SPEED[gestureType] ?? 0;
    this.gesturePhase += phaseSpeed;

    const gestureIntensity = isActive
      ? Math.min(1, (this.smoothInstrumentConfidence - 0.28) / 0.4) * Math.min(1, mid * 4)
      : 0;

    return {
      dominantInstrument: isActive ? this.currentInstrument : 'none',
      confidence: this.smoothInstrumentConfidence,
      isActive,
      gestureType,
      gestureIntensity,
      gesturePhase: this.gesturePhase,
    };
  }

  private makeInactive(): InstrumentData {
    this.smoothInstrumentConfidence *= 0.92;
    return {
      dominantInstrument: 'none',
      confidence: this.smoothInstrumentConfidence,
      isActive: false,
      gestureType: 'none',
      gestureIntensity: 0,
      gesturePhase: this.gesturePhase,
    };
  }

  private calculateBandEnergies(frequencyData: Uint8Array): Float32Array {
    const energies = new Float32Array(NUM_BANDS);
    for (let b = 0; b < NUM_BANDS; b++) {
      const [lo, hi] = this.bandBins[b];
      if (lo >= hi) continue;
      let sum = 0;
      let count = 0;
      for (let i = lo; i <= hi; i++) {
        sum += frequencyData[i];
        count++;
      }
      energies[b] = count > 0 ? (sum / count) / 255 : 0;
    }
    return energies;
  }

  private updateHistory(bandEnergies: Float32Array): void {
    for (let b = 0; b < NUM_BANDS; b++) {
      this.bandHistory[b][this.historyIndex] = bandEnergies[b];
    }
    this.historyIndex = (this.historyIndex + 1) % this.historySize;
    if (this.historyFilled < this.historySize) this.historyFilled++;

    if (this.historyFilled > 10 && this.historyIndex % 10 === 0) {
      const count = Math.min(this.historyFilled, this.historySize);
      for (let b = 0; b < NUM_BANDS; b++) {
        let sum = 0;
        for (let i = 0; i < count; i++) {
          sum += this.bandHistory[b][i];
        }
        this.bandMeans[b] = sum / count;
      }
    }
  }

  reset(): void {
    for (let b = 0; b < NUM_BANDS; b++) {
      this.bandHistory[b].fill(0);
    }
    this.historyIndex = 0;
    this.historyFilled = 0;
    this.bandMeans.fill(0);
    this.currentInstrument = 'none';
    this.smoothInstrumentConfidence = 0;
    this.changeCooldown = 0;
    this.gesturePhase = 0;
    for (const inst of DETECTABLE_INSTRUMENTS) {
      this.smoothConfidence[inst] = 0;
    }
    this.smoothConfidence['none'] = 1;
  }

  silence(): InstrumentData {
    this.smoothInstrumentConfidence *= 0.95;
    return {
      dominantInstrument: 'none',
      confidence: this.smoothInstrumentConfidence,
      isActive: false,
      gestureType: 'none',
      gestureIntensity: 0,
      gesturePhase: this.gesturePhase,
    };
  }

  getSampleRate(): number {
    return this.sampleRate;
  }
}
