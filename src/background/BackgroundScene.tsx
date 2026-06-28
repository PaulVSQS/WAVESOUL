import { Canvas } from '@react-three/fiber';
import { ParticleField } from './ParticleField';
import type { ProcessedAudioData } from '../types/audio';

interface BackgroundSceneProps {
  processedDataRef: React.RefObject<ProcessedAudioData | null>;
}

/**
 * BackgroundScene — Escena Three.js de fondo con partículas reactivas.
 * Se renderiza debajo del canvas 2D (z-index inferior).
 * Ahora consume ProcessedAudioData para beneficiarse de la compresión.
 */
export function BackgroundScene({ processedDataRef }: BackgroundSceneProps) {
  return (
    <div className="layer-background">
      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 60,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]} // Limitar DPR para rendimiento
        style={{ background: 'transparent' }}
        gl={{
          antialias: false, // Rendimiento > calidad para partículas
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* Luz ambiente suave */}
        <ambientLight intensity={0.3} />
        
        {/* Campo de partículas reactivo */}
        <ParticleField
          processedDataRef={processedDataRef}
          count={500}
        />
      </Canvas>
    </div>
  );
}
