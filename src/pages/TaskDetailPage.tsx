import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Copy, Download, Edit2, Save, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import type { TaskItem, TaskSection } from '../types';

const DELETE_MODAL_ANIMATION_MS = 220;

function taskToMarkdown(task: TaskItem): string {
  const lines = [`# ${task.title}`];

  if (task.description.trim()) {
    lines.push('', task.description.trim());
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

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isLoaded, error, getTask, updateTask, deleteTask } = useTasks();

  const task = taskId ? getTask(taskId) : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalClosing, setIsDeleteModalClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSections, setEditSections] = useState<TaskSection[]>([]);

  useEffect(() => {
    if (!isDeleteModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        setIsDeleteModalClosing(true);
      }
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
    if (!isDeleteModalClosing) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsDeleteModalOpen(false);
      setIsDeleteModalClosing(false);
      setIsDeleting(false);
    }, DELETE_MODAL_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDeleteModalClosing]);

  if (!isLoaded) return <div className="page-loading">Загрузка...</div>;
  if (error) return <div className="page-loading">{error}</div>;
  if (!task) return <div className="page-loading">Задача не найдена или удалена</div>;

  const markdown = taskToMarkdown(task);

  const handleStartEditing = () => {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditSections(task.sections);
    setIsEditing(true);
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
    if (!taskId) {
      return;
    }

    try {
      await updateTask(taskId, {
        title: editTitle,
        description: editDesc,
        sections: editSections,
      });
      setIsEditing(false);
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
    if (!isDeleting) {
      setIsDeleteModalClosing(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskId) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTask(taskId);
      notify('Экземпляр удалён', 'error');
      setIsDeleteModalOpen(false);
      setIsDeleteModalClosing(false);
      navigate('/task-helper');
    } catch (deleteError) {
      console.error('[task-helper] Failed to delete task', deleteError);
      notify('Не удалось удалить экземпляр', 'error');
      setIsDeleting(false);
    }
  };

  const handleAddSection = () => {
    setEditSections([
      ...editSections,
      { id: crypto.randomUUID(), title: 'Новый раздел', content: '' },
    ]);
    notify('Раздел добавлен', 'info');
  };

  const handleRemoveSection = (id: string) => {
    setEditSections(editSections.filter((section) => section.id !== id));
    notify('Раздел удалён', 'error');
  };

  const updateSection = (id: string, updates: Partial<TaskSection>) => {
    setEditSections(editSections.map((section) => (
      section.id === id ? { ...section, ...updates } : section
    )));
  };

  const deleteModalClassName = `task-modal${isDeleteModalClosing ? ' task-modal--closing' : ''}`;

  return (
    <>
      <div className="tool-page anim-fade-in">

        <div className="tool-page__content">
          <div className="task-detail__toolbar">
            <button className="btn btn-ghost" onClick={() => navigate('/task-helper')}>
              <ArrowLeft size={16} /> Назад
            </button>
            <div className="task-detail__actions">
              {!isEditing && (
                <>
                  <button
                    className="btn btn-secondary btn-icon"
                    onClick={handleCopyMarkdown}
                    title="Копировать Markdown"
                    aria-label="Копировать Markdown"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="btn btn-secondary btn-icon"
                    onClick={handleDownloadMarkdown}
                    title="Скачать Markdown"
                    aria-label="Скачать Markdown"
                  >
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

          {isEditing ? (
            <div className="task-detail__edit-header">
              <input
                type="text"
                className="task-detail__title-input"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                placeholder="Название (FINAPP-1234)"
              />
              <input
                type="text"
                className="task-detail__desc-input"
                value={editDesc}
                onChange={(event) => setEditDesc(event.target.value)}
                placeholder="Описание..."
              />
            </div>
          ) : (
            <div className="task-detail__header">
              <h1 className="task-detail__title">{task.title}</h1>
              <p className="task-detail__desc">{task.description}</p>
            </div>
          )}

          <div className="task-detail__sections">
            {isEditing ? (
              <>
                {editSections.map((section) => (
                  <div key={section.id} className="task-section-edit">
                    <div className="task-section-edit__header">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(event) => updateSection(section.id, { title: event.target.value })}
                        className="task-section-edit__title-input"
                        placeholder="Название раздела (Тип объекта, Алгоритмы...)"
                      />
                      <button
                        className="btn btn-icon btn-danger-outline"
                        onClick={() => handleRemoveSection(section.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea
                      className="task-section-edit__content-input"
                      value={section.content}
                      onChange={(event) => updateSection(section.id, { content: event.target.value })}
                      placeholder="Содержимое раздела (поддерживается Markdown)..."
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

      {isDeleteModalOpen && (
        <div
          className={deleteModalClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-task-modal-title"
          onClick={handleCancelDelete}
        >
          <div className="task-modal__backdrop" />
          <div className="task-modal__card" onClick={(event) => event.stopPropagation()}>
            <div className="task-modal__icon">
              <AlertTriangle size={18} />
            </div>
            <h2 id="delete-task-modal-title" className="task-modal__title">
              Удалить экземпляр?
            </h2>
            <p className="task-modal__description">
              Экземпляр <strong>{task.title}</strong> будет удалён без возможности восстановления.
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
