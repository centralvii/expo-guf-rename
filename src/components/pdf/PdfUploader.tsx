import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadPdfDocument } from '../../lib/pdfRepository';
import { useToast } from '../../hooks/useToast';

interface PdfUploaderProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function PdfUploader({ onSuccess, onClose }: PdfUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setName(selected.name.replace(/\.pdf$/i, ''));
    } else if (selected) {
      notify('Пожалуйста, выберите PDF файл', 'error');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadPdfDocument(file, name.trim() || file.name);
      notify('Документ успешно загружен');
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      notify('Ошибка при загрузке документа', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '450px',
        padding: '24px',
        position: 'relative',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Загрузить PDF</h2>

        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '20px',
            background: file ? 'var(--accent-soft)' : 'transparent',
            transition: 'all 0.2s'
          }}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
          <Upload size={32} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {file ? file.name : 'Нажмите для выбора PDF'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Максимальный размер: 50MB
          </p>
        </div>

        {file && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
              Название документа
            </label>
            <input 
              type="text" 
              className="template-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название..."
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1 }} 
            onClick={onClose}
            disabled={isUploading}
          >
            Отмена
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 2 }}
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <><Loader2 size={16} className="animate-spin" /> Загрузка...</>
            ) : 'Загрузить в систему'}
          </button>
        </div>
      </div>
    </div>
  );
}
