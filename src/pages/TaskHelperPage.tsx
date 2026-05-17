import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../TaskHelper.css';
import {
  Plus, Calendar, ChevronRight, FileText, AlertTriangle,
  X, Tag, Filter, SlidersHorizontal, Flame,
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useTasks } from '../hooks/useTasks';
import { TaskTagPicker } from '../components/TaskTagPicker';
import { createTaskPayloadFromTemplate, getEmptyTaskTemplate, listTaskTemplates } from '../lib/taskTemplates';
import type { TaskPriority, TaskSection, TaskStatus, TaskTag, TaskTemplate } from '../types';
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '../types';
import {
  Badge,
  Button,
  Drawer,
  Input,
  Island,
  SearchInput,
  SegmentedControl,
  Select,
  TagChip,
  Textarea,
  Toolbar,
  type SelectOption,
} from '../ui';
import { PRIORITY_ICONS, PRIORITY_BADGE_VARIANTS, STATUS_ICONS, STATUS_BADGE_VARIANTS } from '../lib/taskUiConstants';
import { formatRelativeTime } from '../lib/responseUtils';
import { TaskListSkeleton } from '../components/skeletons/TaskListSkeleton';

interface CreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    title: string,
    desc: string,
    priority: TaskPriority,
    status: TaskStatus,
    tags: TaskTag[],
    sections: TaskSection[],
    template: TaskTemplate
  ) => Promise<void>;
}

