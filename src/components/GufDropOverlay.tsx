import { memo } from 'react';
import { Upload } from 'lucide-react';

interface GufDropOverlayProps {
  show: boolean;
}

const GufDropOverlay = memo(({ show }: GufDropOverlayProps) => {
  if (!show) return null;

  return (
    <div className="guf-drop-overlay" role="status" aria-live="polite">
      <div className="guf-drop-overlay__inner">
        <div className="guf-drop-overlay__icon">
          <Upload size={48} strokeWidth={1.5} />
        </div>
        <div className="guf-drop-overlay__title">Отпустите файлы для загрузки</div>
        <div className="guf-drop-overlay__hint">Поддерживаются .zip и .guf</div>
      </div>
    </div>
  );
});

GufDropOverlay.displayName = 'GufDropOverlay';

export { GufDropOverlay };
