/** Datos de análisis de audio extraídos cada frame (crudos, sin procesar) */
export interface AudioAnalysisData {
  /** Datos de forma de onda (time domain) — Float32Array normalizado -1 a 1 */
  timeDomainData: Float32Array;
  /** Datos de frecuencia — Uint8Array 0 a 255 */
  frequencyData: Uint8Array;
  /** Amplitud RMS cruda normalizada 0-1 */
  averageAmplitude: number;
  /** Energía de frecuencias bajas (20-250Hz) cruda 0-1 */
  bassEnergy: number;
  /** Energía de frecuencias medias (250-2000Hz) cruda 0-1 */
  midEnergy: number;
  /** Energía de frecuencias altas (2000-16000Hz) cruda 0-1 */
  trebleEnergy: number;
}

/**
 * Datos de audio procesados por el DynamicsProcessor.
 * Todos los valores están comprimidos, suavizados y garantizados en rango 0-1.
 * Este es el tipo que consume el renderer — nunca usa datos crudos.
 */
export interface ProcessedAudioData {
  /** Energía combinada comprimida y suavizada (0-1) */
  energy: number;
  /** Energía bass procesada (0-1) */
  bass: number;
  /** Energía mid procesada (0-1) */
  mid: number;
  /** Energía treble procesada (0-1) */
  treble: number;
  /** Forma de onda suavizada y limitada para dibujar */
  waveform: Float32Array;
  /** Peak detectado con histéresis (sin falsos positivos) */
  isPeak: boolean;
  /** Fase orgánica de "respiración" (incrementa con el tiempo) */
  breathPhase: number;
  /** Intensidad visual suave para grosor/glow (0-1) */
  intensity: number;
}

/** Estado del reproductor de audio */
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  fileName: string | null;
  isLoaded: boolean;
}

/** Controles expuestos por el hook de audio */
export interface AudioControls {
  loadFile: (file: File) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

/** Estado de color dinámico */
export interface DynamicColor {
  primary: string;
  glow: string;
  background: string;
  hue: number;
  saturation: number;
  lightness: number;
}

/** Configuración del visualizador */
export interface VisualizerConfig {
  /** Tamaño de FFT — potencia de 2 entre 32 y 32768 */
  fftSize: number;
  /** Suavizado temporal del analyser (0-1) */
  smoothingTimeConstant: number;
  /** Sensibilidad de detección de picos (0-1) */
  peakThreshold: number;
  /** Factor de dramatismo de la línea (multiplicador) */
  dramFactor: number;
  /** Opacidad del trail (0-1, más bajo = más trail) */
  trailOpacity: number;
}

/** Modos de energía para el color engine */
export type EnergyLevel = 'silence' | 'calm' | 'low' | 'medium' | 'high' | 'peak';
