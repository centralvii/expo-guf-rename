import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { uploadPdfDocument } from '../../lib/pdfRepository';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../Modal';

interface PdfUploaderProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function PdfUploader({ onSuccess, onClose }: PdfUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { notify } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setName(selected.name.replace(/\.pdf$/i, ''));
      setStatus('idle');
      setProgress(0);
    } else if (selected) {
      notify('Пожалуйста, выберите PDF файл', 'error');
    }
  };

  const startSimulatedProgress = () => {
    setProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return 92;
        }
        // Slower progress as it gets closer to 90%
        const step = prev < 60 ? 5 : prev < 80 ? 2 : 0.5;
        return prev + step;
      });
    }, 200);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('uploading');
    startSimulatedProgress();

    try {
      await uploadPdfDocument(file, name.trim() || file.name);
      
      // Finish progress
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      setStatus('success');
      
      notify('Документ успешно загружен');
      
      // Delay closing to show success state
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (e) {
      console.error(e);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      notify('Ошибка при загрузке документа', 'error');
      setStatus('idle');
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={isUploading ? () => {} : onClose}
      title="Загрузка документа"
      icon={<Upload size={24} />}
      footer={
        status !== 'success' && (
          <>
            <button 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isUploading}
            >
              Отмена
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || isUploading}
              style={{ minWidth: '140px' }}
            >
              {isUploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {status === 'idle' ? (
          <>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'var(--accent-soft)' : 'var(--bg-muted)',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: 'var(--bg-card)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: file ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <Upload size={20} />
              </div>
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {file ? file.name : 'Выберите PDF файл'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Перетащите файл сюда или нажмите для обзора
                </p>
              </div>
            </div>

            {file && (
              <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Название в системе
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="template-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите название..."
                    style={{ width: '100%', paddingLeft: '38px' }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="anim-fade-in" style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ marginBottom: '24px', position: 'relative', display: 'inline-block' }}>
               {status === 'uploading' ? (
                 <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent)' }} />
               ) : (
                 <div style={{ color: 'var(--success)', animation: 'modal-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                   <CheckCircle2 size={48} />
                 </div>
               )}
            </div>
            
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              {status === 'uploading' ? 'Загружаем ваш файл...' : 'Готово!'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {status === 'uploading' ? `Пожалуйста, подождите. Файл "${file?.name}" отправляется в облако.` : 'Файл успешно сохранен в библиотеке.'}
            </p>

            <div style={{ 
              width: '100%', 
              height: '6px', 
              background: 'var(--bg-muted)', 
              borderRadius: '10px', 
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progress}%`,
                background: status === 'success' ? 'var(--success)' : 'var(--accent)',
                transition: 'width 0.3s ease-out',
                boxShadow: status === 'success' ? '0 0 12px var(--success-soft)' : '0 0 12px var(--accent-soft)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
               <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PROGRESS</span>
               <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(progress)}%</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
