import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProcessedAudioData } from '../types/audio';

interface ParticleFieldProps {
  processedDataRef: React.RefObject<ProcessedAudioData | null>;
  count?: number;
}

/**
 * ParticleField — Campo de partículas 3D reactivas al audio.
 * Usa Points con BufferGeometry para máximo rendimiento.
 * Ahora consume ProcessedAudioData para movimiento controlado.
 */
export function ParticleField({ processedDataRef, count = 600 }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Generar posiciones iniciales y velocidades
  const { positions, sizes, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const pha = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribución esférica con variación
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3 + Math.random() * 8;

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi) - 5; // Offset Z para profundidad

      // Velocidades base lentas
      vel[i * 3] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003;

      // Tamaños variados
      siz[i] = 0.5 + Math.random() * 2.5;

      // Fase aleatoria para movimiento no-sincronizado
      pha[i] = Math.random() * Math.PI * 2;
    }

    return { positions: pos, sizes: siz, phases: pha };
  }, [count]);

  // Vertex y Fragment shaders
  const vertexShader = `
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    uniform float uEnergy;
    uniform float uBassEnergy;
    varying float vAlpha;
    varying float vPhase;

    void main() {
      vPhase = aPhase;
      
      // Movimiento base + reactivo (energía ya comprimida, sin explosiones)
      vec3 pos = position;
      float wave = sin(uTime * 0.5 + aPhase) * 0.3;
      pos.x += wave * (1.0 + uBassEnergy * 1.5);
      pos.y += cos(uTime * 0.3 + aPhase * 1.5) * 0.2;
      pos.z += sin(uTime * 0.2 + aPhase * 0.8) * 0.15;
      
      // Expansión controlada con bass energy (ya comprimida)
      pos *= 1.0 + uBassEnergy * 0.2;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Tamaño basado en distancia + energía (controlada)
      float sizeScale = 1.0 + uEnergy * 1.2;
      gl_PointSize = aSize * sizeScale * (200.0 / -mvPosition.z);
      
      // Alpha basado en distancia
      float dist = length(mvPosition.xyz);
      vAlpha = smoothstep(20.0, 2.0, dist) * (0.3 + uEnergy * 0.4);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uEnergy;
    varying float vAlpha;
    varying float vPhase;

    void main() {
      // Punto circular con glow suave
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      // Descarte fuera del círculo
      if (dist > 0.5) discard;
      
      // Glow radial
      float glow = 1.0 - smoothstep(0.0, 0.5, dist);
      glow = pow(glow, 2.0); // Concentrar el brillo en el centro
      
      // Color con variación sutil por fase
      vec3 color = uColor;
      color += vec3(sin(vPhase) * 0.1, cos(vPhase) * 0.05, 0.0);
      
      gl_FragColor = vec4(color, glow * vAlpha);
    }
  `;

  // Uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uEnergy: { value: 0 },
    uBassEnergy: { value: 0 },
    uColor: { value: new THREE.Color(0.66, 0.33, 0.97) }, // Violeta base
  }), []);

  // Actualizar cada frame con datos procesados
  useFrame((state) => {
    if (!materialRef.current) return;

    const processed = processedDataRef.current;
    // Usar energía y bass YA comprimidos (0-1, sin explosiones)
    const energy = processed?.energy ?? 0;
    const bass = processed?.bass ?? 0;

    // Actualizar uniforms
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uEnergy.value = energy;
    materialRef.current.uniforms.uBassEnergy.value = bass;

    // Actualizar color basado en energía
    const hue = 0.75 - energy * 0.35; // De violeta a magenta/rojo con energía
    const sat = 0.5 + energy * 0.4;
    const light = 0.4 + energy * 0.3;
    materialRef.current.uniforms.uColor.value.setHSL(hue, sat, light);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          args={[phases, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
