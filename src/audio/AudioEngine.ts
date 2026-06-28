/**
 * AudioEngine — Gestiona el AudioContext, nodos de audio y reproducción.
 * Encapsula toda la lógica de Web Audio API.
 */
export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement;
  private isInitialized = false;

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';
  }

  /**
   * Inicializa el AudioContext y conecta los nodos.
   * Debe llamarse en respuesta a un gesto del usuario.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = new AudioContext();
    this.analyserNode = this.audioContext.createAnalyser();
    this.gainNode = this.audioContext.createGain();

    // Configurar AnalyserNode para balance entre detalle y respuesta
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.82;
    this.analyserNode.minDecibels = -90;
    this.analyserNode.maxDecibels = -10;

    // Conectar: source → analyser → gain → destination
    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.isInitialized = true;
  }

  /**
   * Carga un archivo de audio desde un File del usuario.
   */
  async loadFile(file: File): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    // Revocar URL anterior si existe
    if (this.audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audioElement.src);
    }

    const url = URL.createObjectURL(file);
    this.audioElement.src = url;

    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        this.audioElement.removeEventListener('canplaythrough', onCanPlay);
        this.audioElement.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        this.audioElement.removeEventListener('canplaythrough', onCanPlay);
        this.audioElement.removeEventListener('error', onError);
        reject(new Error('Error loading audio file'));
      };
      this.audioElement.addEventListener('canplaythrough', onCanPlay);
      this.audioElement.addEventListener('error', onError);
      this.audioElement.load();
    });
  }

  async play(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.audioElement.play();
  }

  pause(): void {
    this.audioElement.pause();
  }

  seek(time: number): void {
    this.audioElement.currentTime = Math.max(0, Math.min(time, this.duration));
  }

  setVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(clamped, this.audioContext!.currentTime);
    }
    this.audioElement.volume = clamped;
  }

  get isPlaying(): boolean {
    return !this.audioElement.paused && !this.audioElement.ended;
  }

  get currentTime(): number {
    return this.audioElement.currentTime;
  }

  get duration(): number {
    return this.audioElement.duration || 0;
  }

  get volume(): number {
    return this.audioElement.volume;
  }

  get analyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  get element(): HTMLAudioElement {
    return this.audioElement;
  }

  get context(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Libera todos los recursos de audio.
   */
  destroy(): void {
    this.audioElement.pause();
    if (this.audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audioElement.src);
    }
    this.audioElement.src = '';
    this.sourceNode?.disconnect();
    this.analyserNode?.disconnect();
    this.gainNode?.disconnect();
    this.audioContext?.close();
    this.isInitialized = false;
  }
}
