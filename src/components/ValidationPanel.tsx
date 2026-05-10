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
    <Island className="validation-panel" flex={false} style={{ padding: '16px 20px', borderLeft: '4px solid var(--danger)' }}>
      <div className="validation-panel__header" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', fontWeight: 700, marginBottom: '12px' }}>
        <AlertTriangle size={20} />
        <span>Обнаружено проблем: {errors.length}</span>
      </div>
      <ul className="validation-panel__list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {errors.map((err, idx) => (
          <li key={`${err.fileId}-${err.type}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Badge variant="danger" dot>{err.type}</Badge>
            <span style={{ color: 'var(--text-secondary)' }}>{err.message}</span>
          </li>
        ))}
      </ul>
    </Island>
  );
});

ValidationPanel.displayName = 'ValidationPanel';
