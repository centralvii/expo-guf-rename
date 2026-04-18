import { useMemo } from 'react';
import { type EditableField, EDITABLE_FIELDS } from '../types';
import { Layers, Hash } from 'lucide-react';

/** Теги, для которых можно создать форму ввода */
const TAG_TO_FIELD: Record<string, EditableField> = {
  '{prefix}': 'prefix',
  '{module}': 'module',
  '{code}': 'code',
  '{docNumber}': 'docNumber',
  '{custom1}': 'custom1',
  '{custom2}': 'custom2',
};

const FIELD_LABELS: Record<EditableField, string> = Object.fromEntries(
  EDITABLE_FIELDS.map((f) => [f.key, f.label])
) as Record<EditableField, string>;

interface MassActionsProps {
  template: string;
  /** Текущие «глобальные» значения редактируемых полей */
  fieldValues: Record<EditableField, string>;
  /** Callback при изменении любого поля — сразу применяется ко всем файлам */
  onFieldChange: (field: EditableField, value: string) => void;
  onAutoNumber: () => void;
  fileCount: number;
  startNumber: number;
  onStartNumberChange: (num: number) => void;
}

export function MassActions({
  template,
  fieldValues,
  onFieldChange,
  onAutoNumber,
  fileCount,
  startNumber,
  onStartNumberChange,
}: MassActionsProps) {
  // Определяем какие поля используются в текущем шаблоне
  const activeFields = useMemo(() => {
    const fields: { key: EditableField; label: string }[] = [];
    for (const [tag, fieldKey] of Object.entries(TAG_TO_FIELD)) {
      if (template.includes(tag)) {
        fields.push({ key: fieldKey, label: FIELD_LABELS[fieldKey] });
      }
    }
    return fields;
  }, [template]);

  return (
    <div className="mass-actions-card">
      <div className="mass-actions-card__header">
        <h2>
          <Layers size={18} />
          Заполнение полей
        </h2>
        <div className="mass-actions-card__right">
          <span className="file-counter">
            Файлов: <strong>{fileCount}</strong>
          </span>
        </div>
      </div>

      {activeFields.length > 0 ? (
        <div className="mass-fields-grid">
          {activeFields.map((f) => (
            <div key={f.key} className="mass-field">
              <label className="mass-field__label">{f.label}</label>
              <input
                type="text"
                className="mass-field__input"
                value={fieldValues[f.key]}
                onChange={(e) => onFieldChange(f.key, e.target.value)}
                placeholder={`Введите ${f.label.toLowerCase()}…`}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mass-actions__hint">
          Добавьте в шаблон теги вроде <code>{'{prefix}'}</code>, <code>{'{module}'}</code>, <code>{'{code}'}</code> — здесь появятся поля для заполнения.
        </p>
      )}

      <div className="mass-actions__footer">
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
  );
}
