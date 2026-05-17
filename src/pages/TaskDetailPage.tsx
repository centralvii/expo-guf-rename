import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../TaskHelper.css';
import {
  AlertTriangle, ArrowLeft, Copy, Download, Edit2, Save, Trash2, Plus,
  ChevronUp, ChevronDown
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import { TaskDiffModal } from '../components/TaskDiffModal';
import { TaskHistoryDrawer } from '../components/TaskHistoryDrawer';
import { TaskTagPicker } from '../components/TaskTagPicker';
import { diffTaskCollections } from '../lib/taskDiff';
import type { TaskHistoryEntry, TaskItem, TaskSection, TaskPriority, TaskStatus, TaskTag } from '../types';
import {
  TASK_PRIORITY_LABELS, TASK_STATUS_LABELS
} from '../types';

import { Badge, Button, Input, Island, Modal, TagChip, Textarea, Toolbar, SegmentedControl } from '../ui';
import { PRIORITY_ICONS, PRIORITY_BADGE_VARIANTS, STATUS_ICONS, STATUS_BADGE_VARIANTS } from '../lib/taskUiConstants';
import { TaskDetailSkeleton } from '../components/skeletons/TaskDetailSkeleton';

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
  const { isLoaded, error, getTask, updateTask, deleteTask, getTaskHistory, restoreTask } = useTasks();

  const task = taskId ? getTask(taskId) : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [hasDraftWarning, setHasDraftWarning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDraftDiffModal, setShowDraftDiffModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<TaskHistoryEntry[]>([]);

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
    const timer = window.setTimeout(() => {
      saveDraft(taskId, draft);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isEditing, taskId, editTitle, editDesc, editSections, editPriority, editStatus, editTags, task]);

  if (!isLoaded) {
    return <TaskDetailSkeleton />;
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
    // Discard draft and revert to current task state
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
      const updatedTask = await updateTask(taskId, {
        title: editTitle,
        description: editDesc,
        sections: editSections,
        priority: editPriority,
        status: editStatus,
        tags: editTags,
      });
      clearRecoveredDraftState(updatedTask);
      setIsEditing(false);
      notify('Изменения сохранены');
    } catch {
      notify('Ошибка сохранения', 'error');
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

  const loadHistory = async () => {
    if (!taskId) {
      return;
    }

    setIsHistoryLoading(true);
    try {
      const entries = await getTaskHistory(taskId);
      setHistoryEntries(entries);
    } catch (historyError) {
      console.error('[task-history] Failed to load history', historyError);
      notify('Не удалось загрузить историю задачи', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleOpenHistory = async () => {
    setShowHistoryDrawer(true);
    await loadHistory();
  };

  const handleRestoreHistoryEntry = async (entry: TaskHistoryEntry) => {
    if (!taskId || !entry.after) {
      return;
    }

    try {
      const restoredTask = await restoreTask(taskId, entry.after, {
        summary: `Восстановлена версия от ${new Date(entry.createdAt).toLocaleString('ru-RU')}`,
        metadata: entry.metadata,
      });
      clearRecoveredDraftState(restoredTask);
      setIsEditing(false);
      setShowHistoryDrawer(false);
      notify('Версия задачи восстановлена', 'success');
      await loadHistory();
    } catch (restoreError) {
      console.error('[task-history] Failed to restore task version', restoreError);
      notify('Не удалось восстановить версию', 'error');
    }
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
                <Button variant="secondary" size="sm" onClick={handleOpenHistory}>
                  История
                </Button>
                <Toolbar.Divider />
                <Button variant="secondary" size="sm" icon={<Edit2 size={16} />} onClick={handleStartEditing}>
                  Редактировать
                </Button>
                <Button variant="danger" size="sm" icon={<Trash2 size={16} />} onClick={() => setShowDeleteModal(true)} />
              </>
            )}
            {isEditing && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>Отмена</Button>
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
                  Посмотреть
                </Button>
              )}
              <Button variant="ghost" size="sm" className="draft-warning__discard" onClick={handleDiscardDraft}>Сбросить</Button>
            </div>
          )}

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input label="Название" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} fullWidth />
              <Textarea label="Описание" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} fullWidth autoResize />
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                 <div className="form-group">
                   <label className="ui-label">Приоритет</label>
                   <SegmentedControl
                     size="sm"
                     value={editPriority}
                     onChange={setEditPriority}
                     options={(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map(p => ({
                       value: p,
                       label: <>{PRIORITY_ICONS[p]} {TASK_PRIORITY_LABELS[p]}</>,
                     }))}
                   />
                 </div>
                 <div className="form-group">
                   <label className="ui-label">Статус</label>
                   <SegmentedControl
                     size="sm"
                     value={editStatus}
                     onChange={setEditStatus}
                     options={(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map(s => ({
                       value: s,
                       label: <>{STATUS_ICONS[s]} {TASK_STATUS_LABELS[s]}</>,
                     }))}
                   />
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

      <TaskHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        entries={historyEntries}
        isLoading={isHistoryLoading}
        taskTitle={task.title}
        onRestore={handleRestoreHistoryEntry}
      />
    </div>
  );
}
