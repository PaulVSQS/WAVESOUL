import type { SongProfile } from '../types/audio';

/**
 * SongProfiler — Genera un ADN visual único para cada canción.
 *
 * Analiza los primeros ~5 segundos (300 frames @ 60fps) para establecer
 * el carácter base, luego sigue adaptándose con decay muy lento.
 *
 * Cada canción produce un perfil distinto que afecta:
 *   - Elasticidad de la línea
 *   - Amplitud base
 *   - Velocidad de reacción
 *   - Temperatura cromática
 *   - Velocidad de respiración
 *
 * La misma visualización se comporta distinto con cada canción,
 * sin presets manuales.
 */
export class SongProfiler {
  // ── Datos de calibración ──
  private calibrationFrames = 0;
  private readonly calibrationPeriod = 300; // ~5 segundos @ 60fps

  // ── Acumuladores para estadísticas ──
  private energySum = 0;
  private energySumSq = 0; // Para varianza
  private bassSum = 0;
  private midSum = 0;
  private trebleSum = 0;
  private energyMin = 1;
  private energyMax = 0;

  // ── Perfil actual (se estabiliza tras calibración) ──
  private profile: SongProfile = {
    elasticity: 0.6,
    baseAmplitude: 0.5,
    reactionSpeed: 1.0,
    colorTemperature: 0,
    breathRate: 1.0,
    dynamicRange: 0.5,
    vocalRatio: 0.5,
    isCalibrated: false,
  };

  // ── Adaptación rolling post-calibración ──
  private readonly rollingAdaptRate = 0.003; // Muy lento después de calibrar

  /**
   * Alimentar con datos de cada frame.
   * Durante calibración: acumula estadísticas.
   * Post-calibración: adaptación rolling muy lenta.
   */
  update(energy: number, bass: number, mid: number, treble: number): SongProfile {
    this.calibrationFrames++;

    // ── Fase de calibración ──
    if (this.calibrationFrames <= this.calibrationPeriod) {
      this.energySum += energy;
      this.energySumSq += energy * energy;
      this.bassSum += bass;
      this.midSum += mid;
      this.trebleSum += treble;
      this.energyMin = Math.min(this.energyMin, energy);
      this.energyMax = Math.max(this.energyMax, energy);

      // Calcular perfil parcial (mejora a medida que tenemos más datos)
      if (this.calibrationFrames > 30) { // Mínimo 0.5 segundos
        this.computeProfile();
      }

      // Marcar como calibrado al final del período
      if (this.calibrationFrames === this.calibrationPeriod) {
        this.computeProfile();
        this.profile.isCalibrated = true;
      }

      return { ...this.profile };
    }

    // ── Post-calibración: adaptación rolling ──
    this.adaptRolling(energy, bass, mid, treble);

    return { ...this.profile };
  }

  /**
   * Calcula el perfil basado en las estadísticas acumuladas.
   */
  private computeProfile(): void {
    const n = this.calibrationFrames;
    const avgEnergy = this.energySum / n;
    const avgBass = this.bassSum / n;
    const avgMid = this.midSum / n;
    const avgTreble = this.trebleSum / n;

    // Varianza de energía
    const variance = (this.energySumSq / n) - (avgEnergy * avgEnergy);
    const stdDev = Math.sqrt(Math.max(0, variance));

    // ── Rango dinámico ──
    // Alto = mucha diferencia entre suave y fuerte
    this.profile.dynamicRange = this.clamp(
      (this.energyMax - this.energyMin) * 1.5 + stdDev * 2,
      0, 1
    );

    // ── Ratio vocal vs rítmico ──
    // Mid domina → vocal, Bass domina → rítmico
    const total = avgBass + avgMid + avgTreble + 0.001;
    this.profile.vocalRatio = this.clamp(avgMid / total * 2, 0, 1);

    // ── Elasticidad ──
    // Alta energía + alta varianza → alta elasticidad (EDM, Rock)
    // Baja energía + baja varianza → baja elasticidad (Ambient, Classical)
    this.profile.elasticity = this.clamp(
      0.3 + avgEnergy * 0.4 + stdDev * 1.5,
      0.25, 1.0
    );

    // ── Amplitud base ──
    // Adaptar al "nivel de mar" de la canción
    this.profile.baseAmplitude = this.clamp(
      0.3 + avgEnergy * 0.5,
      0.2, 0.8
    );

    // ── Velocidad de reacción ──
    // Canciones con alta variabilidad → reacción más rápida
    this.profile.reactionSpeed = this.clamp(
      0.5 + stdDev * 3 + this.profile.dynamicRange * 0.5,
      0.4, 1.5
    );

    // ── Temperatura cromática ──
    // Mid/vocal alto → cálido (soul, pop)
    // Treble alto + bass bajo → frío (ambient, electrónica suave)
    // Bass alto → neutro-cálido (ritmo, groove)
    const warmth = avgMid * 1.5 + avgBass * 0.5 - avgTreble * 0.8;
    this.profile.colorTemperature = this.clamp(warmth * 2, -1, 1);

    // ── Velocidad de respiración ──
    // Canciones lentas/ambient → respiración lenta
    // Canciones energéticas → respiración más rápida
    this.profile.breathRate = this.clamp(
      0.6 + avgEnergy * 0.8 + this.profile.elasticity * 0.3,
      0.4, 1.5
    );
  }

  /**
   * Adaptación rolling post-calibración.
   * Ajusta el perfil muy lentamente basado en cómo evoluciona la canción.
   */
  private adaptRolling(energy: number, bass: number, mid: number, treble: number): void {
    const rate = this.rollingAdaptRate;

    // Actualizar promedios con EMA muy lento
    const avgEnergy = this.energySum / Math.min(this.calibrationFrames, this.calibrationPeriod);
    const newAvgEnergy = avgEnergy + (energy - avgEnergy) * rate;

    // Solo ajustar elasticidad y reactionSpeed suavemente
    const targetElasticity = this.clamp(
      0.3 + newAvgEnergy * 0.4 + this.profile.dynamicRange * 0.3,
      0.25, 1.0
    );
    this.profile.elasticity += (targetElasticity - this.profile.elasticity) * rate;

    // Temperatura cromática se adapta muy lentamente
    const total = bass + mid + treble + 0.001;
    const currentVocalRatio = mid / total;
    const warmth = currentVocalRatio * 1.5 + (bass / total) * 0.5 - (treble / total) * 0.8;
    const targetTemp = this.clamp(warmth * 2, -1, 1);
    this.profile.colorTemperature += (targetTemp - this.profile.colorTemperature) * rate * 0.5;
  }

  /**
   * Devuelve el perfil actual sin actualizar.
   */
  getProfile(): SongProfile {
    return { ...this.profile };
  }

  /**
   * Devuelve un perfil de silencio/por defecto.
   */
  silence(): SongProfile {
    return { ...this.profile };
  }

  /**
   * Reset completo — al cargar nueva canción.
   */
  reset(): void {
    this.calibrationFrames = 0;
    this.energySum = 0;
    this.energySumSq = 0;
    this.bassSum = 0;
    this.midSum = 0;
    this.trebleSum = 0;
    this.energyMin = 1;
    this.energyMax = 0;
    this.profile = {
      elasticity: 0.6,
      baseAmplitude: 0.5,
      reactionSpeed: 1.0,
      colorTemperature: 0,
      breathRate: 1.0,
      dynamicRange: 0.5,
      vocalRatio: 0.5,
      isCalibrated: false,
    };
  }

  private clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
  }
}
