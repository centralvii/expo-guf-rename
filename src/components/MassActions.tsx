import { useState } from 'react';
import type { CustomVariable } from '../types';
import { Layers, Plus, X, Variable } from 'lucide-react';

interface MassActionsProps {
  template: string;
  variables: CustomVariable[];
  onVariableChange: (key: string, value: string) => void;
  onAddVariable: (key: string, label: string) => void;
  onRemoveVariable: (key: string) => void;
  fileCount: number;
  startNumber: number;
  onStartNumberChange: (num: number) => void;
}

export function MassActions({
  template,
  variables,
  onVariableChange,
  onAddVariable,
  onRemoveVariable,
  fileCount,
  startNumber,
  onStartNumberChange,
}: MassActionsProps) {
  const [isAddingVar, setIsAddingVar] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');

  // Show only variables that are used in the template
  const activeVars = variables.filter((v) => template.includes(`{${v.key}}`));
  const inactiveVars = variables.filter((v) => !template.includes(`{${v.key}}`));

  const handleAddVariable = () => {
    const key = newVarKey.trim().replace(/[^a-zA-Z0-9_]/g, '');
    const label = newVarLabel.trim() || key;
    if (!key) return;
    onAddVariable(key, label);
    setNewVarKey('');
    setNewVarLabel('');
    setIsAddingVar(false);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddVariable();
    if (e.key === 'Escape') setIsAddingVar(false);
  };

  return (
    <div className="mass-actions-card">
      <div className="mass-actions-card__header">
        <h2>
          <Variable size={18} />
          Переменные шаблона
        </h2>
        <div className="mass-actions-card__right">
          <span className="file-counter">
            Файлов: <strong>{fileCount}</strong>
          </span>
        </div>
      </div>

      {activeVars.length > 0 ? (
        <div className="mass-fields-grid">
          {activeVars.map((v) => (
            <div key={v.key} className="mass-field">
              <div className="mass-field__header">
                <label className="mass-field__label">{v.label}</label>
                <span className="mass-field__tag">{`{${v.key}}`}</span>
              </div>
              <div className="mass-field__input-wrap">
                <input
                  type="text"
                  className="mass-field__input"
                  value={v.value}
                  onChange={(e) => onVariableChange(v.key, e.target.value)}
                  placeholder={`Значение для {${v.key}}`}
                />
                <button
                  className="mass-field__remove"
                  onClick={() => onRemoveVariable(v.key)}
                  title="Удалить переменную"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mass-actions__hint">
          Добавьте переменные и используйте их в шаблоне как <code>{'{имя}'}</code>.
          Например: <code>{'{prefix}'}</code>, <code>{'{author}'}</code>, <code>{'{version}'}</code>
        </p>
      )}

      {inactiveVars.length > 0 && (
        <div className="mass-actions__inactive">
          <span className="mass-actions__inactive-label">Не используются в шаблоне:</span>
          <div className="mass-actions__inactive-tags">
            {inactiveVars.map((v) => (
              <span key={v.key} className="mass-actions__inactive-tag" title={`Добавьте {${v.key}} в шаблон`}>
                {`{${v.key}}`}
                <button onClick={() => onRemoveVariable(v.key)} title="Удалить">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
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

        <div className="mass-actions__add-area">
          {isAddingVar ? (
            <div className="add-var-form">
              <input
                className="add-var-form__input"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Ключ (англ.)"
                autoFocus
              />
              <input
                className="add-var-form__input"
                value={newVarLabel}
                onChange={(e) => setNewVarLabel(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Название (опц.)"
              />
              <button className="btn btn--primary btn--sm" onClick={handleAddVariable} disabled={!newVarKey.trim()}>
                <Plus size={14} />
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setIsAddingVar(false)}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button className="btn btn--ghost btn--sm" onClick={() => setIsAddingVar(true)}>
              <Plus size={14} />
              Добавить переменную
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
