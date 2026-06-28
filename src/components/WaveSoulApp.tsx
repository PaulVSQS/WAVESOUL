import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudio } from '../audio/useAudio';
import { BackgroundScene } from '../background/BackgroundScene';
import { VisualizerCanvas } from './VisualizerCanvas';
import { AudioUploader } from './AudioUploader';
import { PlayerControls } from './PlayerControls';
import { animateIntro } from '../animation/transitions';

/**
 * WaveSoulApp — Componente raíz que orquesta toda la experiencia.
 * 
 * Capas (de atrás hacia adelante):
 * 1. BackgroundScene (Three.js partículas)
 * 2. VisualizerCanvas (Canvas 2D línea ECG)
 * 3. UI (Upload / Controls)
 */
export function WaveSoulApp() {
  const { playerState, controls, processedDataRef } = useAudio();
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  // Animación de entrada
  useEffect(() => {
    animateIntro(logoRef.current);
  }, []);

  // Handler para cuando el usuario selecciona un archivo
  const handleFileSelected = useCallback(async (file: File) => {
    try {
      await controls.loadFile(file);
      setIsAudioLoaded(true);

      // Auto-play después de cargar
      setTimeout(async () => {
        await controls.play();
      }, 300);
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }, [controls]);

  return (
    <div className="wavesoul-root" id="wavesoul-root">
      {/* Logo */}
      <div className="wavesoul-logo" ref={logoRef}>
        <svg className="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2 16 C4 16, 5 10, 7 10 C9 10, 9 22, 11 22 C13 22, 13 6, 16 6 C19 6, 19 26, 21 26 C23 26, 23 10, 25 10 C27 10, 28 16, 30 16"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="logo-text">WAVESOUL</span>
      </div>

      {/* Capa 1: Fondo 3D */}
      <BackgroundScene processedDataRef={processedDataRef} />

      {/* Capa 2: Línea ECG */}
      <VisualizerCanvas processedDataRef={processedDataRef} />

      {/* Capa 3: UI */}
      <div className="layer-ui">
        {/* Upload zone — se oculta cuando hay audio cargado */}
        <AudioUploader
          onFileSelected={handleFileSelected}
          isHidden={isAudioLoaded}
        />

        {/* Player controls — aparecen cuando hay audio */}
        <PlayerControls
          playerState={playerState}
          controls={controls}
        />
      </div>
    </div>
  );
}
