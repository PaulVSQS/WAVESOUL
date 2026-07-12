import type { ProcessedAudioData, DynamicColor } from '../types/audio';
import { ColorEngine } from './ColorEngine';

/**
 * WavelineRenderer — Organismo visual consciente.
 *
 * Dibuja la línea ECG como un ser vivo que recuerda, anticipa y respira.
 * Consume ProcessedAudioData enriquecido con consciencia emocional.
 *
 * Capas visuales (de fondo a frente):
 *   1. Trail emocional (estela modulada por tensión)
 *   2. Glow layer (halo que respira orgánicamente)
 *   3. Main line (curva Bezier con grosor emocional variable)
 *   4. Peak flash (destello sutil en beats)
 *
 * Micro-detalles premium:
 *   - Grosor variable por punto (curvatura local)
 *   - Micro-vibraciones armónicas en highs
 *   - Imperfecciones orgánicas (Perlin simplificado)
 *   - Glow que respira (no parpadea)
 *   - Intención visual (anticipación, frases vocales)
 */
export class WavelineRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colorEngine: ColorEngine;
  private width = 0;
  private height = 0;
  private dpr = 1;

  // Estado de la línea
  private displayPoints: number[] = [];
  private readonly numPoints = 200;
  private trailOpacity = 0.12;
  private trailTarget = 0.12;

  // Idle breathing phase
  private localBreathPhase = 0;

  // ── Micro-detalles orgánicos ──
  // Tabla Perlin precalculada para imperfecciones orgánicas
  private perlinTable: number[];
  private perlinPhase = 0;
  private readonly perlinSize = 512;

  // ── Micro-vibraciones armónicas ──
  private harmonicPhase = 0;

  // ── Grosor emocional ──
  private smoothLineWidth = 1.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.colorEngine = new ColorEngine();
    this.resize();

    // Inicializar puntos en línea recta
    for (let i = 0; i < this.numPoints; i++) {
      this.displayPoints.push(0);
    }

    // Generar tabla Perlin simplificada (una sola vez)
    this.perlinTable = this.generatePerlinTable();
  }

  /**
   * Ajusta el canvas al tamaño de la ventana con DPR.
   */
  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Frame principal de dibujo. Llamar cada requestAnimationFrame.
   */
  draw(processed: ProcessedAudioData | null): DynamicColor {
    const energy = processed?.energy ?? 0;
    const bass = processed?.bass ?? 0;
    const mid = processed?.mid ?? 0;
    const treble = processed?.treble ?? 0;
    const isPeak = processed?.isPeak ?? false;
    const intensity = processed?.intensity ?? 0;
    const emotionalState = processed?.emotionalState;
    const songProfile = processed?.songProfile;
    const breathPhase = processed?.breathPhase ?? this.localBreathPhase;

    // ── Trail emocional (modulado por tensión) ──
    const emotionalTrail = emotionalState
      ? 0.10 + emotionalState.tension * 0.12 + emotionalState.accumulatedEmotion * 0.06
      : 0.12;
    this.trailTarget = emotionalTrail;
    this.trailOpacity += (this.trailTarget - this.trailOpacity) * 0.06;

    // Limpiar con trail
    this.ctx.fillStyle = `rgba(10, 10, 15, ${1 - this.trailOpacity})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // ── Actualizar colores con consciencia emocional ──
    const color = this.colorEngine.update(
      energy, bass, mid, treble, isPeak,
      emotionalState, songProfile, breathPhase,
    );

    // ── Actualizar puntos de la línea ──
    this.updatePoints(processed);

    // ── Actualizar fases orgánicas ──
    this.perlinPhase += 0.003;
    this.harmonicPhase += 0.08 + treble * 0.15;

    // ── Dibujar capas ──
    this.drawGlowLayer(color, intensity, breathPhase, emotionalState?.tension ?? 0);
    this.drawMainLine(color, intensity, processed);

    // Flash sutil en peaks
    if (isPeak) {
      this.drawPeakFlash(color, emotionalState?.tension ?? 0);
    }

    // Incrementar breathing local
    this.localBreathPhase += 0.008;

    return color;
  }

  /**
   * Actualiza los puntos de la línea con intención, anticipación y micro-detalles.
   */
  private updatePoints(processed: ProcessedAudioData | null): void {
    const waveform = processed?.waveform;
    const energy = processed?.energy ?? 0;
    const treble = processed?.treble ?? 0;
    const breathPhase = processed?.breathPhase ?? this.localBreathPhase;
    const intention = processed?.intention;
    const songProfile = processed?.songProfile;

    // Elasticidad del perfil de canción
    const elasticity = songProfile?.elasticity ?? 0.6;

    for (let i = 0; i < this.numPoints; i++) {
      const t = i / (this.numPoints - 1);

      // ── Valor base de la waveform ──
      let targetValue = 0;
      if (waveform && waveform.length > 0) {
        const idx = Math.min(i, waveform.length - 1);
        targetValue = waveform[idx];
      }

      // ── Micro-breathing orgánico ──
      const breathRate = songProfile?.breathRate ?? 1;
      const breathAmp = 0.004 + energy * 0.010;
      const breath =
        Math.sin(breathPhase * breathRate + t * Math.PI * 3.5) * breathAmp +
        Math.sin(breathPhase * breathRate * 0.618 + t * Math.PI * 2.1) * breathAmp * 0.6;
      targetValue += breath;

      // ── Micro-vibraciones armónicas (PREMIUM) ──
      // Solo perceptibles en treble alto, observación atenta
      if (treble > 0.08) {
        const harmonicAmp = treble * 0.0025; // Extremadamente sutil
        const harmonic =
          Math.sin(this.harmonicPhase * 2 + t * Math.PI * 12) * harmonicAmp +
          Math.sin(this.harmonicPhase * 3 + t * Math.PI * 18) * harmonicAmp * 0.5;
        targetValue += harmonic;
      }

      // ── Imperfecciones orgánicas (Perlin simplificado) ──
      // Rompe la simetría perfecta — susurra vida
      const perlinIdx = ((t * 100 + this.perlinPhase * 30) % this.perlinSize + this.perlinSize) % this.perlinSize;
      const perlinIdx1 = Math.floor(perlinIdx);
      const perlinIdx2 = (perlinIdx1 + 1) % this.perlinSize;
      const perlinFrac = perlinIdx - perlinIdx1;
      const perlinValue = this.perlinTable[perlinIdx1] * (1 - perlinFrac) +
                          this.perlinTable[perlinIdx2] * perlinFrac;
      targetValue += perlinValue * 0.002;

      // ── Intención: anticipación ──
      // Cuando se detecta subida, la línea empuja suavemente hacia arriba
      if (intention && intention.anticipation > 0.05) {
        // Aplicar anticipación como una ola suave centrada
        const centerDist = Math.abs(t - 0.5) * 2; // 0 en centro, 1 en bordes
        const anticipationShape = Math.cos(centerDist * Math.PI * 0.5); // Más fuerte en el centro
        targetValue += intention.anticipation * anticipationShape * 0.015;
      }

      // ── Intención: frase vocal ──
      // La línea se eleva y acompaña durante una frase vocal sostenida
      if (intention && intention.vocalPhrase) {
        const vocalLift = Math.min(intention.vocalPhraseDuration * 0.0003, 0.012);
        const vocalShape = Math.sin(t * Math.PI); // Más elevación en el centro
        targetValue += vocalLift * vocalShape;
      }

      // ── Intención: silencio intencional ──
      // La línea no colapsa — queda suspendida, respirando
      if (intention && intention.intentionalSilence && intention.waitFactor > 0.1) {
        const suspensionHeight = intention.waitFactor * 0.008;
        const suspensionShape = Math.sin(t * Math.PI);
        targetValue += suspensionHeight * suspensionShape;
      }

      // ── Suavizado de display con elasticidad de la canción ──
      const displaySmoothing = (0.10 + energy * 0.14) * (0.7 + elasticity * 0.6);
      this.displayPoints[i] += (targetValue - this.displayPoints[i]) * displaySmoothing;
    }
  }

  /**
   * Dibuja la capa de glow — ahora respira orgánicamente con la tensión.
   */
  private drawGlowLayer(color: DynamicColor, intensity: number, breathPhase: number, tension: number): void {
    this.ctx.save();

    // Glow que respira — expande y contrae suavemente
    const breathMod = 1 + Math.sin(breathPhase * 0.7) * 0.15;
    const tensionGlow = tension * 0.15; // Alta tensión → más glow

    const glowBlur = (18 + intensity * 40 + tensionGlow * 20) * breathMod;
    const glowAlpha = 0.15 + intensity * 0.45 + tensionGlow * 0.1;
    const glowWidth = 2 + intensity * 5;

    this.ctx.shadowBlur = glowBlur;
    this.ctx.shadowColor = color.glow;
    this.ctx.lineWidth = glowWidth;
    this.ctx.strokeStyle = color.glow;
    this.ctx.globalAlpha = Math.min(glowAlpha, 0.7);

    this.drawCurveSimple();

    this.ctx.restore();
  }

  /**
   * Dibuja la línea principal con grosor emocional variable por punto.
   * Grosor depende de: intensidad global, curvatura local, tensión emocional.
   */
  private drawMainLine(color: DynamicColor, intensity: number, processed: ProcessedAudioData | null): void {
    this.ctx.save();

    const bass = processed?.bass ?? 0;
    const mid = processed?.mid ?? 0;
    const emotionalState = processed?.emotionalState;
    const songProfile = processed?.songProfile;
    const centerY = this.height / 2;

    // ── Amplitud emocional ──
    const profileAmp = songProfile?.baseAmplitude ?? 0.5;
    const tensionAmp = emotionalState ? emotionalState.tension * 0.04 : 0;
    const amplitudeScale = this.height * (0.20 + profileAmp * 0.06 + bass * 0.10 + mid * 0.06 + tensionAmp);

    // ── Grosor base dinámico ──
    const baseWidth = 1.2 + intensity * 3.5;
    const tensionWidth = emotionalState ? emotionalState.tension * 0.8 : 0;
    const targetWidth = baseWidth + tensionWidth;
    this.smoothLineWidth += (targetWidth - this.smoothLineWidth) * 0.08;

    // ── Gradiente a lo largo de la línea ──
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    const h = color.hue;
    const s = color.saturation;
    const l = color.lightness;

    gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, 0.05)`);
    gradient.addColorStop(0.1, `hsla(${h}, ${s}%, ${l}%, 0.6)`);
    gradient.addColorStop(0.3, `hsla(${h}, ${s}%, ${l}%, 0.95)`);
    gradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, 1)`);
    gradient.addColorStop(0.7, `hsla(${h}, ${s}%, ${l}%, 0.95)`);
    gradient.addColorStop(0.9, `hsla(${h}, ${s}%, ${l}%, 0.6)`);
    gradient.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0.05)`);

    this.ctx.strokeStyle = gradient;
    this.ctx.shadowBlur = 6 + intensity * 6;
    this.ctx.shadowColor = color.primary;

    // ── Dibujar con grosor variable por segmento ──
    // Puntos de inflexión (picos del ECG) → más gruesos
    // Zonas planas → más delgados
    this.drawCurveWithVariableWidth(amplitudeScale, centerY);

    this.ctx.restore();
  }

  /**
   * Flash visual en peaks — modulado por tensión acumulada.
   */
  private drawPeakFlash(color: DynamicColor, tension: number): void {
    this.ctx.save();

    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.max(this.width, this.height) * 0.45;

    // La intensidad del flash depende de la tensión acumulada
    const flashIntensity = 0.08 + tension * 0.06;

    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${flashIntensity.toFixed(2)})`);
    gradient.addColorStop(0.4, `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${(flashIntensity * 0.4).toFixed(2)})`);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Trail más visible en peaks (transición suave)
    this.trailTarget = 0.26 + tension * 0.06;

    this.ctx.restore();

    // Decay suave del trail target
    setTimeout(() => {
      this.trailTarget = 0.10 + (tension > 0.3 ? 0.04 : 0);
    }, 120);
  }

  /**
   * Dibuja la curva Bezier con grosor variable por segmento.
   * Curvatura local alta → segmento más grueso (puntos de inflexión visibles).
   * Zonas planas → más delgado (respiración visual).
   */
  private drawCurveWithVariableWidth(amplitudeScale: number, centerY: number): void {
    // Pre-calcular todas las posiciones Y
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < this.numPoints; i++) {
      positions.push({
        x: (i / (this.numPoints - 1)) * this.width,
        y: centerY + this.displayPoints[i] * amplitudeScale,
      });
    }

    // Pre-calcular curvatura local para cada punto
    const curvatures = new Float32Array(this.numPoints);
    for (let i = 1; i < this.numPoints - 1; i++) {
      // Curvatura aproximada = diferencia de segunda derivada
      const d1 = positions[i].y - positions[i - 1].y;
      const d2 = positions[i + 1].y - positions[i].y;
      curvatures[i] = Math.abs(d2 - d1);
    }

    // Normalizar curvaturas
    let maxCurv = 0;
    for (let i = 0; i < this.numPoints; i++) {
      if (curvatures[i] > maxCurv) maxCurv = curvatures[i];
    }
    if (maxCurv > 0) {
      for (let i = 0; i < this.numPoints; i++) {
        curvatures[i] /= maxCurv;
      }
    }

    // Dibujar segmentos con grosor variable
    // Usamos segmentos cortos de la curva Bezier, cada uno con su propio lineWidth
    const segmentSize = 4; // Cada 4 puntos, un segmento con grosor diferente
    for (let seg = 0; seg < this.numPoints - 1; seg += segmentSize) {
      const endSeg = Math.min(seg + segmentSize, this.numPoints - 1);

      // Curvatura promedio de este segmento
      let avgCurv = 0;
      for (let i = seg; i <= endSeg; i++) {
        avgCurv += curvatures[i];
      }
      avgCurv /= (endSeg - seg + 1);

      // Grosor: base + curvatura (puntos de inflexión más gruesos)
      const curvatureWidth = avgCurv * 1.2; // Max +1.2px por curvatura
      this.ctx.lineWidth = this.smoothLineWidth + curvatureWidth;

      this.ctx.beginPath();
      for (let i = seg; i <= endSeg; i++) {
        const { x, y } = positions[i];

        if (i === seg) {
          this.ctx.moveTo(x, y);
        } else {
          const prev = positions[i - 1];
          const cpX = (prev.x + x) / 2;
          this.ctx.bezierCurveTo(cpX, prev.y, cpX, y, x, y);
        }
      }
      this.ctx.stroke();
    }
  }

  /**
   * Dibuja la curva Bezier simple (para el glow, sin grosor variable).
   */
  private drawCurveSimple(): void {
    const centerY = this.height / 2;
    const amplitudeScale = this.height * 0.25;

    this.ctx.beginPath();

    for (let i = 0; i < this.numPoints; i++) {
      const x = (i / (this.numPoints - 1)) * this.width;
      const y = centerY + this.displayPoints[i] * amplitudeScale;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        const prevX = ((i - 1) / (this.numPoints - 1)) * this.width;
        const prevY = centerY + this.displayPoints[i - 1] * amplitudeScale;
        const cpX = (prevX + x) / 2;

        this.ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }

    this.ctx.stroke();
  }

  /**
   * Genera tabla Perlin simplificada para imperfecciones orgánicas.
   * Usa octavas de ruido sinusoidal con frecuencias irracionales.
   */
  private generatePerlinTable(): number[] {
    const table: number[] = [];
    for (let i = 0; i < this.perlinSize; i++) {
      const t = i / this.perlinSize;
      // Múltiples octavas con frecuencias irracionales (no se repiten visualmente)
      const v =
        Math.sin(t * Math.PI * 7.13) * 0.5 +
        Math.sin(t * Math.PI * 13.37) * 0.25 +
        Math.sin(t * Math.PI * 23.71) * 0.15 +
        Math.sin(t * Math.PI * 41.03) * 0.10;
      table.push(v);
    }
    return table;
  }

  /**
   * Devuelve el ColorEngine para acceso externo.
   */
  getColorEngine(): ColorEngine {
    return this.colorEngine;
  }

  /**
   * Limpia el canvas.
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
