import type { EnergyLevel, DynamicColor } from '../types/audio';

/**
 * ColorEngine — Sistema de color emocional dinámico.
 * Genera paletas de color basadas en la energía del audio.
 */

interface ColorPalette {
  hue: number;
  saturation: number;
  lightness: number;
  glowIntensity: number;
}

const PALETTES: Record<EnergyLevel, ColorPalette> = {
  silence:  { hue: 220, saturation: 15, lightness: 40, glowIntensity: 0.1 },
  calm:     { hue: 210, saturation: 35, lightness: 50, glowIntensity: 0.2 },
  low:      { hue: 200, saturation: 50, lightness: 55, glowIntensity: 0.3 },
  medium:   { hue: 270, saturation: 60, lightness: 58, glowIntensity: 0.5 },
  high:     { hue: 310, saturation: 75, lightness: 55, glowIntensity: 0.7 },
  peak:     { hue: 350, saturation: 85, lightness: 58, glowIntensity: 1.0 },
};

export class ColorEngine {
  private currentHue = 220;
  private currentSaturation = 15;
  private currentLightness = 40;
  private currentGlow = 0.1;
  private lerpSpeed = 0.04; // Velocidad de interpolación (más bajo = más suave)

  /**
   * Determina el nivel de energía basado en valores de análisis.
   */
  getEnergyLevel(totalEnergy: number, isPeak: boolean): EnergyLevel {
    if (isPeak) return 'peak';
    if (totalEnergy < 0.02) return 'silence';
    if (totalEnergy < 0.08) return 'calm';
    if (totalEnergy < 0.2) return 'low';
    if (totalEnergy < 0.45) return 'medium';
    return 'high';
  }

  /**
   * Actualiza el color con interpolación suave hacia el target.
   * Llamar cada frame.
   */
  update(totalEnergy: number, isPeak: boolean): DynamicColor {
    const level = this.getEnergyLevel(totalEnergy, isPeak);
    const target = PALETTES[level];

    // Lerp más rápido para peaks, más lento para transiciones suaves
    const speed = isPeak ? 0.15 : this.lerpSpeed;

    // Interpolación circular para hue (evita ir de 350 a 10 pasando por 180)
    this.currentHue = this.lerpHue(this.currentHue, target.hue, speed);
    this.currentSaturation = this.lerp(this.currentSaturation, target.saturation, speed);
    this.currentLightness = this.lerp(this.currentLightness, target.lightness, speed);
    this.currentGlow = this.lerp(this.currentGlow, target.glowIntensity, speed);

    const h = Math.round(this.currentHue);
    const s = Math.round(this.currentSaturation);
    const l = Math.round(this.currentLightness);

    return {
      primary: `hsl(${h}, ${s}%, ${l}%)`,
      glow: `hsla(${h}, ${s}%, ${l}%, ${(this.currentGlow * 0.6).toFixed(2)})`,
      background: `hsla(${h}, ${Math.round(s * 0.3)}%, ${Math.round(l * 0.15)}%, 0.4)`,
      hue: this.currentHue,
      saturation: this.currentSaturation,
      lightness: this.currentLightness,
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
      glow: `hsla(${h}, ${s}%, ${l}%, ${(this.currentGlow * 0.6).toFixed(2)})`,
      background: `hsla(${h}, ${Math.round(s * 0.3)}%, ${Math.round(l * 0.15)}%, 0.4)`,
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
