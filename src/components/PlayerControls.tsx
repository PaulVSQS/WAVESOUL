import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioPlayerState, AudioControls } from '../types/audio';

interface PlayerControlsProps {
  playerState: AudioPlayerState;
  controls: AudioControls;
}

/**
 * Formatea segundos a mm:ss
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * PlayerControls — Barra de controles flotante y minimalista.
 * Se auto-oculta después de 3s de inactividad.
 */
export function PlayerControls({ playerState, controls }: PlayerControlsProps) {
  const [isHidden, setIsHidden] = useState(false);
  const hideTimerRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isPlaying, currentTime, duration, volume, fileName } = playerState;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Auto-hide logic
  const resetHideTimer = useCallback(() => {
    setIsHidden(false);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (isPlaying) setIsHidden(true);
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    const handleMouseMove = () => resetHideTimer();
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  // Seek en la barra de progreso
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    controls.seek(ratio * duration);
  }, [controls, duration]);

  // Volume
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    controls.setVolume(parseFloat(e.target.value));
  }, [controls]);

  const toggleMute = useCallback(() => {
    controls.setVolume(volume > 0 ? 0 : 0.8);
  }, [controls, volume]);

  if (!playerState.isLoaded) return null;

  return (
    <div
      ref={containerRef}
      className={`player-controls ${isHidden ? 'auto-hidden' : ''}`}
      onMouseEnter={resetHideTimer}
      id="player-controls"
    >
      {/* Play / Pause */}
      <button
        className="btn-play"
        onClick={controls.togglePlay}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        id="btn-play-pause"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress */}
      <div className="progress-container">
        <span className="progress-time">{formatTime(currentTime)}</span>
        <div
          className="progress-bar"
          onClick={handleProgressClick}
          role="slider"
          aria-label="Progreso de audio"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          id="progress-bar"
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-time">{formatTime(duration)}</span>
      </div>

      {/* Volume */}
      <div className="volume-container">
        <button
          className="btn-volume"
          onClick={toggleMute}
          aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'}
          id="btn-volume"
        >
          {volume === 0 ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : volume < 0.5 ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
          aria-label="Volumen"
          id="volume-slider"
        />
      </div>

      {/* File name */}
      {fileName && <span className="file-name" title={fileName}>{fileName}</span>}
    </div>
  );
}
