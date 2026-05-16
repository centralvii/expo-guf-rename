import { useRef, memo, useState } from 'react';
import { BUILTIN_TAGS, type CustomVariable } from '../types';
import { ChevronDown, RotateCcw, Tag, Save, Bookmark, Upload, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Island, Modal } from '../ui';
import type { TemplatePreset } from '../hooks/useAppState';

interface TemplateEditorProps {
  template: string;
  variables: CustomVariable[];
  presets: TemplatePreset[];
  onChange: (tpl: string) => void;
  onReset: () => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  onLoadPreset: (id: string) => void;
}

export const TemplateEditor = memo(({ template, variables, presets, onChange, onReset, onSavePreset, onDeletePreset, onLoadPreset }: TemplateEditorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('guf-template-collapsed') === 'true');
  const toggleCollapsed = () => setCollapsed((prev) => { const next = !prev; localStorage.setItem('guf-template-collapsed', String(next)); return next; });
  const [showModal, setShowModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  const insertTag = (tag: string) => {
    const input = inputRef.current;
    if (!input) { onChange(template + tag); return; }
    const start = input.selectionStart ?? template.length;
    const end = input.selectionEnd ?? template.length;
    onChange(template.slice(0, start) + tag + template.slice(end));
    requestAnimationFrame(() => { const p = start + tag.length; input.setSelectionRange(p, p); input.focus(); });
  };

  const userTags = variables.map((v) => `{${v.key}}`);

  const handleSave = () => {
    if (!saveName.trim()) return;
    onSavePreset(saveName.trim());
    setSaveName('');
  };

  return (
    <Island className="template-card" flex={false}>
      <div className="collapsible-header" onClick={toggleCollapsed}>
        <h2><ChevronDown size={16} className={`chevron ${collapsed ? 'chevron--collapsed' : ''}`} /> <Tag size={18} /> Шаблон переименования</h2>
        <div className="template-card__actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" icon={<Bookmark size={14} />} onClick={() => setShowModal(true)}>
            Пресеты {presets.length > 0 && <span style={{ marginLeft: 6 }}><Badge variant="accent">{presets.length}</Badge></span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} icon={<RotateCcw size={14} />}>Сбросить</Button>
        </div>
      </div>

      {!collapsed && (
        <div className="collapsible-body">
          <Input ref={inputRef} value={template} onChange={(e) => onChange(e.target.value)} placeholder="Введите шаблон переименования..." spellCheck={false} fullWidth style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }} />

          <div className="template-tags">
            <span className="template-tags__label">Системные:</span>
            <div className="template-tags__list">
              {BUILTIN_TAGS.map((tag) => (
                <Button key={tag} variant="ghost" size="sm" className="tag-btn" onClick={() => insertTag(tag)}>{tag}</Button>
              ))}
            </div>
          </div>

          {userTags.length > 0 && (
            <div className="template-tags">
              <span className="template-tags__label">Переменные:</span>
              <div className="template-tags__list">
                {userTags.map((tag) => (
                  <Button key={tag} variant="ghost" size="sm" className={`tag-btn tag-btn--user ${template.includes(tag) ? 'tag-btn--active' : ''}`} onClick={() => insertTag(tag)}>{tag}</Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Пресеты шаблонов">
        <div className="preset-modal">
          <div className="preset-modal__save">
            <Input sizeVariant="sm" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Название пресета..." noContainer fullWidth onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} />
            <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSave} disabled={!saveName.trim()}>Сохранить</Button>
          </div>
          <div className="preset-modal__list">
            {presets.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Нет сохранённых пресетов</p>}
            {presets.map((p) => (
              <div key={p.id} className="preset-modal__item">
                <div className="preset-modal__item-info">
                  <span className="preset-modal__item-name">{p.name}</span>
                  <span className="preset-modal__item-date">{new Date(p.updatedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="preset-modal__item-actions">
                  <Button variant="secondary" size="sm" icon={<Upload size={13} />} onClick={() => { onLoadPreset(p.id); setShowModal(false); }}>Загрузить</Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => onDeletePreset(p.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </Island>
  );
});

TemplateEditor.displayName = 'TemplateEditor';