import type { AudioAnalysisData } from '../types/audio';

/**
 * AudioAnalyzer — Extrae features crudos del AnalyserNode.
 * 
 * Extractor PURO: no suaviza, no comprime, no detecta peaks.
 * Todo el procesamiento perceptual lo hace DynamicsProcessor.
 * Optimizado para lectura en render loop (sin allocaciones por frame).
 */
export class AudioAnalyzer {
  private analyser: AnalyserNode;
  private timeDomainBuffer: Float32Array<ArrayBuffer>;
  private frequencyBuffer: Uint8Array<ArrayBuffer>;
  private readonly sampleRate: number;

  constructor(analyser: AnalyserNode, sampleRate: number) {
    this.analyser = analyser;
    this.sampleRate = sampleRate;
    const bufferLength = analyser.frequencyBinCount;
    this.timeDomainBuffer = new Float32Array(bufferLength);
    this.frequencyBuffer = new Uint8Array(bufferLength);
  }

  /**
   * Analiza el frame actual y devuelve datos CRUDOS de análisis.
   * Reutiliza buffers para evitar garbage collection.
   */
  analyze(): AudioAnalysisData {
    this.analyser.getFloatTimeDomainData(this.timeDomainBuffer);
    this.analyser.getByteFrequencyData(this.frequencyBuffer);

    const amplitude = this.calculateAmplitude();
    const bassEnergy = this.calculateBandEnergy(20, 250);
    const midEnergy = this.calculateBandEnergy(250, 2000);
    const trebleEnergy = this.calculateBandEnergy(2000, 16000);

    return {
      timeDomainData: this.timeDomainBuffer,
      frequencyData: this.frequencyBuffer,
      averageAmplitude: amplitude,
      bassEnergy,
      midEnergy,
      trebleEnergy,
    };
  }

  /**
   * Calcula la amplitud RMS (Root Mean Square) del audio.
   */
  private calculateAmplitude(): number {
    let sum = 0;
    for (let i = 0; i < this.timeDomainBuffer.length; i++) {
      const val = this.timeDomainBuffer[i];
      sum += val * val;
    }
    return Math.sqrt(sum / this.timeDomainBuffer.length);
  }

  /**
   * Calcula la energía en una banda de frecuencia específica.
   */
  private calculateBandEnergy(lowFreq: number, highFreq: number): number {
    const nyquist = this.sampleRate / 2;
    const binCount = this.frequencyBuffer.length;
    const lowBin = Math.floor((lowFreq / nyquist) * binCount);
    const highBin = Math.min(Math.floor((highFreq / nyquist) * binCount), binCount - 1);

    if (lowBin >= highBin) return 0;

    let sum = 0;
    let count = 0;
    for (let i = lowBin; i <= highBin; i++) {
      sum += this.frequencyBuffer[i];
      count++;
    }

    return count > 0 ? (sum / count) / 255 : 0;
  }
}
