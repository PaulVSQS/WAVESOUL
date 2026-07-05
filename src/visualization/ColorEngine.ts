import type { EnergyLevel, DynamicColor } from '../types/audio';

/**
 * ColorEngine — Sistema de color neuro-emocional basado en bandas.
 *
 * El color NO es decorativo. El color es emoción hecha luz.
 *
 * Determina el estado emocional combinando energía total con la dominancia
 * relativa de bass, mid y treble. Cada estado mapea a una zona cromática
 * curada con intención emocional.
 *
 * Pipeline:
 *   1. Calcular dominancias de banda (qué componente domina)
 *   2. Determinar estado emocional (no solo "cuánta" energía, sino "qué tipo")
 *   3. Interpolar suavemente hacia la paleta target
 *   4. Generar color compuesto (primary, glow, background)
 */

interface ColorPalette {
  hue: number;
  saturation: number;
  lightness: number;
  glowIntensity: number;
}

/**
 * Paleta emocional de 7 zonas.
 * Cada zona mapea una situación musical real, no un número abstracto.
 *
 *   silence   → azul noche profundo (introspección, espacio)
 *   calm      → azul petróleo (respiración, presencia suave)
 *   groove    → esmeralda/teal (flow, equilibrio, ritmo corporal)
 *   elevation → dorado/ámbar (dopamina, subida, placer)
 *   vocal     → violeta/púrpura (emoción humana, cercanía)
 *   intensity → naranja/coral (energía física, impulso)
 *   climax    → carmín/magenta (pasión, poder contenido)
 */
const PALETTES: Record<EnergyLevel, ColorPalette> = {
  silence:   { hue: 215, saturation: 20, lightness: 35, glowIntensity: 0.08 },
  calm:      { hue: 200, saturation: 40, lightness: 45, glowIntensity: 0.18 },
  groove:    { hue: 160, saturation: 55, lightness: 48, glowIntensity: 0.35 },
  elevation: { hue: 45,  saturation: 65, lightness: 55, glowIntensity: 0.55 },
  vocal:     { hue: 280, saturation: 58, lightness: 52, glowIntensity: 0.50 },
  intensity: { hue: 20,  saturation: 70, lightness: 52, glowIntensity: 0.70 },
  climax:    { hue: 340, saturation: 75, lightness: 50, glowIntensity: 0.90 },
};

export class ColorEngine {
  private currentHue = 215;
  private currentSaturation = 20;
  private currentLightness = 35;
  private currentGlow = 0.08;

  // Velocidades de interpolación (separadas para control fino)
  private readonly baseLerpHue = 0.06;
  private readonly baseLerpSat = 0.05;
  private readonly baseLerpLight = 0.05;
  private readonly baseLerpGlow = 0.06;
  private readonly peakLerpMultiplier = 3.5; // En peaks, lerp 3.5x más rápido

  /**
   * Determina el estado emocional basado en bandas de frecuencia.
   *
   * No es solo "cuánta energía hay", sino "qué tipo de energía":
   *   - Bass domina → groove / intensity
   *   - Mid domina → vocal / elevation
   *   - Todo junto alto → climax
   *   - Poco de todo → silence / calm
   */
  getEnergyLevel(
    energy: number,
    bass: number,
    mid: number,
    treble: number,
    isPeak: boolean,
  ): EnergyLevel {
    // ── Silencio / calma ──
    if (energy < 0.03) return 'silence';
    if (energy < 0.10) return 'calm';

    // ── Calcular dominancias relativas ──
    const total = bass + mid + treble + 0.001; // Evitar div/0
    const bassDom = bass / total;
    const midDom = mid / total;

    // ── Clímax: energía alta + peak o energía muy alta ──
    if (isPeak && energy > 0.55) return 'climax';
    if (energy > 0.70) return 'climax';

    // ── Intensidad rítmica: bass domina claramente con energía media-alta ──
    if (bassDom > 0.45 && energy > 0.35) return 'intensity';

    // ── Voz emotiva: mid domina con presencia clara ──
    if (midDom > 0.40 && mid > 0.25) return 'vocal';

    // ── Elevación emocional: energía media con mid presente (subida) ──
    if (energy > 0.30 && mid > 0.20) return 'elevation';

    // ── Groove estable: bass + ritmo con energía moderada ──
    if (energy > 0.12 && bass > 0.10) return 'groove';

    return 'calm';
  }

