import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Copy, Download, Edit2, Save, Trash2, Plus,
  Flame, ArrowUp, ArrowRight, ArrowDown, Circle, Clock, GitPullRequest,
  CheckCircle2, XCircle, Tag, X, ChevronUp, ChevronDown, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import type { TaskItem, TaskSection, TaskPriority, TaskStatus, TaskTag } from '../types';
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TAG_COLOR_PRESETS
} from '../types';

// --- UI-Kit Imports ---
import { Button } from '../ui/Button/Button';
import { Input } from '../ui/Input/Input';
import { Textarea } from '../ui/Input/Textarea';
import { Toolbar } from '../ui/Toolbar/Toolbar';
import { Island } from '../ui/Layout/Island';
import { Modal } from '../ui/Modal/Modal';
import { Badge } from '../ui/Badge/Badge';

const PRIORITY_ICONS: Record<TaskPriority, React.ReactNode> = {
  critical: <Flame size={12} />,
  high: <ArrowUp size={12} />,
  medium: <ArrowRight size={12} />,
  low: <ArrowDown size={12} />,
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#6b7280',
};

const PRIORITY_BADGE_VARIANTS: Record<TaskPriority, any> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  open: <Circle size={12} />,
  in_progress: <Clock size={12} />,
  review: <GitPullRequest size={12} />,
  done: <CheckCircle2 size={12} />,
  closed: <XCircle size={12} />,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: '#6b7280',
  in_progress: '#3b82f6',
  review: '#a855f7',
  done: '#22c55e',
  closed: '#374151',
};

const STATUS_BADGE_VARIANTS: Record<TaskStatus, any> = {
  open: 'default',
  in_progress: 'accent',
  review: 'warning',
  done: 'success',
  closed: 'default',
};

function taskToMarkdown(task: TaskItem): string {
  const lines = [`# ${task.title}`];
  if (task.description.trim()) lines.push('', task.description.trim());
  if (task.tags?.length > 0) lines.push('', `**Теги:** ${task.tags.map((t) => t.name).join(', ')}`);
  task.sections.forEach((section) => {
    lines.push('', `## ${section.title}`);
    lines.push('', section.content.trim() || '*Пусто*');
  });
  return `${lines.join('\n').trim()}\n`;
}

function createMarkdownFilename(title: string): string {
  const normalizedTitle = title.trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-');
  return `${normalizedTitle || 'task-helper-item'}.md`;
}

/* ---- Tag picker (inline) ---- */
interface TagPickerProps {
  selectedTags: TaskTag[];
  onChange: (tags: TaskTag[]) => void;
}

