import { useState } from 'react';
import { type EditableField, EDITABLE_FIELDS } from '../types';
import { Layers, Hash } from 'lucide-react';

interface MassActionsProps {
  onMassUpdate: (field: EditableField, value: string) => void;
  onAutoNumber: () => void;
  fileCount: number;
  startNumber: number;
  onStartNumberChange: (num: number) => void;
}

export function MassActions({
  onMassUpdate,
  onAutoNumber,
  fileCount,
  startNumber,
  onStartNumberChange,
}: MassActionsProps) {
  const [selectedField, setSelectedField] = useState<EditableField>('prefix');
  const [massValue, setMassValue] = useState('');

  const handleApply = () => {
    onMassUpdate(selectedField, massValue);
  };

  return (
    <div className="mass-actions-card">
      <div className="mass-actions-card__header">
        <h2>
          <Layers size={18} />
          Массовые действия
        </h2>
        <span className="file-counter">
          Файлов: <strong>{fileCount}</strong>
        </span>
      </div>

      <div className="mass-actions__row">
        <div className="mass-actions__group">
          <select
            className="mass-select"
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value as EditableField)}
          >
            {EDITABLE_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="mass-input"
            value={massValue}
            onChange={(e) => setMassValue(e.target.value)}
            placeholder="Значение для всех строк…"
          />
          <button className="btn btn--primary" onClick={handleApply}>
            Применить ко всем
          </button>
        </div>

        <div className="mass-actions__group mass-actions__group--compact">
          <label className="start-number-label">
            Нумерация с:
            <input
              type="number"
              className="start-number-input"
              min={0}
              value={startNumber}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onStartNumberChange(Number.isFinite(val) ? val : 1);
              }}
            />
          </label>

          <button className="btn btn--secondary" onClick={onAutoNumber}>
            <Hash size={14} />
            Порядковые номера
          </button>
        </div>
      </div>
    </div>
  );
}