  /**
   * Actualiza el color con interpolación suave hacia el target emocional.
   * Llamar cada frame.
   *
   * Ahora recibe bandas separadas para determinar la emoción, no solo energía escalar.
   */
  update(
    energy: number,
    bass: number,
    mid: number,
    treble: number,
    isPeak: boolean,
  ): DynamicColor {
    const level = this.getEnergyLevel(energy, bass, mid, treble, isPeak);
    const target = PALETTES[level];

    // ── Velocidades de lerp ──
    // Peaks aceleran la transición (el cambio se siente inmediato pero suave)
    const mult = isPeak ? this.peakLerpMultiplier : 1.0;
    const hueSpeed = this.baseLerpHue * mult;
    const satSpeed = this.baseLerpSat * mult;
    const lightSpeed = this.baseLerpLight * mult;
    const glowSpeed = this.baseLerpGlow * mult;

    // ── Interpolación ──
    // Hue usa interpolación circular (camino más corto en el círculo cromático)
    this.currentHue = this.lerpHue(this.currentHue, target.hue, hueSpeed);
    this.currentSaturation = this.lerp(this.currentSaturation, target.saturation, satSpeed);
    this.currentLightness = this.lerp(this.currentLightness, target.lightness, lightSpeed);
    this.currentGlow = this.lerp(this.currentGlow, target.glowIntensity, glowSpeed);

    // ── Modulación sutil por treble (brillo etéreo) ──
    // Treble alto → lightness ligeramente más alta, como luz que resplandece
    const trebleBoost = treble * 4; // Sutil: max +4% lightness
    const modulatedLightness = this.currentLightness + trebleBoost;

    // ── Modulación de saturación por energía ──
    // Más energía → colores más vivos (pero controlado)
    const energyBoost = energy * 8; // Max +8% saturation
    const modulatedSaturation = Math.min(this.currentSaturation + energyBoost, 90);

    const h = Math.round(this.currentHue);
    const s = Math.round(modulatedSaturation);
    const l = Math.round(Math.min(modulatedLightness, 70)); // Ceiling de lightness

    return {
      primary: `hsl(${h}, ${s}%, ${l}%)`,
      glow: `hsla(${h}, ${s}%, ${Math.min(l + 10, 75)}%, ${(this.currentGlow * 0.7).toFixed(2)})`,
      background: `hsla(${h}, ${Math.round(s * 0.3)}%, ${Math.round(l * 0.12)}%, 0.4)`,
      hue: this.currentHue,
      saturation: modulatedSaturation,
      lightness: modulatedLightness,
    };
  }

  /**
   * Devuelve el color actual sin actualizarlo.
   */
  getCurrent(): DynamicColor {
    const h = Math.round(this.currentHue);
    const s = Math.round(this.currentSaturation);
    const l = Math.round(this.currentLightness);
    return {
      primary: `hsl(${h}, ${s}%, ${l}%)`,
      glow: `hsla(${h}, ${s}%, ${l}%, ${(this.currentGlow * 0.7).toFixed(2)})`,
      background: `hsla(${h}, ${Math.round(s * 0.3)}%, ${Math.round(l * 0.12)}%, 0.4)`,
      hue: this.currentHue,
      saturation: this.currentSaturation,
      lightness: this.currentLightness,
    };
  }

  /**
   * Interpolación lineal.
   */
  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  /**
   * Interpolación circular para valores de hue (0-360).
   * Toma el camino más corto alrededor del círculo cromático.
   */
  private lerpHue(current: number, target: number, factor: number): number {
    let diff = target - current;
    // Tomar el camino más corto alrededor del círculo
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    let result = current + diff * factor;
    if (result < 0) result += 360;
    if (result >= 360) result -= 360;
    return result;
  }
}