function TagPicker({ selectedTags, onChange }: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLOR_PRESETS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAdd = () => {
    if (!newTagName.trim()) return;
    const newTag: TaskTag = { id: crypto.randomUUID(), name: newTagName.trim(), color: newTagColor };
    onChange([...selectedTags, newTag]);
    setNewTagName('');
    setNewTagColor(TAG_COLOR_PRESETS[0]);
    setIsOpen(false);
  };

  return (
    <div className="tag-picker" ref={ref}>
      <div className="tag-picker__selected">
        {selectedTags.map((tag) => (
          <span key={tag.id} className="task-tag" style={{ '--tag-color': tag.color } as React.CSSProperties}>
            {tag.name}
            <button type="button" onClick={() => onChange(selectedTags.filter((t) => t.id !== tag.id))} className="task-tag__remove">
              <X size={10} />
            </button>
          </span>
        ))}
        <button type="button" className="tag-picker__add-btn" onClick={() => setIsOpen(!isOpen)}>
          <Tag size={12} /> Тег
        </button>
      </div>
      {isOpen && (
        <div className="tag-picker__dropdown">
          <div className="tag-picker__dropdown-inner">
            <Input
              autoFocus
              placeholder="Название тега..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              fullWidth
            />
            <div className="tag-picker__colors" style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
              {TAG_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`tag-picker__color-dot ${newTagColor === color ? 'tag-picker__color-dot--active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setNewTagColor(color)}
                />
              ))}
            </div>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newTagName.trim()} fullWidth>
              Добавить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type EditDraft = {
  title: string;
  description: string;
  sections: TaskSection[];
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];
};

function getDraftKey(taskId: string) { return `task-draft:${taskId}`; }
function loadDraft(taskId: string): EditDraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(taskId));
    return raw ? (JSON.parse(raw) as EditDraft) : null;
  } catch { return null; }
}
function saveDraft(taskId: string, draft: EditDraft) {
  try { localStorage.setItem(getDraftKey(taskId), JSON.stringify(draft)); } catch { }
}
function clearDraft(taskId: string) { localStorage.removeItem(getDraftKey(taskId)); }

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isLoaded, error, getTask, updateTask, deleteTask } = useTasks();

  const task = taskId ? getTask(taskId) : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [hasDraftWarning, setHasDraftWarning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSections, setEditSections] = useState<TaskSection[]>([]);
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('open');
  const [editTags, setEditTags] = useState<TaskTag[]>([]);

  const skipNextDraftSave = useRef(false);

  useEffect(() => {
    if (!isEditing || !taskId) return;
    if (skipNextDraftSave.current) { skipNextDraftSave.current = false; return; }
    const draft: EditDraft = { title: editTitle, description: editDesc, sections: editSections, priority: editPriority, status: editStatus, tags: editTags };
    saveDraft(taskId, draft);
  }, [isEditing, taskId, editTitle, editDesc, editSections, editPriority, editStatus, editTags]);

  if (!isLoaded) {
    return (
      <div className="tool-page">
        <div className="app-restore">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)', opacity: 0.5 }} />
          <span style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Загрузка задачи...</span>
        </div>
      </div>
    );
  }
  if (error) return <div className="page-loading">{error}</div>;
  if (!task) return <div className="page-loading">Задача не найдена или удалена</div>;

  const markdown = taskToMarkdown(task);

  const handleStartEditing = () => {
    if (!taskId) return;
    const draft = loadDraft(taskId);
    if (draft) {
      setEditTitle(draft.title);
      setEditDesc(draft.description);
      setEditSections(draft.sections);
      setEditPriority(draft.priority);
      setEditStatus(draft.status);
      setEditTags(draft.tags);
      setHasDraftWarning(true);
    } else {
      setEditTitle(task.title);
      setEditDesc(task.description);
      setEditSections(task.sections);
      setEditPriority(task.priority ?? 'medium');
      setEditStatus(task.status ?? 'open');
      setEditTags(task.tags ?? []);
      setHasDraftWarning(false);
    }
    setIsEditing(true);
  };

  const handleDiscardDraft = () => {
    if (!taskId) return;
    clearDraft(taskId);
    skipNextDraftSave.current = true;
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditSections(task.sections);
    setEditPriority(task.priority ?? 'medium');
    setEditStatus(task.status ?? 'open');
    setEditTags(task.tags ?? []);
    setHasDraftWarning(false);
    // Остаемся в режиме редактирования, просто сбрасываем данные к оригиналу
  };

  const handleCopyMarkdown = async () => {
    try { await navigator.clipboard.writeText(markdown); notify('Markdown скопирован'); }
    catch (e) { notify('Не удалось скопировать', 'error'); }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = createMarkdownFilename(task.title);
    link.click();
    URL.revokeObjectURL(url);
    notify('Файл скачан');
  };

  const handleSave = async () => {
    if (!taskId) return;
    try {
      await updateTask(taskId, { title: editTitle, description: editDesc, sections: editSections, priority: editPriority, status: editStatus, tags: editTags });
      clearDraft(taskId);
      setIsEditing(false);
      setHasDraftWarning(false);
      notify('Изменения сохранены');
    } catch (e) { notify('Ошибка сохранения', 'error'); }
  };

  const handleConfirmDelete = async () => {
    if (!taskId) return;
    try {
      setIsDeleting(true);
      await deleteTask(taskId);
      notify('Задача удалена', 'error');
      setShowDeleteModal(false);
      navigate('/task-helper');
    } catch (e) { notify('Ошибка удаления', 'error'); setIsDeleting(false); }
  };

  const updateSection = (id: string, updates: Partial<TaskSection>) => {
    setEditSections(editSections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">

        <Toolbar>
          <Toolbar.Left>
            <Button variant="secondary" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/task-helper')}>
              Назад
            </Button>
            <Toolbar.Divider />
            {!isEditing && <span style={{ fontSize: '15px', fontWeight: 700 }}>Просмотр задачи</span>}
            {isEditing && <span style={{ fontSize: '15px', fontWeight: 700 }}>Редактирование</span>}
          </Toolbar.Left>

          <Toolbar.Right>
            {!isEditing && (
              <>
                <Button variant="secondary" size="sm" icon={<Copy size={16} />} onClick={handleCopyMarkdown} title="Копировать Markdown" />
                <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={handleDownloadMarkdown} title="Скачать Markdown" />
                <Toolbar.Divider />
                <Button variant="secondary" size="sm" icon={<Edit2 size={16} />} onClick={handleStartEditing}>
                  Редактировать
                </Button>
                <Button variant="danger" size="sm" icon={<Trash2 size={16} />} onClick={() => setShowDeleteModal(true)} />
              </>
            )}
            {isEditing && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>Отмена</Button>
                <Button variant="primary" size="sm" icon={<Save size={16} />} onClick={handleSave}>
                  Сохранить
                </Button>
              </>
            )}
          </Toolbar.Right>
        </Toolbar>

        <Island flex={false} style={{ padding: '24px' }}>
          {isEditing && hasDraftWarning && (
            <div className="draft-warning" style={{ marginBottom: '20px' }}>
              <AlertTriangle size={15} />
              <span>Восстановлены несохранённые изменения</span>
              <button className="draft-warning__discard" onClick={handleDiscardDraft}>Сбросить</button>
            </div>
          )}

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input label="Название" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} fullWidth />
              <Textarea label="Описание" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} fullWidth />
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                <div className="form-group">
                  <label className="ui-label">Приоритет</label>
                  <div className="select-group" style={{ marginTop: '8px' }}>
                    {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                      <button key={p} type="button" className={`select-chip ${editPriority === p ? 'select-chip--active' : ''}`} style={{ '--chip-color': PRIORITY_COLORS[p] } as React.CSSProperties} onClick={() => setEditPriority(p)}>
                        {PRIORITY_ICONS[p]} {TASK_PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="ui-label">Статус</label>
                  <div className="select-group" style={{ marginTop: '8px' }}>
                    {(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((s) => (
                      <button key={s} type="button" className={`select-chip ${editStatus === s ? 'select-chip--active' : ''}`} style={{ '--chip-color': STATUS_COLORS[s] } as React.CSSProperties} onClick={() => setEditStatus(s)}>
                        {STATUS_ICONS[s]} {TASK_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="ui-label">Теги</label>
                <div style={{ marginTop: '8px' }}><TagPicker selectedTags={editTags} onChange={setEditTags} /></div>
              </div>
            </div>
          ) : (
            <div className="task-detail__header" style={{ marginBottom: 0 }}>
              <div className="task-detail__badges">
                <Badge variant={PRIORITY_BADGE_VARIANTS[task.priority ?? 'medium']} dot>{TASK_PRIORITY_LABELS[task.priority ?? 'medium']}</Badge>
                <Badge variant={STATUS_BADGE_VARIANTS[task.status ?? 'open']}>{TASK_STATUS_LABELS[task.status ?? 'open']}</Badge>
              </div>
              <h1 className="task-detail__title">{task.title}</h1>
              {task.description && <p className="task-detail__desc">{task.description}</p>}
              {task.tags && task.tags.length > 0 && (
                <div className="task-detail__tags">
                  {task.tags.map((tag) => (
                    <span key={tag.id} className="task-tag" style={{ '--tag-color': tag.color } as React.CSSProperties}>{tag.name}</span>
                  ))}
                </div>
              )}
              <div className="task-detail__dates">
                <span>Обновлено: {new Date(task.updatedAt).toLocaleString('ru-RU')}</span>
                <span>Создано: {new Date(task.createdAt).toLocaleString('ru-RU')}</span>
              </div>
            </div>
          )}
        </Island>

        <div className="task-detail__sections" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {editSections.map((section, index) => (
                <Island key={section.id} flex={false} style={{ padding: '20px' }}>
                  <div className="task-section-edit__header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <Button variant="secondary" size="sm" onClick={() => {
                        if (index === 0) return;
                        setEditSections(prev => {
                          const arr = [...prev];
                          [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                          return arr;
                        });
                      }} disabled={index === 0} icon={<ChevronUp size={14} />} />
                      <Button variant="secondary" size="sm" onClick={() => {
                        if (index === editSections.length - 1) return;
                        setEditSections(prev => {
                          const arr = [...prev];
                          [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
                          return arr;
                        });
                      }} disabled={index === editSections.length - 1} icon={<ChevronDown size={14} />} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        noContainer
                        fullWidth
                        style={{ height: '32px' }}
                      />
                    </div>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setEditSections(editSections.filter(s => s.id !== section.id))}
                      icon={<Trash2 size={16} />}
                    />
                  </div>
                  <Textarea value={section.content} onChange={(e) => updateSection(section.id, { content: e.target.value })} rows={6} fullWidth />
                </Island>
              ))}
              <Button variant="secondary" onClick={() => setEditSections([...editSections, { id: crypto.randomUUID(), title: 'Новый раздел', content: '' }])} icon={<Plus size={16} />} fullWidth>
                Добавить раздел
              </Button>
            </div>
          ) : (
            task.sections.map((section) => (
              <Island key={section.id} flex={false}>
                <h2 className="task-section-view__title" style={{ margin: 0 }}>{section.title}</h2>
                <div className="task-section-view__content markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content || '*Пусто*'}</ReactMarkdown>
                </div>
              </Island>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Удалить задачу?" variant="danger" footer={<><Button size="sm" onClick={() => setShowDeleteModal(false)}>Отмена</Button><Button size="sm" variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>Удалить</Button></>}>
        <p>Задача <strong>{task.title}</strong> будет удалена навсегда.</p>
      </Modal>
    </div>
  );
}
