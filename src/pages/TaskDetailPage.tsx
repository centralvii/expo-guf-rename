import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Copy, Download, Edit2, Save, Trash2, Plus,
  Flame, ArrowUp, ArrowRight, ArrowDown, Circle, Clock, GitPullRequest,
  CheckCircle2, XCircle, Tag, X, ChevronUp, ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import type { TaskItem, TaskSection, TaskPriority, TaskStatus, TaskTag } from '../types';
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TAG_COLOR_PRESETS
} from '../types';

const DELETE_MODAL_ANIMATION_MS = 220;

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

function taskToMarkdown(task: TaskItem): string {
  const lines = [`# ${task.title}`];

  if (task.description.trim()) {
    lines.push('', task.description.trim());
  }

  if (task.tags?.length > 0) {
    lines.push('', `**Теги:** ${task.tags.map((t) => t.name).join(', ')}`);
  }

  task.sections.forEach((section) => {
    lines.push('', `## ${section.title}`);
    lines.push('', section.content.trim() || '*Пусто*');
  });

  return `${lines.join('\n').trim()}\n`;
}

function createMarkdownFilename(title: string): string {
  const withoutForbiddenChars = title
    .trim()
    .replace(/[<>:"/\\|?*]/g, '-')
    .split('')
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('');

  const normalizedTitle = withoutForbiddenChars
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

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
            <input
              autoFocus
              type="text"
              className="tag-picker__input"
              placeholder="Название тега..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <div className="tag-picker__colors">
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
            <button type="button" className="btn btn-primary btn--sm" onClick={handleAdd} disabled={!newTagName.trim()}>
              Добавить
            </button>
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

function getDraftKey(taskId: string) {
  return `task-draft:${taskId}`;
}

function loadDraft(taskId: string): EditDraft | null {
  try {
    const raw = localStorage.getItem(getDraftKey(taskId));
    return raw ? (JSON.parse(raw) as EditDraft) : null;
  } catch {
    return null;
  }
}

function saveDraft(taskId: string, draft: EditDraft) {
  try {
    localStorage.setItem(getDraftKey(taskId), JSON.stringify(draft));
  } catch { /* ignore */ }
}

function clearDraft(taskId: string) {
  localStorage.removeItem(getDraftKey(taskId));
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isLoaded, error, getTask, updateTask, deleteTask } = useTasks();

  const task = taskId ? getTask(taskId) : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [hasDraftWarning, setHasDraftWarning] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalClosing, setIsDeleteModalClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSections, setEditSections] = useState<TaskSection[]>([]);
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('open');
  const [editTags, setEditTags] = useState<TaskTag[]>([]);

  const skipNextDraftSave = useRef(false);

  useEffect(() => {
    if (!isDeleteModalOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) setIsDeleteModalClosing(true);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeleteModalOpen, isDeleting]);

  useEffect(() => {
    if (!isDeleteModalClosing) return undefined;

    const timeoutId = window.setTimeout(() => {
      setIsDeleteModalOpen(false);
      setIsDeleteModalClosing(false);
      setIsDeleting(false);
    }, DELETE_MODAL_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isDeleteModalClosing]);

  // Persist draft to localStorage on every edit change (must be before early returns)
  useEffect(() => {
    if (!isEditing || !taskId) return;
    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }
    const draft: EditDraft = {
      title: editTitle,
      description: editDesc,
      sections: editSections,
      priority: editPriority,
      status: editStatus,
      tags: editTags,
    };
    saveDraft(taskId, draft);
  }, [isEditing, taskId, editTitle, editDesc, editSections, editPriority, editStatus, editTags]);

  if (!isLoaded) return <div className="page-loading">Загрузка...</div>;
  if (error) return <div className="page-loading">{error}</div>;
  if (!task) return <div className="page-loading">Задача не найдена или удалена</div>;

  const markdown = taskToMarkdown(task);

  const handleStartEditing = () => {
    if (!taskId) return;
    const draft = loadDraft(taskId);
    if (draft) {
      // Restore unsaved draft
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
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      notify('Markdown скопирован');
    } catch (copyError) {
      console.error('[task-helper] Failed to copy markdown', copyError);
      notify('Не удалось скопировать Markdown', 'error');
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = createMarkdownFilename(task.title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    notify('Markdown файл скачан');
  };

  const handleSave = async () => {
    if (!taskId) return;
    try {
      await updateTask(taskId, {
        title: editTitle,
        description: editDesc,
        sections: editSections,
        priority: editPriority,
        status: editStatus,
        tags: editTags,
      });
      clearDraft(taskId);
      setIsEditing(false);
      setHasDraftWarning(false);
      notify('Изменения сохранены');
    } catch (saveError) {
      console.error('[task-helper] Failed to save task', saveError);
      notify('Не удалось сохранить изменения', 'error');
    }
  };

  const handleRequestDelete = () => {
    setIsDeleteModalClosing(false);
    setIsDeleteModalOpen(true);
  };

  const handleCancelDelete = () => {
    if (!isDeleting) setIsDeleteModalClosing(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskId) return;
    try {
      setIsDeleting(true);
      await deleteTask(taskId);
      notify('Задача удалена', 'error');
      setIsDeleteModalOpen(false);
      setIsDeleteModalClosing(false);
      navigate('/task-helper');
    } catch (deleteError) {
      console.error('[task-helper] Failed to delete task', deleteError);
      notify('Не удалось удалить задачу', 'error');
      setIsDeleting(false);
    }
  };

  const handleAddSection = () => {
    setEditSections([
      ...editSections,
      { id: crypto.randomUUID(), title: 'Новый раздел', content: '' },
    ]);
  };

  const handleRemoveSection = (id: string) => {
    setEditSections(editSections.filter((s) => s.id !== id));
  };

  const handleMoveSectionUp = (index: number) => {
    if (index === 0) return;
    setEditSections((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const handleMoveSectionDown = (index: number) => {
    setEditSections((prev) => {
      if (index === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const updateSection = (id: string, updates: Partial<TaskSection>) => {
    setEditSections(editSections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteModalClassName = `task-modal${isDeleteModalClosing ? ' task-modal--closing' : ''}`;

  const taskPriority = task.priority ?? 'medium';
  const taskStatus = task.status ?? 'open';

  return (
    <>
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content">

          {/* Toolbar */}
          <div className="task-detail__toolbar">
            <button className="btn btn-ghost" onClick={() => navigate('/task-helper')}>
              <ArrowLeft size={16} /> Назад
            </button>
            <div className="task-detail__actions">
              {!isEditing && (
                <>
                  <button className="btn btn-secondary btn-icon" onClick={handleCopyMarkdown} title="Копировать Markdown" aria-label="Копировать Markdown">
                    <Copy size={16} />
                  </button>
                  <button className="btn btn-secondary btn-icon" onClick={handleDownloadMarkdown} title="Скачать Markdown" aria-label="Скачать Markdown">
                    <Download size={16} />
                  </button>
                </>
              )}
              {isEditing ? (
                <button className="btn btn-primary" onClick={handleSave}>
                  <Save size={16} /> Сохранить
                </button>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={handleStartEditing}>
                    <Edit2 size={16} /> Редактировать
                  </button>
                  <button className="btn btn-danger-outline" onClick={handleRequestDelete}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Draft warning banner */}
          {isEditing && hasDraftWarning && (
            <div className="draft-warning">
              <AlertTriangle size={15} />
              <span>Восстановлены несохранённые изменения с предыдущей сессии</span>
              <button className="draft-warning__discard" onClick={handleDiscardDraft}>
                Сбросить
              </button>
            </div>
          )}

          {/* Header */}
          {isEditing ? (
            <div className="task-detail__edit-header">
              <input
                type="text"
                className="task-detail__title-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Название (FINAPP-1234)"
              />
              <textarea
                className="task-detail__desc-input"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Описание..."
                rows={2}
              />

              {/* Priority + Status row in edit */}
              <div className="task-detail__meta-edit">
                <div className="form-group">
                  <label className="form-label">Приоритет</label>
                  <div className="select-group">
                    {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`select-chip ${editPriority === p ? 'select-chip--active' : ''}`}
                        style={{ '--chip-color': PRIORITY_COLORS[p] } as React.CSSProperties}
                        onClick={() => setEditPriority(p)}
                      >
                        {PRIORITY_ICONS[p]}
                        {TASK_PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Статус</label>
                  <div className="select-group">
                    {(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`select-chip ${editStatus === s ? 'select-chip--active' : ''}`}
                        style={{ '--chip-color': STATUS_COLORS[s] } as React.CSSProperties}
                        onClick={() => setEditStatus(s)}
                      >
                        {STATUS_ICONS[s]}
                        {TASK_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Теги</label>
                  <TagPicker selectedTags={editTags} onChange={setEditTags} />
                </div>
              </div>
            </div>
          ) : (
            <div className="task-detail__header">
              <div className="task-detail__badges">
                <span
                  className="task-badge task-badge--priority task-badge--lg"
                  style={{ '--badge-color': PRIORITY_COLORS[taskPriority] } as React.CSSProperties}
                >
                  {PRIORITY_ICONS[taskPriority]}
                  {TASK_PRIORITY_LABELS[taskPriority]}
                </span>
                <span
                  className="task-badge task-badge--status task-badge--lg"
                  style={{ '--badge-color': STATUS_COLORS[taskStatus] } as React.CSSProperties}
                >
                  {STATUS_ICONS[taskStatus]}
                  {TASK_STATUS_LABELS[taskStatus]}
                </span>
              </div>

              <h1 className="task-detail__title">{task.title}</h1>

              {task.description && (
                <p className="task-detail__desc">{task.description}</p>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="task-detail__tags">
                  {task.tags.map((tag) => (
                    <span key={tag.id} className="task-tag" style={{ '--tag-color': tag.color } as React.CSSProperties}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="task-detail__dates">
                <span>Обновлено: {new Date(task.updatedAt).toLocaleString('ru-RU')}</span>
                <span>Создано: {new Date(task.createdAt).toLocaleString('ru-RU')}</span>
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="task-detail__sections">
            {isEditing ? (
              <>
                {editSections.map((section, index) => (
                  <div key={section.id} className="task-section-edit">
                    <div className="task-section-edit__header">
                      <div className="task-section-edit__reorder">
                        <button
                          type="button"
                          className="btn-section-move"
                          onClick={() => handleMoveSectionUp(index)}
                          disabled={index === 0}
                          title="Переместить вверх"
                          aria-label="Переместить раздел вверх"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-section-move"
                          onClick={() => handleMoveSectionDown(index)}
                          disabled={index === editSections.length - 1}
                          title="Переместить вниз"
                          aria-label="Переместить раздел вниз"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="task-section-edit__title-input"
                        placeholder="Название раздела..."
                      />
                      <button className="btn btn-icon btn-danger-outline" onClick={() => handleRemoveSection(section.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea
                      className="task-section-edit__content-input"
                      value={section.content}
                      onChange={(e) => updateSection(section.id, { content: e.target.value })}
                      placeholder="Содержимое (поддерживается Markdown)..."
                      rows={8}
                    />
                  </div>
                ))}
                <button className="btn btn-outline task-section__add-btn" onClick={handleAddSection}>
                  <Plus size={16} /> Добавить раздел
                </button>
              </>
            ) : (
              task.sections.map((section) => (
                <div key={section.id} className="task-section-view">
                  <h2 className="task-section-view__title">{section.title}</h2>
                  <div className="task-section-view__content markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {section.content || '*Пусто*'}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {isDeleteModalOpen && (
        <div
          className={deleteModalClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-task-modal-title"
          onClick={handleCancelDelete}
        >
          <div className="task-modal__backdrop" />
          <div className="task-modal__card" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal__icon">
              <AlertTriangle size={18} />
            </div>
            <h2 id="delete-task-modal-title" className="task-modal__title">
              Удалить задачу?
            </h2>
            <p className="task-modal__description">
              Задача <strong>{task.title}</strong> будет удалена без возможности восстановления.
            </p>
            <div className="task-modal__actions">
              <button className="btn btn-secondary" onClick={handleCancelDelete} disabled={isDeleting}>
                Отмена
              </button>
              <button className="task-modal__confirm" onClick={handleConfirmDelete} disabled={isDeleting}>
                <Trash2 size={16} />
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
