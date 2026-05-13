import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Copy, Download, Edit2, Save, Trash2, Plus,
  Flame, ArrowUp, ArrowRight, ArrowDown, Circle, Clock, GitPullRequest,
  CheckCircle2, XCircle, ChevronUp, ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import { TaskDiffModal } from '../components/TaskDiffModal';
import { TaskTagPicker } from '../components/TaskTagPicker';
import { diffTaskCollections } from '../lib/taskDiff';
import type { TaskItem, TaskSection, TaskPriority, TaskStatus, TaskTag } from '../types';
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS
} from '../types';

// --- UI-Kit Imports ---
import { Badge, Button, Input, Island, Loader, Modal, TagChip, Textarea, Toolbar } from '../ui';
import type { BadgeVariant } from '../ui';

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

const PRIORITY_BADGE_VARIANTS: Record<TaskPriority, BadgeVariant> = {
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

const STATUS_BADGE_VARIANTS: Record<TaskStatus, BadgeVariant> = {
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
  try { localStorage.setItem(getDraftKey(taskId), JSON.stringify(draft)); } catch {
    // Draft persistence is best-effort.
  }
}
function clearDraft(taskId: string) { localStorage.removeItem(getDraftKey(taskId)); }

function createDraftFromTask(task: TaskItem): EditDraft {
  return {
    title: task.title,
    description: task.description,
    sections: task.sections,
    priority: task.priority ?? 'medium',
    status: task.status ?? 'open',
    tags: task.tags ?? [],
  };
}

function draftsEqual(left: EditDraft, right: EditDraft): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isLoaded, error, getTask, updateTask, deleteTask } = useTasks();

  const task = taskId ? getTask(taskId) : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [hasDraftWarning, setHasDraftWarning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDraftDiffModal, setShowDraftDiffModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSections, setEditSections] = useState<TaskSection[]>([]);
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('open');
  const [editTags, setEditTags] = useState<TaskTag[]>([]);

  const skipNextDraftSave = useRef(false);

  useEffect(() => {
    if (!isEditing || !taskId || !task) return;
    if (skipNextDraftSave.current) { skipNextDraftSave.current = false; return; }
    const draft: EditDraft = { title: editTitle, description: editDesc, sections: editSections, priority: editPriority, status: editStatus, tags: editTags };
    if (draftsEqual(draft, createDraftFromTask(task))) {
      clearDraft(taskId);
      return;
    }
    saveDraft(taskId, draft);
  }, [isEditing, taskId, editTitle, editDesc, editSections, editPriority, editStatus, editTags, task]);

  if (!isLoaded) {
    return (
      <div className="tool-page">
        <div className="app-restore">
          <Loader size="lg" />
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
    if (draft && !draftsEqual(draft, createDraftFromTask(task))) {
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

      if (draft) {
        clearDraft(taskId);
      }
    }
    setIsEditing(true);
  };

  const clearRecoveredDraftState = (nextTask: TaskItem) => {
    if (taskId) {
      clearDraft(taskId);
    }

    skipNextDraftSave.current = true;
    setShowDraftDiffModal(false);
    setHasDraftWarning(false);
    setEditTitle(nextTask.title);
    setEditDesc(nextTask.description);
    setEditSections(nextTask.sections);
    setEditPriority(nextTask.priority ?? 'medium');
    setEditStatus(nextTask.status ?? 'open');
    setEditTags(nextTask.tags ?? []);
  };

  const handleDiscardDraft = () => {
    clearRecoveredDraftState(task);
    // ???????? ? ?????? ??????????????, ?????? ?????????? ?????? ? ?????????
  };

  const handleCopyMarkdown = async () => {
    try { await navigator.clipboard.writeText(markdown); notify('Markdown скопирован'); }
    catch { notify('Не удалось скопировать', 'error'); }
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
    if (!taskId || isSaving) return;
    setIsSaving(true);
    try {
      await updateTask(taskId, {
        title: editTitle,
        description: editDesc,
        sections: editSections,
        priority: editPriority,
        status: editStatus,
        tags: editTags,
      });
      clearRecoveredDraftState({
        ...task,
        title: editTitle,
        description: editDesc,
        sections: editSections,
        priority: editPriority,
        status: editStatus,
        tags: editTags,
      });
      setIsEditing(false);
      notify('\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B');
    } catch {
      notify('\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskId) return;
    try {
      setIsDeleting(true);
      await deleteTask(taskId);
      notify('Задача удалена', 'error');
      setShowDeleteModal(false);
      navigate('/task-helper');
    } catch { notify('Ошибка удаления', 'error'); setIsDeleting(false); }
  };

  const updateSection = (id: string, updates: Partial<TaskSection>) => {
    setEditSections(editSections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const draftDiff = diffTaskCollections(
    [task],
    [{
      ...task,
      title: editTitle,
      description: editDesc,
      sections: editSections,
      priority: editPriority,
      status: editStatus,
      tags: editTags,
    }]
  );

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
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>{"\u041E\u0442\u043C\u0435\u043D\u0430"}</Button>
                <Button variant="primary" size="sm" icon={<Save size={16} />} onClick={handleSave} isLoading={isSaving}>
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
              {draftDiff.hasChanges && (
                <Button variant="ghost" size="sm" className="draft-warning__view" onClick={() => setShowDraftDiffModal(true)}>
                  {'\u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c'}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="draft-warning__discard" onClick={handleDiscardDraft}>Сбросить</Button>
            </div>
          )}

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input label="Название" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} fullWidth />
              <Textarea label={"\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435"} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} fullWidth autoResize />
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
                <div style={{ marginTop: '8px' }}><TaskTagPicker selectedTags={editTags} onChange={setEditTags} /></div>
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
                    <TagChip key={tag.id} color={tag.color}>{tag.name}</TagChip>
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
                  <Textarea value={section.content} onChange={(e) => updateSection(section.id, { content: e.target.value })} rows={6} fullWidth autoResize />
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

      <TaskDiffModal
        isOpen={showDraftDiffModal}
        onClose={() => setShowDraftDiffModal(false)}
        diff={draftDiff}
        onDiscard={() => {
          handleDiscardDraft();
          setShowDraftDiffModal(false);
        }}
      />
    </div>
  );
}
