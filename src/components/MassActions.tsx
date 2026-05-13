import { useState, memo } from 'react';
import type { CustomVariable } from '../types';
import { Plus, X, Braces } from 'lucide-react';

// --- UI-Kit Imports ---
import { Button, IconButton, Input, Island } from '../ui';

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

export const MassActions = memo(({
  template,
  variables,
  onVariableChange,
  onAddVariable,
  onRemoveVariable,
  fileCount,
  startNumber,
  onStartNumberChange,
}: MassActionsProps) => {
  const [isAddingVar, setIsAddingVar] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');

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
    <Island className="mass-actions-card" flex={false}>
      <div className="mass-actions-card__header">
        <h2>
          <Braces size={18} />
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
                <Input
                  value={v.value}
                  onChange={(e) => onVariableChange(v.key, e.target.value)}
                  placeholder={`Значение для {${v.key}}`}
                  fullWidth
                  noContainer
                />
                <IconButton
                  className="mass-field__remove"
                  variant="ghost"
                  size="sm"
                  icon={<X size={12} />}
                  label="Удалить переменную"
                  onClick={() => onRemoveVariable(v.key)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mass-actions__hint">
          Добавьте переменные и используйте их в шаблоне как <code>{'{имя}'}</code>.
        </p>
      )}

      {inactiveVars.length > 0 && (
        <div className="mass-actions__inactive">
          <span className="mass-actions__inactive-label">Не используются:</span>
          <div className="mass-actions__inactive-tags">
            {inactiveVars.map((v) => (
              <span key={v.key} className="mass-actions__inactive-tag">
                {`{${v.key}}`}
                <IconButton variant="ghost" size="sm" icon={<X size={10} />} label="Удалить переменную" onClick={() => onRemoveVariable(v.key)} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mass-actions__footer">
        <label className="start-number-label">
          Нумерация с:
          <Input
            type="number"
            min={0}
            value={startNumber}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onStartNumberChange(Number.isFinite(val) ? val : 1);
            }}
            noContainer
            className="start-number-input"
          />
        </label>

        <div className="mass-actions__add-area">
          {isAddingVar ? (
            <div className="add-var-form">
              <Input
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Ключ (англ.)"
                autoFocus
                noContainer
                className="add-var-input"
              />
              <Button variant="primary" size="sm" onClick={handleAddVariable} disabled={!newVarKey.trim()} icon={<Plus size={14} />} />
              <Button variant="ghost" size="sm" onClick={() => setIsAddingVar(false)} icon={<X size={14} />} />
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIsAddingVar(true)} icon={<Plus size={14} />}>
              Добавить переменную
            </Button>
          )}
        </div>
      </div>
    </Island>
  );
});

MassActions.displayName = 'MassActions';
