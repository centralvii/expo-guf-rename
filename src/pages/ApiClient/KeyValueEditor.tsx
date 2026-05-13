import { memo, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ApiKeyValue } from '../../types';
import { Button, Checkbox, IconButton, Input } from '../../ui';

interface KeyValueEditorProps {
  items: ApiKeyValue[];
  onChange: (next: ApiKeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  emptyMessage?: string;
}

export const KeyValueEditor = memo(function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Ключ',
  valuePlaceholder = 'Значение',
  emptyMessage = 'Нет записей',
}: KeyValueEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), key: '', value: '', enabled: true },
    ]);
  }, [items, onChange]);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<ApiKeyValue>) => {
      onChange(items.map((it) => (it.id === id ? { ...it, ...updates } : it)));
    },
    [items, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(items.filter((it) => it.id !== id));
    },
    [items, onChange]
  );

  return (
    <div className="kv-editor">
      <div className="kv-editor__header">
        <span className="kv-editor__title">
          {items.length === 0 ? emptyMessage : `Записей: ${items.length}`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus size={14} />}
          onClick={handleAdd}
        >
          Добавить
        </Button>
      </div>

      {items.length > 0 && (
        <div className="kv-editor__list">
          {items.map((item) => (
            <div key={item.id} className="kv-editor__row">
              <Checkbox
                className="kv-editor__checkbox"
                checked={item.enabled}
                onChange={(e) => handleUpdate(item.id, { enabled: e.target.checked })}
                title={item.enabled ? 'Активно' : 'Отключено'}
              />
              <Input
                value={item.key}
                onChange={(e) => handleUpdate(item.id, { key: e.target.value })}
                placeholder={keyPlaceholder}
                noContainer
                fullWidth
              />
              <Input
                value={item.value}
                onChange={(e) => handleUpdate(item.id, { value: e.target.value })}
                placeholder={valuePlaceholder}
                noContainer
                fullWidth
              />
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                label="Удалить"
                onClick={() => handleRemove(item.id)}
                className="kv-editor__remove"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
