import type { ProcessedAudioData, DynamicColor } from '../types/audio';
import { ColorEngine } from './ColorEngine';

/**
 * WavelineRenderer — Dibuja la línea ECG reactiva en Canvas 2D.
 * 
 * Diseñado para arte visual emocional, no para representación técnica.
 * Consume ProcessedAudioData (ya comprimido y suavizado) del DynamicsProcessor.
 * 
 * Capas visuales (de fondo a frente):
 *   1. Trail (estela persistente)
 *   2. Glow layer (halo difuso)
 *   3. Main line (curva Bezier con gradiente)
 *   4. Peak flash (destello sutil en beats)
 */
export class WavelineRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colorEngine: ColorEngine;
  private width = 0;
  private height = 0;
  private dpr = 1;

  // Estado de la línea — todos los puntos ya vienen pre-procesados
  private displayPoints: number[] = [];
  private readonly numPoints = 200;
  private trailOpacity = 0.12;
  private trailTarget = 0.12;

  // Idle breathing phase (propio del renderer, para cuando no hay audio)
  private localBreathPhase = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.colorEngine = new ColorEngine();
    this.resize();

    // Inicializar puntos en línea recta
    for (let i = 0; i < this.numPoints; i++) {
      this.displayPoints.push(0);
    }
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
   * Recibe ProcessedAudioData — datos ya comprimidos y seguros.
   */
  draw(processed: ProcessedAudioData | null): DynamicColor {
    // Suavizar trail opacity (no saltar)
    this.trailOpacity += (this.trailTarget - this.trailOpacity) * 0.08;

    // Limpiar con trail (no completamente transparente para efecto estela)
    this.ctx.fillStyle = `rgba(10, 10, 15, ${1 - this.trailOpacity})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Usar energía procesada (ya comprimida y acotada 0-1)
    const energy = processed?.energy ?? 0;
    const isPeak = processed?.isPeak ?? false;
    const intensity = processed?.intensity ?? 0;

    // Actualizar colores basados en energía procesada
    const color = this.colorEngine.update(energy, isPeak);

    // Actualizar puntos de la línea
    this.updatePoints(processed);

    // Dibujar capas de la línea (de fondo a primer plano)
    this.drawGlowLayer(color, intensity);
    this.drawMainLine(color, intensity);

    // Flash sutil en peaks
    if (isPeak) {
      this.drawPeakFlash(color);
    }

    // Incrementar breathing local
    this.localBreathPhase += 0.008;

    return color;
  }

  /**
   * Actualiza los puntos de la línea.
   * La waveform del ProcessedAudioData ya viene suavizada y limitada.
   * Solo necesitamos interpolar los display points para suavidad extra.
   */
  private updatePoints(processed: ProcessedAudioData | null): void {
    const waveform = processed?.waveform;
    const energy = processed?.energy ?? 0;
    const breathPhase = processed?.breathPhase ?? this.localBreathPhase;

    for (let i = 0; i < this.numPoints; i++) {
      const t = i / (this.numPoints - 1);

      // Valor de la waveform procesada (ya comprimida y limitada)
      let targetValue = 0;
      if (waveform && waveform.length > 0) {
        // La waveform tiene el mismo número de puntos
        const idx = Math.min(i, waveform.length - 1);
        targetValue = waveform[idx];
      }

      // Añadir micro-breathing orgánico (siempre presente)
      // Usa el breathPhase del procesador para sincronización
      const breathAmp = 0.003 + energy * 0.005;
      const breath =
        Math.sin(breathPhase + t * Math.PI * 3.5) * breathAmp +
        Math.sin(breathPhase * 0.618 + t * Math.PI * 2.1) * breathAmp * 0.6;
      targetValue += breath;

      // Suavizado de display: interpolación suave hacia el target
      // Factor bajo = movimiento MUY fluido, orgánico
      const displaySmoothing = 0.10 + energy * 0.12;
      this.displayPoints[i] += (targetValue - this.displayPoints[i]) * displaySmoothing;
    }
  }

  /**
   * Dibuja la capa de glow difusa (fondo de la línea).
   * Intensidad controlada por intensity (0-1, ya comprimida).
   */
  private drawGlowLayer(color: DynamicColor, intensity: number): void {
    this.ctx.save();

    // Glow proporcional a la intensidad pero con techo
    const glowBlur = 20 + intensity * 25;
    const glowAlpha = 0.2 + intensity * 0.3;
    const glowWidth = 3 + intensity * 3;

    this.ctx.shadowBlur = glowBlur;
    this.ctx.shadowColor = color.glow;
    this.ctx.lineWidth = glowWidth;
    this.ctx.strokeStyle = color.glow;
    this.ctx.globalAlpha = glowAlpha;

    this.drawCurve();

    this.ctx.restore();
  }

  /**
   * Dibuja la línea principal con gradiente y grosor dinámico.
   * Grosor controlado por intensity (0-1, ya comprimida).
   */
  private drawMainLine(color: DynamicColor, intensity: number): void {
    this.ctx.save();

    // Grosor dinámico: más gruesa con más intensidad pero con techo
    const baseWidth = 1.5 + intensity * 2.5;
    this.ctx.lineWidth = baseWidth;

    // Gradiente a lo largo de la línea
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

    this.drawCurve();

    this.ctx.restore();
  }

  /**
   * Flash visual cuando se detecta un peak/beat.
   * Sutil y elegante — no explosivo.
   */
  private drawPeakFlash(color: DynamicColor): void {
    this.ctx.save();

    // Radial gradient flash sutil desde el centro
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.max(this.width, this.height) * 0.4;

    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, 0.06)`);
    gradient.addColorStop(0.4, `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, 0.02)`);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Trail ligeramente más visible en peaks (transición suave)
    this.trailTarget = 0.22;

    this.ctx.restore();

    // Decay suave del trail target
    setTimeout(() => {
      this.trailTarget = 0.12;
    }, 80);
  }

  /**
   * Dibuja la curva Bezier cúbica suavizada.
   * amplitudeScale controlado: la waveform ya viene limitada a ±0.8
   * por el DynamicsProcessor, así que amplitudeScale es solo un escalador visual.
   */
  private drawCurve(): void {
    const centerY = this.height / 2;
    // La waveform procesada ya está en rango ±0.8 (soft-clipped)
    // Multiplicar por height * 0.18 da un máximo visual de ±14.4% de la pantalla
    // Esto es elegante y nunca desborda
    const amplitudeScale = this.height * 0.18;

    this.ctx.beginPath();

    for (let i = 0; i < this.numPoints; i++) {
      const x = (i / (this.numPoints - 1)) * this.width;
      const y = centerY + this.displayPoints[i] * amplitudeScale;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        // Curva Bezier cúbica para suavidad
        const prevX = ((i - 1) / (this.numPoints - 1)) * this.width;
        const prevY = centerY + this.displayPoints[i - 1] * amplitudeScale;
        const cpX = (prevX + x) / 2;

        this.ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }

    this.ctx.stroke();
  }

  /**
   * Devuelve el ColorEngine para acceso externo (ej: fondo 3D).
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