function CreateTaskDrawer({ isOpen, onClose, onCreate }: CreateDrawerProps) {
  const templates = useMemo(() => listTaskTemplates(), []);
  const emptyTemplate = useMemo(() => getEmptyTaskTemplate(), []);
  const [selectedTemplateId, setSelectedTemplateId] = useState(emptyTemplate.id);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('open');
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const templateOptions = useMemo<SelectOption<string>[]>(
    () => templates.map((template) => ({
      value: template.id,
      label: template.name,
      description: template.description,
    })),
    [templates]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? emptyTemplate,
    [selectedTemplateId, templates, emptyTemplate]
  );

  const applyTemplate = useCallback((template: TaskTemplate) => {
    const payload = createTaskPayloadFromTemplate(template, { id: crypto.randomUUID() });
    setTitle(payload.title);
    setDesc(payload.description);
    setPriority(payload.priority);
    setStatus(payload.status);
    setTags(payload.tags);
    setSections(payload.sections);
  }, []);

  const resetForm = () => {
    setSelectedTemplateId(emptyTemplate.id);
    applyTemplate(emptyTemplate);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const nextTemplate = templates.find((template) => template.id === templateId) ?? emptyTemplate;
    applyTemplate(nextTemplate);
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreate(title.trim(), desc.trim(), priority, status, tags, sections, selectedTemplate);
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        title="Новая задача"
        footer={(
          <>
            <Button size="sm" onClick={handleClose} disabled={isSubmitting}>Отмена</Button>
            <Button variant="primary" size="sm" onClick={() => void handleSubmit()} isLoading={isSubmitting} disabled={!title.trim()}>
              Создать задачу
            </Button>
        </>
      )}
    >
      <form className="task-drawer__form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Select
          label="Шаблон"
          value={selectedTemplateId}
          onChange={handleTemplateChange}
          options={templateOptions}
          fullWidth
        />

        <Input
          label="Название"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="TASK-1234..."
          fullWidth
          autoFocus
        />

        <Textarea
          label="Описание"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Краткое описание задачи..."
          fullWidth
        />

        <div className="form-group">
          <label className="ui-label">Приоритет</label>
          <SegmentedControl
            size="sm"
            value={priority}
            onChange={setPriority}
            options={(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((currentPriority) => ({
              value: currentPriority,
              label: <>{PRIORITY_ICONS[currentPriority]} {TASK_PRIORITY_LABELS[currentPriority]}</>,
            }))}
            style={{ marginTop: '8px' }}
          />
        </div>

        <div className="form-group">
          <label className="ui-label">Статус</label>
          <SegmentedControl
            size="sm"
            value={status}
            onChange={setStatus}
            options={(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((currentStatus) => ({
              value: currentStatus,
              label: <>{STATUS_ICONS[currentStatus]} {TASK_STATUS_LABELS[currentStatus]}</>,
            }))}
            style={{ marginTop: '8px' }}
          />
        </div>

        <div className="form-group">
          <label className="ui-label">Теги</label>
          <div style={{ marginTop: '8px' }}>
            <TaskTagPicker selectedTags={tags} onChange={setTags} />
          </div>
        </div>

        {sections.length > 0 && (
          <div className="form-group">
            <label className="ui-label">Разделы шаблона</label>
            <div className="task-card__tags" style={{ marginTop: '8px' }}>
              {sections.map((section) => (
                <TagChip key={section.id} size="sm">{section.title}</TagChip>
              ))}
            </div>
          </div>
        )}
      </form>
    </Drawer>
  );
}

export function TaskHelperPage() {
  const { tasks, isLoaded, error, addTask } = useTasks();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const allTags = useMemo(() => {
    const tagMap = new Map<string, TaskTag>();
    tasks.forEach((task) => {
      task.tags?.forEach((taskTag) => {
        if (!tagMap.has(taskTag.name)) {
          tagMap.set(taskTag.name, taskTag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const query = searchQuery.toLowerCase();
        if (query && !task.title.toLowerCase().includes(query) && !task.description.toLowerCase().includes(query)) {
          return false;
        }
        if (filterStatus !== 'all' && task.status !== filterStatus) return false;
        if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
        if (filterTag !== 'all' && !task.tags?.some((taskTag) => taskTag.name === filterTag)) return false;
        return true;
      })
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }, [tasks, searchQuery, filterStatus, filterPriority, filterTag]);

  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterTag !== 'all';

  const handleCreate = async (
    title: string,
    desc: string,
    priority: TaskPriority,
    status: TaskStatus,
    tags: TaskTag[],
    sections: TaskSection[],
    template: TaskTemplate
  ) => {
    try {
      await addTask(title, desc, {
        priority,
        status,
        tags,
        sections,
        historyMetadata: {
          templateId: template.id,
          templateName: template.name,
        },
      });
      notify('Задача создана');
    } catch (createError) {
      notify('Не удалось создать задачу', 'error');
      throw createError;
    }
  };

  if (!isLoaded) {
    return <TaskListSkeleton />;
  }

  if (error) {
    return (
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center' }}>
          <Island flex={false} style={{ padding: '32px', maxWidth: '400px', border: '1px solid var(--danger-border)' }}>
            <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px' }}>Ошибка подключения</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/settings')}>
              Перейти в настройки
            </Button>
          </Island>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="tool-page anim-fade-in">
        <div className="tool-page__content tool-page__content--auto">
          <Toolbar>
            <Toolbar.Left style={{ flex: 1 }}>
              <SearchInput value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} placeholder="Поиск задач..." wrapperStyle={{ maxWidth: '500px' }} />
            </Toolbar.Left>
            <Toolbar.Right>
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                title="Фильтры"
                icon={<SlidersHorizontal size={16} />}
              >
                {hasActiveFilters && <span className="filter-dot" />}
                Фильтры
              </Button>
              <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => setIsDrawerOpen(true)}>
                Создать
              </Button>
            </Toolbar.Right>
          </Toolbar>

          {showFilters && (
            <Island flex={false} className="task-filters anim-fade-in" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="task-filters__group">
                  <span className="task-filters__label"><Filter size={12} /> Статус</span>
                  <div className="task-filters__chips">
                    <button className={`filter-chip ${filterStatus === 'all' ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus('all')}>Все</button>
                    {(['open', 'in_progress', 'review', 'done', 'closed'] as TaskStatus[]).map((currentStatus) => (
                      <button key={currentStatus} className={`filter-chip ${filterStatus === currentStatus ? 'filter-chip--active' : ''}`} onClick={() => setFilterStatus(currentStatus)}>
                        {STATUS_ICONS[currentStatus]} {TASK_STATUS_LABELS[currentStatus]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="task-filters__group">
                  <span className="task-filters__label"><Flame size={12} /> Приоритет</span>
                  <div className="task-filters__chips">
                    <button className={`filter-chip ${filterPriority === 'all' ? 'filter-chip--active' : ''}`} onClick={() => setFilterPriority('all')}>Все</button>
                    {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((currentPriority) => (
                      <button key={currentPriority} className={`filter-chip ${filterPriority === currentPriority ? 'filter-chip--active' : ''}`} onClick={() => setFilterPriority(currentPriority)}>
                        {PRIORITY_ICONS[currentPriority]} {TASK_PRIORITY_LABELS[currentPriority]}
                      </button>
                    ))}
                  </div>
                </div>

                {allTags.length > 0 && (
                  <div className="task-filters__group">
                    <span className="task-filters__label"><Tag size={12} /> Тег</span>
                    <div className="task-filters__chips">
                      <button
                        className={`filter-chip ${filterTag === 'all' ? 'filter-chip--active' : ''}`}
                        onClick={() => setFilterTag('all')}
                      >
                        Все
                      </button>
                      {allTags.map((taskTag) => (
                        <button
                          key={taskTag.name}
                          className={`filter-chip ${filterTag === taskTag.name ? 'filter-chip--active' : ''}`}
                          style={{ '--chip-color': taskTag.color } as React.CSSProperties}
                          onClick={() => setFilterTag(taskTag.name)}
                        >
                          {taskTag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<X size={12} />}
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterPriority('all');
                      setFilterTag('all');
                    }}
                  >
                    Сбросить фильтры
                  </Button>
                )}
              </div>
            </Island>
          )}

          <div className="task-stats" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            <span className="task-stats__item">Всего: <strong>{tasks.length}</strong></span>
            <span className="task-stats__item" style={{ marginLeft: '16px' }}>В работе: <strong>{tasks.filter((task) => task.status === 'in_progress').length}</strong></span>
          </div>

          <div className="task-list custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="task-list-empty" style={{ padding: '60px 0' }}>
                <FileText size={48} opacity={0.2} />
                <p style={{ marginTop: '16px' }}>{searchQuery || hasActiveFilters ? 'Ничего не найдено' : 'Задач пока нет'}</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <Link to={`/task-helper/${task.id}`} key={task.id} className="task-card">
                  <div className="task-card__content">
                    <div className="task-card__top">
                      <Badge variant={PRIORITY_BADGE_VARIANTS[task.priority ?? 'medium']} dot>
                        {TASK_PRIORITY_LABELS[task.priority ?? 'medium']}
                      </Badge>
                      <Badge variant={STATUS_BADGE_VARIANTS[task.status ?? 'open']}>
                        {TASK_STATUS_LABELS[task.status ?? 'open']}
                      </Badge>
                    </div>

                    <h3 className="task-card__title">{task.title}</h3>
                    {task.description && <p className="task-card__desc">{task.description}</p>}
                    {task.tags && task.tags.length > 0 && (
                      <div className="task-card__tags">
                        {task.tags.map((taskTag) => (
                          <TagChip key={taskTag.id} color={taskTag.color} size="sm">
                            {taskTag.name}
                          </TagChip>
                        ))}
                      </div>
                    )}

                    <div className="task-card__meta">
                      <span className="meta-item"><Calendar size={12} /> {formatRelativeTime(task.updatedAt)}</span>
                      {task.sections.length > 0 && <span className="meta-item">{task.sections.length} разд.</span>}
                    </div>
                  </div>
                  <div className="task-card__action"><ChevronRight size={20} /></div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateTaskDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
