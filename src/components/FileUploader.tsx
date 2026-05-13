import { useCallback, useRef, useState, memo } from 'react';
import { Upload, Archive, AlertCircle, FilePlus, Loader2 } from 'lucide-react';

// --- UI-Kit Imports ---
import { Button } from '../ui/Button/Button';
import { Island } from '../ui/Layout/Island';

interface FileUploaderProps {
  onZipLoaded: (file: File) => Promise<void>;
  onGufFilesAdded: (files: File[]) => void;
  isLoading: boolean;
  hasFiles: boolean;
}

export const FileUploader = memo(({ onZipLoaded, onGufFilesAdded, isLoading, hasFiles }: FileUploaderProps) => {
  const zipInputRef = useRef<HTMLInputElement>(null);
  const gufInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(`Неподдерживаемые файлы: ${other.map((f) => f.name).join(', ')}`);
        return;
      }

      if (zips.length > 0 && gufs.length > 0) {
        setError('Нельзя смешивать ZIP и .guf в одной загрузке');
        return;
      }

      if (zips.length > 1) {
        setError('Выберите только один ZIP-архив');
        return;
      }

      if (zips.length === 1) {
        try {
          await onZipLoaded(zips[0]);
        } catch {
          setError('Ошибка при чтении архива');
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

  return (
    <Island className="uploader-card" flex={false}>
      <div
        className={`dropzone ${isDragOver ? 'dropzone--active' : ''} ${hasFiles ? 'dropzone--compact' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          onChange={handleZipInputChange}
          style={{ display: 'none' }}
        />
        <input
          ref={gufInputRef}
          type="file"
          accept=".guf"
          multiple
          onChange={handleGufInputChange}
          style={{ display: 'none' }}
        />

        {isLoading ? (
          <div className="dropzone__loading">
            <Loader2 className="animate-spin" size={24} />
            <span>Обработка файлов…</span>
          </div>
        ) : hasFiles ? (
          <div className="uploader-compact-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => zipInputRef.current?.click()}
              icon={<Archive size={16} />}
            >
              Заменить ZIP
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => gufInputRef.current?.click()}
              icon={<FilePlus size={16} />}
            >
              Добавить .guf
            </Button>
            <div className="uploader-action-divider" />
            <span className="uploader-drag-hint">или перетащите файлы</span>
          </div>
        ) : (
          <>
            <div className="dropzone__icon">
              <Upload size={40} />
            </div>
            <div className="dropzone__text">
              <strong>Перетащите ZIP-архив или .guf файлы сюда</strong>
              <span>или выберите файлы ниже</span>
            </div>
            <div className="uploader-btn-row">
              <Button
                variant="secondary"
                onClick={() => zipInputRef.current?.click()}
                icon={<Archive size={16} />}
              >
                Выбрать ZIP
              </Button>
              <Button
                variant="secondary"
                onClick={() => gufInputRef.current?.click()}
                icon={<FilePlus size={16} />}
              >
                Выбрать .guf
              </Button>
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
    </Island>
  );
});

FileUploader.displayName = 'FileUploader';
