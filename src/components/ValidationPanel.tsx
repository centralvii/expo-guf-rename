import type { ValidationError } from '../types';
import { AlertTriangle, XCircle, Copy, FileWarning } from 'lucide-react';

interface ValidationPanelProps {
  errors: ValidationError[];
}

const ICON_MAP = {
  empty: <XCircle size={14} />,
  duplicate: <Copy size={14} />,
  forbidden_chars: <AlertTriangle size={14} />,
  no_extension: <FileWarning size={14} />,
};

export function ValidationPanel({ errors }: ValidationPanelProps) {
  if (errors.length === 0) return null;

  return (
    <div className="validation-panel">
      <div className="validation-panel__header">
        <AlertTriangle size={18} />
        <span>
          Найдено ошибок: <strong>{errors.length}</strong>
        </span>
      </div>
      <ul className="validation-panel__list">
        {errors.map((err, idx) => (
          <li key={`${err.fileId}-${err.type}-${idx}`} className={`validation-item validation-item--${err.type}`}>
            {ICON_MAP[err.type]}
            <span>{err.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
