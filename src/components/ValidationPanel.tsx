import { memo } from 'react';
import type { ValidationError } from '../types';
import { AlertTriangle } from 'lucide-react';

// --- UI-Kit Imports ---
import { Badge } from '../ui/Badge/Badge';
import { Island } from '../ui/Layout/Island';

interface ValidationPanelProps {
  errors: ValidationError[];
}

export const ValidationPanel = memo(({ errors }: ValidationPanelProps) => {
  if (errors.length === 0) return null;

  return (
    <Island className="validation-panel" flex={false}>
      <div className="validation-panel__header">
        <AlertTriangle size={20} />
        <span>Обнаружено проблем: {errors.length}</span>
      </div>
      <ul className="validation-panel__list">
        {errors.map((err, idx) => (
          <li key={`${err.fileId}-${err.type}-${idx}`} className="validation-panel__item">
            <Badge variant="danger" dot>{err.type}</Badge>
            <span className="validation-panel__message">{err.message}</span>
          </li>
        ))}
      </ul>
    </Island>
  );
});

ValidationPanel.displayName = 'ValidationPanel';
