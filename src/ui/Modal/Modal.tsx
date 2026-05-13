import { type ReactNode, useEffect, useState, memo } from 'react';
import { X, AlertCircle, Info } from 'lucide-react';
import { IconButton } from '../Button/Button';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'primary' | 'danger';
  icon?: ReactNode;
}

export const Modal = memo(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  variant = 'primary',
  icon 
}: ModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        document.body.style.overflow = 'unset';
      }, 200);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`modal-overlay ${isClosing ? 'modal-overlay--closing' : ''}`}
      onClick={onClose}
    >
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton className="modal-card__close" variant="ghost" icon={<X size={18} />} label="Закрыть" onClick={onClose} />

        <div className="modal-header">
          <div className={`modal-icon modal-icon--${variant}`}>
            {icon || (variant === 'danger' ? <AlertCircle size={24} /> : <Info size={24} />)}
          </div>
          <h2 className="modal-title">{title}</h2>
        </div>

        <div className="modal-body custom-scrollbar">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';
