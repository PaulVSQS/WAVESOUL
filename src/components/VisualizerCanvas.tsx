import { useRef } from 'react';
import { useRenderLoop } from '../visualization/useRenderLoop';
import type { ProcessedAudioData } from '../types/audio';

interface VisualizerCanvasProps {
  processedDataRef: React.RefObject<ProcessedAudioData | null>;
}

/**
 * VisualizerCanvas — Wrapper del canvas 2D para la línea ECG.
 * Ocupa toda la pantalla, transparente encima del fondo Three.js.
 */
export function VisualizerCanvas({ processedDataRef }: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar el render loop con datos procesados
  useRenderLoop(canvasRef, processedDataRef);

  // El canvas es full-screen y no interactivo (pointer-events: none del padre)
  return (
    <div className="layer-canvas">
      <canvas
        ref={canvasRef}
        id="visualizer-canvas"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}
