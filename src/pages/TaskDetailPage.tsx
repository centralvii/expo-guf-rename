import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, Trash2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTasks } from '../hooks/useTasks';
import type { TaskItem, TaskSection } from '../types';

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { isLoaded, getTask, updateTask, deleteTask } = useTasks();
  
  const [task, setTask] = useState<TaskItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSections, setEditSections] = useState<TaskSection[]>([]);

  useEffect(() => {
    if (isLoaded && taskId) {
      const foundTask = getTask(taskId);
      if (foundTask) {
        setTask(foundTask);
        setEditTitle(foundTask.title);
        setEditDesc(foundTask.description);
        setEditSections(foundTask.sections);
      }
    }
  }, [isLoaded, taskId, getTask, isEditing]); // Reload values on edit toggle

  if (!isLoaded) return <div className="page-loading">Загрузка...</div>;
  if (!task) return <div className="page-loading">Задача не найдена или удалена</div>;

  const handleSave = async () => {
    if (taskId) {
      await updateTask(taskId, {
        title: editTitle,
        description: editDesc,
        sections: editSections
      });
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Вы уверены, что хотите удалить этот экземпляр?')) {
      if (taskId) {
        await deleteTask(taskId);
        navigate('/task-helper');
      }
    }
  };

  const handleAddSection = () => {
    setEditSections([
      ...editSections,
      { id: crypto.randomUUID(), title: 'Новый раздел', content: '' }
    ]);
  };

  const handleRemoveSection = (id: string) => {
    setEditSections(editSections.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, updates: Partial<TaskSection>) => {
    setEditSections(editSections.map((s) => s.id === id ? { ...s, ...updates } : s));
  };

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__nav">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>GD Helper</span>
        </Link>
        <span className="back-link__sep">/</span>
        <Link to="/task-helper" className="back-link">
          <span>Task Helper</span>
        </Link>
        <span className="back-link__sep">/</span>
        <span className="back-link__current">{task.title}</span>
      </div>

      <div className="tool-page__content">
        <div className="task-detail__toolbar">
          <button className="btn btn-ghost" onClick={() => navigate('/task-helper')}>
            <ArrowLeft size={16} /> Назад
          </button>
          <div className="task-detail__actions">
          {isEditing ? (
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={16} /> Сохранить
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                <Edit2 size={16} /> Редактировать
              </button>
              <button className="btn btn-danger-outline" onClick={handleDelete}>
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
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Название (FINAPP-1234)"
          />
          <input 
            type="text" 
            className="task-detail__desc-input" 
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
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
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="task-section-edit__title-input"
                    placeholder="Название раздела (Тип объекта, Алгоритмы...)"
                  />
                  <button className="btn btn-icon btn-danger-outline" onClick={() => handleRemoveSection(section.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea 
                  className="task-section-edit__content-input"
                  value={section.content}
                  onChange={(e) => updateSection(section.id, { content: e.target.value })}
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
  );
}
