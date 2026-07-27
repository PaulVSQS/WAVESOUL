import type { EnergyLevel, DynamicColor, EmotionalState, SongProfile } from '../types/audio';

/**
 * ColorEngine — Sistema de color neuro-emocional consciente.
 *
 * El color NO es decorativo. El color es emoción hecha luz.
 *
 * Ahora integra:
 *   - EmotionalState (memoria, tensión, momentum)
 *   - SongProfile (temperatura cromática por canción)
 *   - Histéresis de estado (transiciones basadas en estado emocional, no frames)
 *   - Glow orgánico (respira con el breathPhase)
 *   - Blending entre estados cercanos
 *
 * Paleta emocional:
 *   silence   → azul noche profundo (introspección, espacio)
 *   calm      → azul petróleo (respiración, presencia suave)
 *   groove    → esmeralda/teal (flow, equilibrio, ritmo corporal)
 *   elevation → dorado/ámbar (dopamina, subida, placer)
 *   vocal     → violeta/púrpura (emoción humana, cercanía)
 *   intensity → naranja/coral (energía física, impulso)
 *   climax    → carmín/magenta (pasión, poder contenido)
 */

interface ColorPalette {
  hue: number;
  saturation: number;
  lightness: number;
  glowIntensity: number;
}

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

  // Velocidades de interpolación base
  private readonly baseLerpHue = 0.06;
  private readonly baseLerpSat = 0.05;
  private readonly baseLerpLight = 0.05;
  private readonly baseLerpGlow = 0.06;
  private readonly peakLerpMultiplier = 3.5;

  // ── Estado anterior para blending ──
  private previousState: EnergyLevel = 'silence';
  private blendFactor = 0; // 0 = previous, 1 = current
  private readonly blendSpeed = 0.04;

  // ══════════════════════════════════════════════════════
  // CHROMATIC DRIFT — Deriva cromática continua
  // ══════════════════════════════════════════════════════
  // El color nunca se congela. Incluso dentro del mismo estado emocional,
  // oscila suavemente usando múltiples osciladores de baja frecuencia.

  /** Fase del oscilador primario de drift (período ~12s) */
  private driftPhase1 = 0;
  /** Fase del oscilador secundario de drift (período ~19s, irracional) */
  private driftPhase2 = 0;
  /** Fase del oscilador terciario de drift (período ~7s) */
  private driftPhase3 = 0;

  /** Hue acumulado del drift (separado del currentHue para no interferir) */
  private driftHue = 0;
  /** Temperatura dinámica por actividad vocal/melódica */
  private dynamicTemp = 0;
  /** Último mid para detectar cambios de textura */
  private prevMid = 0;
  /** Último treble para detectar transients agudos */
  private prevTreble = 0;
  /** Micro-impulso de hue por transient (decae rápido) */
  private transientHuePush = 0;

  /**
   * Actualiza el color con consciencia emocional y deriva cromática continua.
   * El color ahora nunca se congela — evoluciona incluso dentro del mismo estado.
   */
  update(
    energy: number,
    bass: number,
    mid: number,
    treble: number,
    isPeak: boolean,
    emotionalState?: EmotionalState,
    songProfile?: SongProfile,
    breathPhase?: number,
  ): DynamicColor {
    // ── Determinar estado emocional ──
    const level = emotionalState?.currentState
      ?? this.getEnergyLevel(energy, bass, mid, treble, isPeak);

    // ── Blending entre estados ──
    if (level !== this.previousState) {
      this.blendFactor = 0;
      this.previousState = level;
    }
    this.blendFactor = Math.min(1, this.blendFactor + this.blendSpeed);

    const target = PALETTES[level];

    // ── Velocidades de lerp moduladas por emoción ──
    const momentumMod = emotionalState
      ? 1 + Math.abs(emotionalState.momentum) * 0.5
      : 1;
    const mult = isPeak ? this.peakLerpMultiplier : momentumMod;

    const hueSpeed = this.baseLerpHue * mult;
    const satSpeed = this.baseLerpSat * mult;
    const lightSpeed = this.baseLerpLight * mult;
    const glowSpeed = this.baseLerpGlow * mult;

    // ── Temperatura cromática base por canción ──
    let targetHue = target.hue;
    if (songProfile) {
      const tempShift = songProfile.colorTemperature * 12;
      targetHue = (targetHue + tempShift + 360) % 360;
    }

    // ══════════════════════════════════════════════════════
    // CHROMATIC DRIFT — Deriva cromática continua
    // ══════════════════════════════════════════════════════

    // Avanzar los tres osciladores de drift con períodos distintos
    // Período 1: ~12s @ 60fps → velocidad = 2π / (12*60) ≈ 0.00873
    // Período 2: ~19s (irracional, usa φ=1.618) → 0.00873 / 1.618 ≈ 0.00539
    // Período 3: ~7s → 2π / (7*60) ≈ 0.01496
    this.driftPhase1 += 0.00873;
    this.driftPhase2 += 0.00539;
    this.driftPhase3 += 0.01496;

    // Drift compuesto: suma ponderada de los tres osciladores
    // Rango: ±7° de hue (nunca salta, nunca se aleja del target)
    const driftRaw =
      Math.sin(this.driftPhase1) * 4.0 +
      Math.sin(this.driftPhase2) * 2.0 +
      Math.sin(this.driftPhase3) * 1.0;

    // El drift se escala con la energía actual para ser más vivo en momentos activos
    const driftScale = 0.6 + energy * 0.6;
    const driftOffset = driftRaw * driftScale;

    // Suavizar el drift para evitar cambios bruscos
    this.driftHue += (driftOffset - this.driftHue) * 0.04;

    // ── Micro-transient: detección de cambios en mid y treble ──
    // Cuando hay un cambio de textura (nueva frase vocal, nuevo instrumento),
    // el hue recibe un micro-impulso que luego decae suavemente.
    const midDelta = mid - this.prevMid;
    const trebleDelta = treble - this.prevTreble;

    // Transient positivo en mid (nueva frase vocal/melódica)
    if (midDelta > 0.015) {
      // Empujar el hue hacia un tono ligeramente más cálido
      this.transientHuePush += midDelta * 8; // Máx ~3-4° impulso
    }
    // Transient en treble (aparición de brillo/instrumento agudo)
    if (trebleDelta > 0.02) {
      // Empujar hacia un tono ligeramente más frío/brillante
      this.transientHuePush -= trebleDelta * 5;
    }

    // Decay del impulso transient (decae en ~20 frames)
    this.transientHuePush *= 0.92;
    // Clampar para no salirse demasiado
    this.transientHuePush = Math.max(-6, Math.min(6, this.transientHuePush));

    this.prevMid = mid;
    this.prevTreble = treble;

    // ── Temperatura dinámica por actividad vocal ──
    // La actividad mid sostenida calienta levemente el color
    const vocalWarmth = mid * 3.5;
    const targetDynamicTemp = (mid > 0.18)
      ? vocalWarmth
      : -treble * 1.5; // Treble sin mid = enfriamiento suave
    this.dynamicTemp += (targetDynamicTemp - this.dynamicTemp) * 0.015;
    const dynamicTempShift = this.dynamicTemp * 3; // Máx ±~5°

    // ── Hue final: target + drift + transient + temp dinámica ──
    const enrichedTargetHue = (targetHue + this.driftHue + this.transientHuePush + dynamicTempShift + 360) % 360;

    // ── Interpolación ──
    this.currentHue = this.lerpHue(this.currentHue, enrichedTargetHue, hueSpeed);
    this.currentSaturation = this.lerp(this.currentSaturation, target.saturation, satSpeed);
    this.currentLightness = this.lerp(this.currentLightness, target.lightness, lightSpeed);
    this.currentGlow = this.lerp(this.currentGlow, target.glowIntensity, glowSpeed);

    // ── Modulación por tensión emocional ──
    let tensionBoost = 0;
    if (emotionalState) {
      tensionBoost = emotionalState.tension * 6;
      const tensionLight = emotionalState.tension * 3;
      this.currentLightness = this.lerp(
        this.currentLightness,
        this.currentLightness + tensionLight,
        0.05
      );
    }

    // ── Modulación sutil por treble ──
    const trebleBoost = treble * 4;
    const modulatedLightness = this.currentLightness + trebleBoost;

    // ── Modulación de saturación por energía + tensión ──
    const energyBoost = energy * 8 + tensionBoost;
    const modulatedSaturation = Math.min(this.currentSaturation + energyBoost, 90);

    // ── Modulación de blancos cálidos por aire (treble alto) ──
    const airFactor = Math.min(0.65, treble * 1.3);
    const targetAirHue = 35;
    const targetAirSat = 12;
    const targetAirLight = 86;

    const blendedHue = this.lerpHue(this.currentHue, targetAirHue, airFactor);
    const blendedSat = this.lerp(modulatedSaturation, targetAirSat, airFactor);
    const blendedLight = this.lerp(modulatedLightness, targetAirLight, airFactor);

    // ── Glow orgánico que respira ──
    let glowBreath = 1;
    if (breathPhase !== undefined) {
      glowBreath = 1 + Math.sin(breathPhase * 0.7) * 0.12;
    }

    // ── Emoción acumulada → más rica ──
    const accumulatedBoost = emotionalState
      ? emotionalState.accumulatedEmotion * 5
      : 0;

    const h = Math.round(blendedHue);
    const s = Math.round(Math.min(blendedSat + accumulatedBoost, 92));
    const l = Math.round(Math.min(blendedLight, 88));

    const glowValue = this.currentGlow * glowBreath;

    return {
      primary: `hsl(${h}, ${s}%, ${l}%)`,
      glow: `hsla(${h}, ${s}%, ${Math.min(l + 10, 92)}%, ${(glowValue * 0.7).toFixed(2)})`,
      background: `hsla(${h}, ${Math.round(s * 0.3)}%, ${Math.round(l * 0.12)}%, 0.4)`,
      hue: blendedHue,
      saturation: blendedSat + accumulatedBoost,
      lightness: blendedLight,
    };
  }

  /**
   * Determina el estado emocional (fallback sin EmotionalMemory).
   */
  getEnergyLevel(
    energy: number,
    bass: number,
    mid: number,
    treble: number,
    isPeak: boolean,
  ): EnergyLevel {
    if (energy < 0.03) return 'silence';
    if (energy < 0.10) return 'calm';

    const total = bass + mid + treble + 0.001;
    const bassDom = bass / total;
    const midDom = mid / total;

    if (isPeak && energy > 0.55) return 'climax';
    if (energy > 0.70) return 'climax';
    if (bassDom > 0.45 && energy > 0.35) return 'intensity';
    if (midDom > 0.40 && mid > 0.25) return 'vocal';
    if (energy > 0.30 && mid > 0.20) return 'elevation';
    if (energy > 0.12 && bass > 0.10) return 'groove';

    return 'calm';
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
   */
  private lerpHue(current: number, target: number, factor: number): number {
    let diff = target - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    let result = current + diff * factor;
    if (result < 0) result += 360;
    if (result >= 360) result -= 360;
    return result;
  }
}
