import { useState, useMemo, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, ChevronRight, FileText, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useTasks } from '../hooks/useTasks';

export function TaskHelperPage() {
  const { tasks, isLoaded, error, addTask } = useTasks();
  const { notify } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const sortedAndFilteredTasks = useMemo(() => {
    return tasks
      .filter((task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [tasks, searchQuery]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await addTask(newTitle.trim(), newDescription.trim());
      setNewTitle('');
      setNewDescription('');
      setIsCreating(false);
      notify('Экземпляр создан');
    } catch (createError) {
      console.error('[task-helper] Failed to create task', createError);
      notify('Не удалось создать экземпляр', 'error');
    }
  };

  if (!isLoaded) {
    return (
      <div className="tool-page">
        <div className="app-restore">
          <div className="spinner" />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__nav">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>GD Helper</span>
        </Link>
        <span className="back-link__sep">/</span>
        <span className="back-link__current">Task Helper</span>
      </div>

      <div className="tool-page__content">
        {error && (
          <div className="app-restore" style={{ marginBottom: '24px' }}>
            <span>{error}</span>
          </div>
        )}

        <div className="task-registry__header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div className="search-box" style={{ flex: 1, margin: 0 }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="search-input"
            />
          </div>
          <button className="btn btn-primary" onClick={() => setIsCreating(true)} style={{ whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Создать
          </button>
        </div>

        {isCreating && (
          <form className="task-create-card" onSubmit={handleCreate}>
            <h3>Новый экземпляр</h3>
            <div className="form-group">
              <label>Название (например: FINAPP-5102)</label>
              <input
                autoFocus
                required
                type="text"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Введите название..."
                className="text-input"
              />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <input
                type="text"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Краткое описание задачи..."
                className="text-input"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Создать</button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Отмена</button>
            </div>
          </form>
        )}

        <div className="task-list">
          {sortedAndFilteredTasks.length === 0 ? (
            <div className="task-list-empty">
              <FileText size={48} />
              <p>Экземпляры не найдены</p>
            </div>
          ) : (
            sortedAndFilteredTasks.map((task) => (
              <Link to={`/task-helper/${task.id}`} key={task.id} className="task-card">
                <div className="task-card__content">
                  <h3 className="task-card__title">{task.title}</h3>
                  <p className="task-card__desc">{task.description}</p>
                  <div className="task-card__meta">
                    <span className="meta-item"><Calendar size={12} /> {new Date(task.updatedAt).toLocaleDateString()}</span>
                    <span className="meta-item">{task.sections.length} разд.</span>
                  </div>
                </div>
                <div className="task-card__action">
                  <ChevronRight size={20} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
