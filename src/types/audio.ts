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
  /** Instrumento protagonista detectado en el frame */
  instrumentData: InstrumentData;
  /** Motivo visual activo (frase musical reconocida) */
  motifData: MotifData;
}

// ══════════════════════════════════════════════════════
// INSTRUMENTOS — Detección espectral heurística
// ══════════════════════════════════════════════════════

/**
 * Tipos de instrumento detectables por análisis espectral.
 * 'none' = sin instrumento claramente protagonista.
 */
export type InstrumentType =
  | 'none'
  | 'piano'
  | 'guitar_acoustic'
  | 'guitar_electric'
  | 'violin_strings'
  | 'trumpet_brass'
  | 'saxophone'
  | 'flute'
  | 'pad_ambient'
  | 'percussion_latin'
  | 'bass_deep';

/**
 * Tipo de gesto visual asociado a cada instrumento.
 * Determina la forma de la modulación sobre la línea.
 */
export type GestureType =
  | 'none'
  | 'liquid_waves'       // Piano: ondas elegantes, curvas fluidas
  | 'long_expansion'     // Violín/Cuerdas: expansión continua
  | 'luminous_pulse'     // Trompeta/Metales: impulso brillante
  | 'tension_edge'       // Guitarra eléctrica: mayor tensión en bordes
  | 'micro_float'        // Flauta: flotación aérea muy sutil
  | 'warm_breath'        // Saxofón: respiración cálida
  | 'latin_impulse'      // Percusión latina: pequeños impulsos rítmicos
  | 'deep_swell'         // Bass profundo: ondulación baja
  | 'soft_bloom';        // Pad ambiental: expansión suave difusa

/**
 * Datos del instrumento protagonista detectado en el frame actual.
 */
export interface InstrumentData {
  /** Instrumento actualmente dominante */
  dominantInstrument: InstrumentType;
  /** Nivel de confianza en la detección (0-1). Alto = muy claro */
  confidence: number;
  /** Si hay un instrumento claramente protagonista (confidence > umbral) */
  isActive: boolean;
  /** Gesto visual asociado al instrumento actual */
  gestureType: GestureType;
  /** Intensidad del gesto (0-1). Modulada por confianza y energía */
  gestureIntensity: number;
  /** Fase interna del gesto (para continuidad entre frames) */
  gesturePhase: number;
}

// ══════════════════════════════════════════════════════
// MOTIVOS — Memoria de frases musicales
// ══════════════════════════════════════════════════════

/**
 * Datos del motor de motivos visuales.
 * Captura si la música actual se parece a una frase reciente
 * y qué gesto visual debería reutilizarse.
 */
export interface MotifData {
  /** Si hay un motivo activo reconocido del banco de memoria */
  isMotifActive: boolean;
  /** Similitud con el motivo más cercano (0-1). 1 = idéntico */
  similarity: number;
  /** Índice del motivo en el banco (para trazabilidad) */
  motifIndex: number;
  /** Parámetro de onda del motivo: frecuencia angular de la firma visual */
  motifFrequency: number;
  /** Fase acumulada del motivo (continuidad) */
  motifPhase: number;
  /** Amplitud del gesto del motivo (muy pequeña, máx ~0.008) */
  motifAmplitude: number;
  /** Variación aplicada sobre el gesto base (0-1) */
  variation: number;
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
