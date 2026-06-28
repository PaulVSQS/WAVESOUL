import { useState, useRef, useCallback } from 'react';

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  isHidden: boolean;
}

const ACCEPTED_FORMATS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
const ACCEPTED_MIME = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4'];

/**
 * AudioUploader — Zona de drag & drop con estética glassmorphism.
 */
export function AudioUploader({ onFileSelected, isHidden }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (ACCEPTED_MIME.some(mime => file.type.startsWith(mime.split('/')[0])) || 
        ACCEPTED_FORMATS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      onFileSelected(file);
    }
  }, [onFileSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      id="upload-zone"
      className={`upload-zone ${isDragging ? 'dragging' : ''} ${isHidden ? 'hidden' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Subir archivo de audio"
    >
      {/* Icono de onda sonora animada */}
      <div className="upload-icon">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="24" width="4" height="16" rx="2" fill="currentColor" opacity="0.5">
            <animate attributeName="height" values="16;28;16" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="y" values="24;18;24" dur="1.2s" repeatCount="indefinite" />
          </rect>
          <rect x="18" y="18" width="4" height="28" rx="2" fill="currentColor" opacity="0.7">
            <animate attributeName="height" values="28;12;28" dur="1s" repeatCount="indefinite" />
            <animate attributeName="y" values="18;26;18" dur="1s" repeatCount="indefinite" />
          </rect>
          <rect x="28" y="12" width="4" height="40" rx="2" fill="currentColor">
            <animate attributeName="height" values="40;20;40" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="y" values="12;22;12" dur="1.4s" repeatCount="indefinite" />
          </rect>
          <rect x="38" y="16" width="4" height="32" rx="2" fill="currentColor" opacity="0.7">
            <animate attributeName="height" values="32;14;32" dur="0.9s" repeatCount="indefinite" />
            <animate attributeName="y" values="16;25;16" dur="0.9s" repeatCount="indefinite" />
          </rect>
          <rect x="48" y="22" width="4" height="20" rx="2" fill="currentColor" opacity="0.5">
            <animate attributeName="height" values="20;30;20" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="y" values="22;17;22" dur="1.1s" repeatCount="indefinite" />
          </rect>
        </svg>
      </div>

      <h1 className="upload-title">Arrastra tu audio aquí</h1>
      <p className="upload-subtitle">
        o haz clic para seleccionar un archivo<br />
        y observa cómo cobra vida
      </p>

      <div className="upload-formats">
        {['MP3', 'WAV', 'OGG', 'FLAC'].map(fmt => (
          <span key={fmt} className="upload-format-tag">{fmt}</span>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FORMATS.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
}
