import { useRef, useEffect, useCallback } from 'react';
import { WavelineRenderer } from './WavelineRenderer';
import type { ProcessedAudioData, DynamicColor } from '../types/audio';

/**
 * useRenderLoop — Hook que maneja el render loop del canvas 2D.
 * Lee datos procesados de un ref y dibuja cada frame.
 */
export function useRenderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  processedDataRef: React.RefObject<ProcessedAudioData | null>,
) {
  const rendererRef = useRef<WavelineRenderer | null>(null);
  const rafIdRef = useRef<number>(0);
  const colorRef = useRef<DynamicColor | null>(null);

  const startLoop = useCallback(() => {
    if (rafIdRef.current) return; // Ya corriendo

    const loop = () => {
      const renderer = rendererRef.current;
      if (!renderer) {
        rafIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const processed = processedDataRef.current;
      const color = renderer.draw(processed);
      colorRef.current = color;

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, [processedDataRef]);

  const stopLoop = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  // Inicializar renderer cuando el canvas esté disponible
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new WavelineRenderer(canvas);
    startLoop();

    // Handle resize
    const handleResize = () => {
      rendererRef.current?.resize();
    };

    // Debounce resize
    let resizeTimeout: number;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      stopLoop();
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [canvasRef, startLoop, stopLoop]);

  return {
    rendererRef,
    colorRef,
  };
}
