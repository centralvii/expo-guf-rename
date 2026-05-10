import { useCallback, useRef, useState } from 'react';
import { Upload, Archive, AlertCircle, FilePlus } from 'lucide-react';

interface FileUploaderProps {
  onZipLoaded: (file: File) => Promise<void>;
  onGufFilesAdded: (files: File[]) => void;
  isLoading: boolean;
  hasFiles: boolean;
}

export function FileUploader({ onZipLoaded, onGufFilesAdded, isLoading, hasFiles }: FileUploaderProps) {
  const zipInputRef = useRef<HTMLInputElement>(null);
  const gufInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- handlers ----------

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const arr = Array.from(files);

      const zips = arr.filter((f) => f.name.toLowerCase().endsWith('.zip'));
      const gufs = arr.filter((f) => f.name.toLowerCase().endsWith('.guf'));
      const other = arr.filter(
        (f) => !f.name.toLowerCase().endsWith('.zip') && !f.name.toLowerCase().endsWith('.guf')
      );

      if (other.length > 0) {
        setError(`Неподдерживаемые файлы: ${other.map((f) => f.name).join(', ')}. Принимаются только .zip и .guf`);
        return;
      }

      if (zips.length > 0 && gufs.length > 0) {
        setError('Нельзя смешивать ZIP-архив и .guf файлы в одной загрузке');
        return;
      }

      if (zips.length > 1) {
        setError('Выберите только один ZIP-архив');
        return;
      }

      if (zips.length === 1) {
        try {
          await onZipLoaded(zips[0]);
        } catch (err) {
          setError(
            err instanceof Error
              ? `Ошибка при чтении архива: ${err.message}`
              : 'Неизвестная ошибка при чтении архива'
          );
        }
        return;
      }

      if (gufs.length > 0) {
        onGufFilesAdded(gufs);
      }
    },
    [onZipLoaded, onGufFilesAdded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleZipInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) await handleFiles(files);
      if (zipInputRef.current) zipInputRef.current.value = '';
    },
    [handleFiles]
  );

  const handleGufInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) handleFiles(files);
      if (gufInputRef.current) gufInputRef.current.value = '';
    },
    [handleFiles]
  );

  // ---------- render ----------

  return (
    <div className="uploader-card">
      {/* Main drop zone */}
      <div
        className={`dropzone ${isDragOver ? 'dropzone--active' : ''} ${hasFiles ? 'dropzone--compact' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="region"
        aria-label="Зона загрузки файлов"
      >
        {/* Hidden inputs */}
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          onChange={handleZipInputChange}
          onClick={(e) => e.stopPropagation()}
          className="dropzone__input"
          style={{ display: 'none' }}
          aria-label="Загрузить ZIP-архив"
        />
        <input
          ref={gufInputRef}
          type="file"
          accept=".guf"
          multiple
          onChange={handleGufInputChange}
          onClick={(e) => e.stopPropagation()}
          className="dropzone__input"
          style={{ display: 'none' }}
          aria-label="Загрузить .guf файлы"
        />

        {isLoading ? (
          <div className="dropzone__loading">
            <div className="spinner" />
            <span>Обработка файлов…</span>
          </div>
        ) : hasFiles ? (
          /* Compact mode — two buttons side by side */
          <div className="uploader-compact-actions">
            <button
              type="button"
              className="uploader-action-btn"
              onClick={() => zipInputRef.current?.click()}
              title="Загрузить ZIP-архив (заменит список)"
            >
              <Archive size={16} />
              <span>Загрузить ZIP</span>
            </button>
            <div className="uploader-action-divider" />
            <button
              type="button"
              className="uploader-action-btn"
              onClick={() => gufInputRef.current?.click()}
              title="Добавить .guf файлы к существующим"
            >
              <FilePlus size={16} />
              <span>Добавить .guf</span>
            </button>
            <div className="uploader-action-divider" />
            <span className="uploader-drag-hint">или перетащите файлы</span>
          </div>
        ) : (
          /* Empty state — big upload zone with two action buttons */
          <>
            <div className="dropzone__icon">
              <Upload size={40} />
            </div>
            <div className="dropzone__text">
              <strong>Перетащите ZIP-архив или .guf файлы сюда</strong>
              <span>или выберите файлы ниже</span>
            </div>
            <div className="uploader-btn-row">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => zipInputRef.current?.click()}
              >
                <Archive size={16} />
                Выбрать ZIP
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => gufInputRef.current?.click()}
              >
                <FilePlus size={16} />
                Выбрать .guf файлы
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="uploader-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
