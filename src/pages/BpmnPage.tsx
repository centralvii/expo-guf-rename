import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../Bpmn.css';
import {
  ChevronDown,
  CircleOff,
  CirclePlay,
  Download,
  FileCode2,
  FileImage,
  FilePlus,
  GitBranch,
  Maximize2,
  RotateCcw,
  Save,
  SquareStack,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BpmnEditor, type BpmnDiagramStats, type BpmnEditorHandle } from '../components/BpmnEditor';
import { useToast } from '../hooks/useToast';
import { Button, EmptyState, IconButton, Input, Island, Modal, PageTitle, Panel, SectionHeader, Toolbar } from '../ui';

const STORAGE_KEY = 'bpmn_polygon_diagrams';
const STORAGE_VERSION_KEY = 'bpmn_polygon_diagrams_version';
const STORAGE_VERSION = 2; // Increment when structure changes to trigger cleanup

interface SavedDiagram {
  id: string;
  name: string;
  xml: string;
  updatedAt: number;
}

const EMPTY_STATS: BpmnDiagramStats = {
  tasks: 0,
  gateways: 0,
  startEvents: 0,
  endEvents: 0,
  intermediateEvents: 0,
  flows: 0,
};

function loadDiagrams(): SavedDiagram[] {
  try {
    // Check for version mismatch and clear storage if needed
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== String(STORAGE_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
      return [];
    }

    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // Validate that it's an array
    if (!Array.isArray(parsed)) return [];
    // Filter out invalid entries and validate XML structure
    return parsed.filter((d: SavedDiagram) => {
      if (!d.id || !d.xml) return false;
      // Basic XML validation - check for bpmn:definitions
      return d.xml.includes('bpmn:definitions') || d.xml.includes('bpmndi:BPMNDiagram');
    });
  } catch {
    // On any parse error, clear storage
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveDiagrams(diagrams: SavedDiagram[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
}

export function BpmnPage() {
  const editorRef = useRef<BpmnEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { notify } = useToast();

  const [diagrams, setDiagrams] = useState<SavedDiagram[]>(loadDiagrams);
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(() => loadDiagrams()[0]?.id ?? null);
  const [diagramStats, setDiagramStats] = useState<BpmnDiagramStats>(EMPTY_STATS);
  const [isDirty, setIsDirty] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [diagramToDelete, setDiagramToDelete] = useState<SavedDiagram | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuClosing, setExportMenuClosing] = useState(false);

  const activeDiagram = useMemo(
    () => diagrams.find((diagram) => diagram.id === activeDiagramId) ?? null,
    [diagrams, activeDiagramId],
  );

  const closeExportMenu = useCallback(() => {
    setExportMenuClosing(true);
    setTimeout(() => {
      setShowExportMenu(false);
      setExportMenuClosing(false);
    }, 150);
  }, []);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        closeExportMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showExportMenu, closeExportMenu]);

  const handleNew = useCallback(() => {
    setActiveDiagramId(null);
    setIsDirty(false);
    setSaveNameInput('');
    setDiagramStats(EMPTY_STATS);
    void editorRef.current?.resetDiagram();
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;

    const xml = await editorRef.current.getXml();
    const name = saveNameInput.trim() || activeDiagram?.name || 'Без названия';

    if (activeDiagramId) {
      const updated = diagrams.map((diagram) =>
        diagram.id === activeDiagramId
          ? { ...diagram, name, xml, updatedAt: Date.now() }
          : diagram,
      );
      saveDiagrams(updated);
      setDiagrams(updated);
    } else {
      const newDiagram: SavedDiagram = {
        id: crypto.randomUUID(),
        name,
        xml,
        updatedAt: Date.now(),
      };
      const updated = [newDiagram, ...diagrams];
      saveDiagrams(updated);
      setDiagrams(updated);
      setActiveDiagramId(newDiagram.id);
    }

    setIsDirty(false);
    setShowSaveModal(false);
    setSaveNameInput('');
    notify('Диаграмма сохранена');
  }, [activeDiagram, activeDiagramId, diagrams, notify, saveNameInput]);

  const handleOpen = useCallback(async (diagram: SavedDiagram) => {
    setActiveDiagramId(diagram.id);
    setIsDirty(false);
    try {
      await editorRef.current?.importXml(diagram.xml);
    } catch (error) {
      console.error('Failed to open diagram:', error);
      notify('Не удалось открыть диаграмму. Возможно, файл повреждён.', 'error');
    }
  }, [notify]);

  const handleDelete = useCallback((diagram: SavedDiagram) => {
    setDiagramToDelete(diagram);
    setShowDeleteModal(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (!diagramToDelete) return;

    const updated = diagrams.filter((diagram) => diagram.id !== diagramToDelete.id);
    saveDiagrams(updated);
    setDiagrams(updated);

    if (activeDiagramId === diagramToDelete.id) {
      const nextDiagram = updated[0] ?? null;
      setActiveDiagramId(nextDiagram?.id ?? null);
      if (nextDiagram) {
        void editorRef.current?.importXml(nextDiagram.xml);
      } else {
        void editorRef.current?.resetDiagram();
      }
    }

    notify('Диаграмма удалена', 'error');
    setShowDeleteModal(false);
    setDiagramToDelete(null);
  }, [activeDiagramId, diagramToDelete, diagrams, notify]);

  const handleExportXml = useCallback(async () => {
    if (!editorRef.current) return;

    const xml = await editorRef.current.getXml();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDiagram?.name ?? 'diagram'}.bpmn`;
    link.click();
    URL.revokeObjectURL(url);
    notify('BPMN файл скачан');
  }, [activeDiagram, notify]);

  const handleExportImage = useCallback(async (format: 'jpeg' | 'png') => {
    await editorRef.current?.exportImage(format);
    notify(format === 'png' ? 'PNG изображение скачано' : 'JPG изображение скачано');
  }, [notify]);

  const handleImportXml = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    await editorRef.current?.importXml(text);
    setIsDirty(true);
    notify(`Импортировано: ${file.name}`);
    event.target.value = '';
  }, [notify]);

  const handleFit = useCallback(() => {
    editorRef.current?.fitViewport();
  }, []);

  const handleZoomIn = useCallback(() => {
    editorRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    editorRef.current?.zoomOut();
  }, []);

  const handleReset = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const onConfirmReset = useCallback(async () => {
    await editorRef.current?.resetDiagram();
    setIsDirty(true);
    notify('Диаграмма сброшена');
    setShowResetModal(false);
  }, [notify]);

  const summaryCards = [
    { label: 'Задачи', value: diagramStats.tasks, icon: <SquareStack size={13} /> },
    { label: 'Шлюзы', value: diagramStats.gateways, icon: <GitBranch size={13} /> },
    { label: 'Старт', value: diagramStats.startEvents, icon: <CirclePlay size={13} /> },
    { label: 'Финиш', value: diagramStats.endEvents, icon: <CircleOff size={13} />, danger: true },
  ];

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content">
        <Toolbar>
          <Toolbar.Left>
            <PageTitle isDirty={isDirty}>
              {activeDiagram?.name ?? 'Новая диаграмма'}
            </PageTitle>
          </Toolbar.Left>

          <Toolbar.Right>
            <Button variant="secondary" size="sm" onClick={handleFit} title="Вписать в экран" icon={<Maximize2 size={14} />}>
              Вписать
            </Button>
            <Button variant="secondary" size="sm" onClick={handleZoomOut} title="Уменьшить" icon={<ZoomOut size={14} />}>
              Минус
            </Button>
            <Button variant="secondary" size="sm" onClick={handleZoomIn} title="Увеличить" icon={<ZoomIn size={14} />}>
              Плюс
            </Button>
            <Button variant="secondary" size="sm" onClick={handleNew} title="Новая диаграмма" icon={<FilePlus size={14} />}>
              Новая
            </Button>
            <Button variant="danger" size="sm" onClick={handleReset} title="Сбросить разметку" icon={<RotateCcw size={14} />}>
              Сброс
            </Button>

            <Toolbar.Divider />

            <Button variant="secondary" size="sm" onClick={handleImportXml} icon={<Upload size={14} />}>
              Импорт
            </Button>

            <div className="bpmn-export-wrap" ref={exportMenuRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (showExportMenu ? closeExportMenu() : setShowExportMenu(true))}
                icon={<Download size={14} />}
              >
                Экспорт <ChevronDown size={12} style={{ marginLeft: '4px' }} />
              </Button>
              {showExportMenu && (
                <div className={`bpmn-export-menu ${exportMenuClosing ? 'bpmn-export-menu--closing' : ''}`}>
                  <Button variant="ghost" size="sm" className="bpmn-export-menu__item" onClick={() => { void handleExportXml(); closeExportMenu(); }}>
                    <FileCode2 size={14} /> BPMN файл (.bpmn)
                  </Button>
                  <Button variant="ghost" size="sm" className="bpmn-export-menu__item" onClick={() => { void handleExportImage('png'); closeExportMenu(); }}>
                    <FileImage size={14} /> Изображение (.png)
                  </Button>
                  <Button variant="ghost" size="sm" className="bpmn-export-menu__item" onClick={() => { void handleExportImage('jpeg'); closeExportMenu(); }}>
                    <FileImage size={14} /> Изображение (.jpg)
                  </Button>
                </div>
              )}
            </div>

            <Toolbar.Divider />

            <Button
              variant="primary"
              size="sm"
              icon={<Save size={14} />}
              onClick={() => {
                setSaveNameInput(activeDiagram?.name || '');
                setShowSaveModal(true);
              }}
            >
              Сохранить
            </Button>
          </Toolbar.Right>
        </Toolbar>

        <div className="bpmn-workspace">
          <Island className="bpmn-canvas-card">
            <BpmnEditor
              ref={editorRef}
              initialXml={activeDiagram?.xml}
              onChange={() => setIsDirty(true)}
              onStatsChange={setDiagramStats}
            />
          </Island>

          <Panel as="aside" className="bpmn-diagrams-card" padded={false}>
            <SectionHeader
              surface
              className="bpmn-diagrams-card__header"
              title="Полигон"
              description="Сохранённые схемы и текущая структура процесса"
              count={diagrams.length}
            />

            <div className="bpmn-sidebar-summary">
              <div className="bpmn-stats-grid">
                {summaryCards.map((card) => (
                  <div
                    key={card.label}
                    className={`bpmn-stat-card ${card.danger ? 'bpmn-stat-card--danger' : ''}`}
                  >
                    <span className="bpmn-stat-card__label">{card.icon} {card.label}</span>
                    <strong className="bpmn-stat-card__value">{card.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="bpmn-diagrams-card__list custom-scrollbar">
              {diagrams.length === 0 && (
                <EmptyState className="bpmn-diagrams-card__empty" icon={null} description="Нет сохранённых диаграмм" />
              )}
              {diagrams.map((diagram) => (
                <div
                  key={diagram.id}
                  className={`bpmn-diagram-item ${diagram.id === activeDiagramId ? 'bpmn-diagram-item--active' : ''}`}
                  onClick={() => void handleOpen(diagram)}
                >
                  <div className="bpmn-diagram-item__info">
                    <div className="bpmn-diagram-item__name">{diagram.name}</div>
                    <div className="bpmn-diagram-item__date">{new Date(diagram.updatedAt).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <IconButton
                    className="bpmn-diagram-item__delete"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={13} />}
                    label="Удалить"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(diagram);
                    }}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Сохранить диаграмму"
        footer={(
          <>
            <Button size="sm" onClick={() => setShowSaveModal(false)}>Отмена</Button>
            <Button size="sm" variant="primary" onClick={() => void handleSave()} disabled={!saveNameInput.trim()}>Сохранить</Button>
          </>
        )}
      >
        <Input
          autoFocus
          label="Название диаграммы"
          value={saveNameInput}
          onChange={(event) => setSaveNameInput(event.target.value)}
          placeholder="Введите название..."
          fullWidth
          onKeyDown={(event) => {
            if (event.key === 'Enter' && saveNameInput.trim()) {
              void handleSave();
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Удалить диаграмму?"
        variant="danger"
        footer={(
          <>
            <Button size="sm" onClick={() => setShowDeleteModal(false)}>Отмена</Button>
            <Button size="sm" variant="danger" onClick={onConfirmDelete}>Удалить</Button>
          </>
        )}
      >
        <p>Вы уверены, что хотите удалить диаграмму <strong>{diagramToDelete?.name}</strong>?</p>
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Сбросить холст?"
        variant="danger"
        footer={(
          <>
            <Button size="sm" onClick={() => setShowResetModal(false)}>Отмена</Button>
            <Button size="sm" variant="danger" onClick={() => void onConfirmReset()}>Сбросить</Button>
          </>
        )}
      >
        <p>Это действие полностью очистит текущую диаграмму. Все несохранённые изменения будут потеряны.</p>
      </Modal>

      <input
        ref={fileInputRef}
        type="file"
        accept=".bpmn,.xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
