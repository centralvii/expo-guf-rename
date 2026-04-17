import { useCallback, useRef, useState } from 'react';
import { Upload, Archive, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (file: File) => Promise<void>;
  isLoading: boolean;
  hasFiles: boolean;
}

export function FileUploader({ onFileLoaded, isLoading, hasFiles }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Пожалуйста, загрузите файл в формате .zip');
        return;
      }
      try {
        await onFileLoaded(file);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Ошибка при чтении архива: ${err.message}`
            : 'Неизвестная ошибка при чтении архива'
        );
      }
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Сбрасываем input для повторной загрузки того же файла
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile]
  );

  return (
    <div className="uploader-card">
      <div
        className={`dropzone ${isDragOver ? 'dropzone--active' : ''} ${hasFiles ? 'dropzone--compact' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={handleInputChange}
          className="dropzone__input"
          aria-label="Загрузить ZIP-архив"
        />

        {isLoading ? (
          <div className="dropzone__loading">
            <div className="spinner" />
            <span>Распаковка архива…</span>
          </div>
        ) : (
          <>
            <div className="dropzone__icon">
              {hasFiles ? <Archive size={28} /> : <Upload size={40} />}
            </div>
            <div className="dropzone__text">
              {hasFiles ? (
                <span>Загрузить другой архив</span>
              ) : (
                <>
                  <strong>Перетащите ZIP-архив сюда</strong>
                  <span>или нажмите для выбора файла</span>
                </>
              )}
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
