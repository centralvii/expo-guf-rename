import { type ReactNode, useEffect, useState, memo } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../Button/Button';
import './Drawer.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export const Drawer = memo(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  width = '480px'
}: DrawerProps) => {
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
      }, 260);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`ui-drawer-overlay ${isClosing ? 'ui-drawer-overlay--closing' : ''}`}
      onClick={onClose}
    >
      <div 
        className={`ui-drawer ${isClosing ? 'ui-drawer--closing' : ''}`}
        style={{ width: `min(100%, ${width})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-drawer__header">
          <h2 className="ui-drawer__title">{title}</h2>
          <IconButton className="ui-drawer__close" variant="ghost" icon={<X size={20} />} label="Закрыть" onClick={onClose} />
        </div>

        <div className="ui-drawer__body custom-scrollbar">
          {children}
        </div>

        {footer && (
          <div className="ui-drawer__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

Drawer.displayName = 'Drawer';
