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

// ══════════════════════════════════════════════════════
// SISTEMA EMOCIONAL — Interfaces de consciencia
// ══════════════════════════════════════════════════════

/**
 * Estado emocional acumulado — memoria persistente de lo vivido.
 * No es un snapshot del frame actual, es la historia reciente condensada.
 */
export interface EmotionalState {
  /** Tensión acumulada (0-1). Se acumula con energía alta, decay lento ~3-5s */
  tension: number;
  /** Valencia emocional (-1 a +1). Negativo = decayendo, positivo = creciendo */
  valence: number;
  /** Momentum emocional — derivada suavizada de la energía. Positivo = subiendo */
  momentum: number;
  /** Fase de decay — cuánto tiempo llevamos cayendo después de un pico (0-1) */
  decayPhase: number;
  /** Estado emocional discreto con histéresis (no cambia en cada frame) */
  currentState: EnergyLevel;
  /** Confianza en el estado actual (0-1). Alta = estado estable, baja = transición */
  stateConfidence: number;
  /** Energía emocional acumulada a largo plazo — "cuánto hemos vivido" (0-1) */
  accumulatedEmotion: number;
}

/**
 * Perfil único de la canción — su ADN visual.
 * Se construye en los primeros segundos y persiste toda la reproducción.
 */
export interface SongProfile {
  /** Elasticidad de respuesta: 0.3 (ambient lento) a 1.0 (EDM reactivo) */
  elasticity: number;
  /** Amplitud base adaptada al volumen general de la canción */
  baseAmplitude: number;
  /** Velocidad de reacción adaptada (modifica attack/release) */
  reactionSpeed: number;
  /** Temperatura cromática: -1 (frío/ambient) a +1 (cálido/soul) */
  colorTemperature: number;
  /** Velocidad de respiración orgánica base */
  breathRate: number;
  /** Rango dinámico detectado (0-1). Alto = mucha diferencia entre suave y fuerte */
  dynamicRange: number;
  /** Ratio vocal vs rítmico (0 = puro ritmo, 1 = pura voz) */
  vocalRatio: number;
  /** Si el perfil ha terminado su fase de calibración inicial */
  isCalibrated: boolean;
}

/**
 * Datos de intención — la línea no sigue, dialoga.
 */
export interface IntentionData {
  /** Tendencia detectada: -1 (bajando) a +1 (subiendo) */
  trend: number;
  /** Factor de anticipación: 0 (sin anticipación) a 1 (empujando adelante) */
  anticipation: number;
  /** Frase vocal activa detectada */
  vocalPhrase: boolean;
  /** Duración de la frase vocal actual en frames */
  vocalPhraseDuration: number;
  /** Silencio intencional detectado (caída abrupta después de intensidad) */
  intentionalSilence: boolean;
  /** Factor de "espera" — en silencio intencional, la línea no colapsa */
  waitFactor: number;
}

/**
 * Datos de audio procesados por el DynamicsProcessor + módulos emocionales.
 * Todos los valores están comprimidos, suavizados y garantizados en rango.
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
  /** Estado emocional acumulado — memoria de lo vivido */
  emotionalState: EmotionalState;
  /** Perfil único de la canción */
  songProfile: SongProfile;
  /** Intención y anticipación */
  intention: IntentionData;
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

/** Estados emocionales para el color engine — mapean situaciones musicales reales */
export type EnergyLevel = 'silence' | 'calm' | 'groove' | 'elevation' | 'vocal' | 'intensity' | 'climax';
