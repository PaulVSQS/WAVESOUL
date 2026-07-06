import { useRef, useState, useCallback, useEffect } from 'react';
import { AudioEngine } from './AudioEngine';
import { AudioAnalyzer } from './AudioAnalyzer';
import { DynamicsProcessor } from './DynamicsProcessor';
import type { AudioPlayerState, AudioControls, ProcessedAudioData } from '../types/audio';

/**
 * useAudio — Hook principal que expone el motor de audio a React.
 * 
 * Pipeline: AudioEngine → AudioAnalyzer (raw) → DynamicsProcessor (processed)
 * 
 * IMPORTANTE: Los datos procesados se leen via ref,
 * no via state, para evitar 60 re-renders/seg.
 */
export function useAudio() {
  const engineRef = useRef<AudioEngine | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const processorRef = useRef<DynamicsProcessor | null>(null);
  const processedDataRef = useRef<ProcessedAudioData | null>(null);
  const rafIdRef = useRef<number>(0);

  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    fileName: null,
    isLoaded: false,
  });

  // Inicializar engine en primera interacción
  const getEngine = useCallback(async (): Promise<AudioEngine> => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
      await engineRef.current.init();
    }
    return engineRef.current;
  }, []);

  // Actualización continua: Analyzer → Processor → ref (sin re-render)
  const startAnalysisLoop = useCallback(() => {
    const loop = () => {
      const analyzer = analyzerRef.current;
      const processor = processorRef.current;

      if (analyzer && processor) {
        const rawData = analyzer.analyze();
        processedDataRef.current = processor.process(rawData);
      } else if (processor) {
        // Sin analyzer pero con processor: producir silencio con breathing
        processedDataRef.current = processor.silence();
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  const stopAnalysisLoop = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  // Actualizar currentTime en el state (para UI) con menor frecuencia
  const timeUpdateRef = useRef<number>(0);
  const startTimeUpdates = useCallback(() => {
    const update = () => {
      const engine = engineRef.current;
      if (engine) {
        setPlayerState(prev => ({
          ...prev,
          currentTime: engine.currentTime,
          isPlaying: engine.isPlaying,
        }));
      }
      timeUpdateRef.current = window.setTimeout(update, 250); // 4 veces por segundo, suficiente para UI
    };
    update();
  }, []);

  const stopTimeUpdates = useCallback(() => {
    if (timeUpdateRef.current) {
      clearTimeout(timeUpdateRef.current);
      timeUpdateRef.current = 0;
    }
  }, []);

  // === Controles ===

  const loadFile = useCallback(async (file: File) => {
    const engine = await getEngine();
    await engine.loadFile(file);

    // Crear analyzer con el AnalyserNode del engine
    if (engine.analyser && engine.context) {
      analyzerRef.current = new AudioAnalyzer(engine.analyser, engine.context.sampleRate);
    }

    // Crear DynamicsProcessor (si aún no existe)
    if (!processorRef.current) {
      processorRef.current = new DynamicsProcessor();
    }

    engine.setVolume(playerState.volume);

    setPlayerState(prev => ({
      ...prev,
      fileName: file.name.replace(/\.[^/.]+$/, ''), // Sin extensión
      duration: engine.duration,
      currentTime: 0,
      isLoaded: true,
      isPlaying: false,
    }));

    // Iniciar loop de análisis (siempre corre, incluso en pause, para suavidad)
    startAnalysisLoop();
  }, [getEngine, playerState.volume, startAnalysisLoop]);

  const play = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.play();
    setPlayerState(prev => ({ ...prev, isPlaying: true }));
    startTimeUpdates();
  }, [startTimeUpdates]);

  const pause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.pause();
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
    stopTimeUpdates();
  }, [stopTimeUpdates]);

  const togglePlay = useCallback(async () => {
    if (engineRef.current?.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [play, pause]);

  const seek = useCallback((time: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.seek(time);
    setPlayerState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const engine = engineRef.current;
    if (engine) {
      engine.setVolume(volume);
    }
    setPlayerState(prev => ({ ...prev, volume }));
  }, []);

  const controls: AudioControls = {
    loadFile,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
  };

  // Escuchar evento 'ended' del audio
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const handleEnded = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      stopTimeUpdates();
    };

    engine.element.addEventListener('ended', handleEnded);
    return () => {
      engine.element.removeEventListener('ended', handleEnded);
    };
  }, [playerState.isLoaded, stopTimeUpdates]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopAnalysisLoop();
      stopTimeUpdates();
      engineRef.current?.destroy();
    };
  }, [stopAnalysisLoop, stopTimeUpdates]);

  // Listeners de teclado globales para controles de reproducción
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || !playerState.isLoaded) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          seek(engine.currentTime + 5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(engine.currentTime - 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(engine.volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(engine.volume - 0.05);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [seek, setVolume, playerState.isLoaded]);

  return {
    playerState,
    controls,
    processedDataRef,
    engineRef,
  };
}
