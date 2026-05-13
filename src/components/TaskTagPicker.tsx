import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag } from 'lucide-react';
import type { TaskTag } from '../types';
import { TAG_COLOR_PRESETS } from '../types';
import { Button, Input, TagChip } from '../ui';

interface TaskTagPickerProps {
  selectedTags: TaskTag[];
  onChange: (tags: TaskTag[]) => void;
  addButtonLabel?: string;
  removeLabel?: string;
}

export function TaskTagPicker({
  selectedTags,
  onChange,
  addButtonLabel = 'Тег',
  removeLabel = 'Удалить тег',
}: TaskTagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLOR_PRESETS[0]);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>();
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const rect = root.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const nextLeft = Math.max(12, Math.min(rect.left, viewportWidth - 252));

      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: nextLeft,
        maxWidth: Math.max(240, viewportWidth - nextLeft - 12),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideRoot = rootRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideRoot && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAdd = () => {
    const name = newTagName.trim();

    if (!name) {
      return;
    }

    onChange([
      ...selectedTags,
      {
        id: crypto.randomUUID(),
        name,
        color: newTagColor,
      },
    ]);

    setNewTagName('');
    setNewTagColor(TAG_COLOR_PRESETS[0]);
    setIsOpen(false);
  };

  const dropdown = isOpen && dropdownStyle
    ? createPortal(
      <div ref={dropdownRef} className="tag-picker__dropdown" style={dropdownStyle}>
        <div className="tag-picker__dropdown-inner">
          <Input
            autoFocus
            placeholder="Название тега..."
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
              }
            }}
            fullWidth
          />

          <div className="tag-picker__colors">
            {TAG_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`tag-picker__color-dot ${newTagColor === color ? 'tag-picker__color-dot--active' : ''}`}
                style={{ background: color }}
                onClick={() => setNewTagColor(color)}
                aria-label={`Выбрать цвет ${color}`}
                title={color}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            disabled={!newTagName.trim()}
            fullWidth
          >
            Добавить
          </Button>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <div className="tag-picker" ref={rootRef}>
        <div className="tag-picker__selected">
          {selectedTags.map((tag) => (
            <TagChip
              key={tag.id}
              color={tag.color}
              removable
              removeLabel={removeLabel}
              onRemove={() => onChange(selectedTags.filter((item) => item.id !== tag.id))}
            >
              {tag.name}
            </TagChip>
          ))}

          <button
            type="button"
            className="tag-picker__add-btn"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <Tag size={12} />
            {addButtonLabel}
          </button>
        </div>
      </div>
      {dropdown}
    </>
  );
}
