import { memo } from 'react';
import { FileDiff } from 'lucide-react';
import { Badge, Button, Modal } from '../ui';
import type {
  DiffLine,
  TaskCollectionDiff,
  TaskDiffEntry,
  TaskFieldDiff,
  TaskSectionDiff,
} from '../lib/taskDiff';
import './TaskDiffModal.css';

interface TaskDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: TaskCollectionDiff;
  onDiscard?: () => void;
}

function getTaskKindBadge(kind: TaskDiffEntry['kind']) {
  if (kind === 'added') return { label: 'Добавлена', variant: 'success' as const };
  if (kind === 'removed') return { label: 'Удалена', variant: 'danger' as const };
  return { label: 'Изменена', variant: 'warning' as const };
}

function getSectionKindBadge(kind: TaskSectionDiff['kind']) {
  if (kind === 'added') return { label: 'Добавлен', variant: 'success' as const };
  if (kind === 'removed') return { label: 'Удалён', variant: 'danger' as const };
  return { label: 'Изменён', variant: 'warning' as const };
}

function getMarker(type: DiffLine['type']) {
  if (type === 'added') return '+';
  if (type === 'removed') return '-';
  return ' ';
}

const DiffLines = memo(function DiffLines({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="task-diff-lines">
      {lines.map((line, index) => (
        <div key={`${line.type}-${index}-${line.value}`} className={`task-diff-line task-diff-line--${line.type}`}>
          <span className="task-diff-line__marker">{getMarker(line.type)}</span>
          <code className="task-diff-line__value">{line.value || ' '}</code>
        </div>
      ))}
    </div>
  );
});

const FieldBlock = memo(function FieldBlock({ field }: { field: TaskFieldDiff }) {
  return (
    <section className="task-diff-field">
      <h4 className="task-diff-field__title">{field.label}</h4>
      <DiffLines lines={field.lines} />
    </section>
  );
});

const SectionBlock = memo(function SectionBlock({ section }: { section: TaskSectionDiff }) {
  const badge = getSectionKindBadge(section.kind);

  return (
    <section className="task-diff-section">
      <div className="task-diff-section__header">
        <h4 className="task-diff-section__title">{section.title}</h4>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="task-diff-section__block">
        <span className="task-diff-section__label">Название раздела</span>
        <DiffLines lines={section.titleDiff} />
      </div>

      <div className="task-diff-section__block">
        <span className="task-diff-section__label">Содержимое</span>
        <DiffLines lines={section.contentDiff} />
      </div>
    </section>
  );
});

export const TaskDiffModal = memo(function TaskDiffModal({
  isOpen,
  onClose,
  diff,
  onDiscard,
}: TaskDiffModalProps) {
  const footer = (
    <>
      {onDiscard && (
        <Button variant="ghost" size="sm" onClick={onDiscard}>
          Сбросить изменения
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={onClose}>
        Закрыть
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Восстановленные изменения"
      icon={<FileDiff size={24} />}
      size="lg"
      footer={footer}
    >
      {!diff.hasChanges ? (
        <p className="task-diff-empty">Нет отличий между сохранённой задачей и восстановленным черновиком.</p>
      ) : (
        <div className="task-diff-list">
          {diff.tasks.map((task) => {
            const badge = getTaskKindBadge(task.kind);

            return (
              <article key={task.taskId} className="task-diff-task">
                <div className="task-diff-task__header">
                  <div className="task-diff-task__headings">
                    <h3 className="task-diff-task__title">{task.title}</h3>
                    <span className="task-diff-task__meta">ID: {task.taskId}</span>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                {task.fieldDiffs.length > 0 && (
                  <div className="task-diff-task__group">
                    <span className="task-diff-task__group-title">Изменённые поля</span>
                    <div className="task-diff-task__fields">
                      {task.fieldDiffs.map((field) => (
                        <FieldBlock key={field.key} field={field} />
                      ))}
                    </div>
                  </div>
                )}

                {task.sectionDiffs.length > 0 && (
                  <div className="task-diff-task__group">
                    <span className="task-diff-task__group-title">Разделы</span>
                    <div className="task-diff-task__sections">
                      {task.sectionDiffs.map((section) => (
                        <SectionBlock key={section.sectionId} section={section} />
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Modal>
  );
});
