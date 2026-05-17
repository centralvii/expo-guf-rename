import { useMemo, useState } from 'react';
import { FileDiff, History, RotateCcw } from 'lucide-react';
import { formatHistoryDate } from '../lib/dateFormat';
import { summarizeTaskChangesDetailed } from '../lib/taskHistory';
import { diffTaskCollections } from '../lib/taskDiff';
import type { TaskHistoryEntry } from '../types';
import { Badge, Button, Drawer, EmptyState, Modal } from '../ui';
import { TaskDiffModal } from './TaskDiffModal';
import { TaskHistorySkeleton } from './skeletons/TaskHistorySkeleton';
import './TaskHistoryDrawer.css';

interface TaskHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TaskHistoryEntry[];
  isLoading: boolean;
  taskTitle: string;
  onRestore: (entry: TaskHistoryEntry) => Promise<void>;
}

function getTypeBadge(type: TaskHistoryEntry['type']) {
  switch (type) {
    case 'created':
      return { label: 'Создано', variant: 'success' as const };
    case 'updated':
      return { label: 'Обновлено', variant: 'info' as const };
    case 'restored':
      return { label: 'Восстановлено', variant: 'warning' as const };
    default:
      return { label: type, variant: 'default' as const };
  }
}

export function TaskHistoryDrawer({
  isOpen,
  onClose,
  entries,
  isLoading,
  taskTitle,
  onRestore,
}: TaskHistoryDrawerProps) {
  const [selectedEntry, setSelectedEntry] = useState<TaskHistoryEntry | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<TaskHistoryEntry | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const selectedDiff = useMemo(() => {
    if (!selectedEntry) {
      return null;
    }

    return diffTaskCollections(
      selectedEntry.before ? [selectedEntry.before] : [],
      selectedEntry.after ? [selectedEntry.after] : []
    );
  }, [selectedEntry]);

  const handleClose = () => {
    setSelectedEntry(null);
    setRestoreCandidate(null);
    setIsRestoring(false);
    onClose();
  };

  const handleRestore = async () => {
    if (!restoreCandidate) {
      return;
    }

    setIsRestoring(true);
    try {
      await onRestore(restoreCandidate);
      setRestoreCandidate(null);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        title="История изменений"
        width="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="ui-label">Задача</span>
            <strong style={{ color: 'var(--text-primary)' }}>{taskTitle}</strong>
          </div>

          {isLoading ? (
            <TaskHistorySkeleton />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<History size={20} />}
              title="История пока пуста"
              description="Для этой задачи ещё нет записей истории."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {entries.map((entry) => {
                const badge = getTypeBadge(entry.type);
                const smartSummary = summarizeTaskChangesDetailed(entry.before, entry.after);
                const details = smartSummary.details.slice(0, 4);
                const hiddenDetailsCount = smartSummary.details.length - details.length;

                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      padding: '16px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {entry.summary ?? smartSummary.title}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatHistoryDate(entry.createdAt)}</span>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>

                    {entry.metadata?.templateName && (
                      <Badge variant="default">{entry.metadata.templateName}</Badge>
                    )}

                    {details.length > 0 && (
                      <ul className="task-history-entry__details">
                        {details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                        {hiddenDetailsCount > 0 && (
                          <li>{`+ ещё ${hiddenDetailsCount}`}</li>
                        )}
                      </ul>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FileDiff size={14} />}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        Посмотреть diff
                      </Button>
                      {entry.after && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<RotateCcw size={14} />}
                          onClick={() => setRestoreCandidate(entry)}
                        >
                          Восстановить версию
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      {selectedEntry && selectedDiff && (
        <TaskDiffModal
          isOpen={Boolean(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
          diff={selectedDiff}
          title="История изменений"
        />
      )}

      <Modal
        isOpen={Boolean(restoreCandidate)}
        onClose={() => setRestoreCandidate(null)}
        title="Восстановить эту версию?"
        footer={(
          <>
            <Button size="sm" onClick={() => setRestoreCandidate(null)} disabled={isRestoring}>Отмена</Button>
            <Button variant="primary" size="sm" onClick={handleRestore} isLoading={isRestoring}>
              Восстановить
            </Button>
          </>
        )}
      >
        <p>
          Текущая задача будет перезаписана сохранённым снимком от{' '}
          <strong>{restoreCandidate ? formatHistoryDate(restoreCandidate.createdAt) : ''}</strong>.
        </p>
      </Modal>
    </>
  );
}
