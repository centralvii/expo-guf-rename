import { memo, useState } from 'react';
import { Braces, ChevronDown, Plus, X } from 'lucide-react';
import type { CustomVariable } from '../types';
import { Button, IconButton, Input, Island, TagChip } from '../ui';

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
  startNumber,
  onStartNumberChange,
}: Omit<MassActionsProps, 'fileCount'>) => {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('guf-vars-collapsed') === 'true');
  const toggleCollapsed = () => setCollapsed((prev) => { const next = !prev; localStorage.setItem('guf-vars-collapsed', String(next)); return next; });
  const [isAddingVar, setIsAddingVar] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarLabel, setNewVarLabel] = useState('');

  const activeVars = variables.filter((variable) => template.includes(`{${variable.key}}`));
  const inactiveVars = variables.filter((variable) => !template.includes(`{${variable.key}}`));

  const handleAddVariable = () => {
    const key = newVarKey.trim().replace(/[^a-zA-Z0-9_]/g, '');
    const label = newVarLabel.trim() || key;

    if (!key) {
      return;
    }

    onAddVariable(key, label);
    setNewVarKey('');
    setNewVarLabel('');
    setIsAddingVar(false);
  };

  const handleAddKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddVariable();
    }

    if (event.key === 'Escape') {
      setIsAddingVar(false);
    }
  };

  return (
    <Island className="mass-actions-card" flex={false}>
      <div className="collapsible-header" onClick={toggleCollapsed}>
        <h2><ChevronDown size={16} className={`chevron ${collapsed ? 'chevron--collapsed' : ''}`} /> <Braces size={18} /> Переменные шаблона</h2>
      </div>

      {!collapsed && (
        <div className="collapsible-body">
          {activeVars.length > 0 ? (
            <div className="mass-fields-grid">
              {activeVars.map((variable) => (
                <div key={variable.key} className="mass-field">
                  <div className="mass-field__header">
                    <TagChip mono>{`{${variable.key}}`}</TagChip>
                  </div>
                  <div className="mass-field__input-wrap">
                    <Input sizeVariant="sm" value={variable.value} onChange={(event) => onVariableChange(variable.key, event.target.value)} placeholder={variable.label} fullWidth noContainer />
                    <IconButton className="mass-field__remove" variant="ghost" size="sm" icon={<X size={12} />} label="Удалить переменную" onClick={() => onRemoveVariable(variable.key)} />
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
                {inactiveVars.map((variable) => (
                  <TagChip key={variable.key} className="mass-actions__inactive-tag" mono removable removeLabel="Удалить переменную" onRemove={() => onRemoveVariable(variable.key)}>
                    {`{${variable.key}}`}
                  </TagChip>
                ))}
              </div>
            </div>
          )}

          <div className="mass-actions__footer">
            <label className="start-number-label">
              Нумерация с:
              <Input sizeVariant="sm" type="number" min={0} value={startNumber} onChange={(event) => { const v = parseInt(event.target.value, 10); onStartNumberChange(Number.isFinite(v) ? v : 1); }} noContainer className="start-number-input" />
            </label>
            <div className="mass-actions__add-area">
              {isAddingVar ? (
                <div className="add-var-form">
                  <Input sizeVariant="sm" value={newVarKey} onChange={(event) => setNewVarKey(event.target.value)} onKeyDown={handleAddKeyDown} placeholder="Ключ (англ.)" autoFocus noContainer className="add-var-input" />
                  <Button variant="primary" size="sm" onClick={handleAddVariable} disabled={!newVarKey.trim()} icon={<Plus size={14} />} />
                  <Button variant="ghost" size="sm" onClick={() => setIsAddingVar(false)} icon={<X size={14} />} />
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setIsAddingVar(true)} icon={<Plus size={14} />}>Добавить переменную</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Island>
  );
});

MassActions.displayName = 'MassActions';
