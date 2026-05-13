import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  Maximize2, Download, Upload, FilePlus, Save, Trash2, RotateCcw, FileImage, FileCode2, ChevronDown
} from 'lucide-react';
import { BpmnEditor, type BpmnEditorHandle } from '../components/BpmnEditor';
import { useToast } from '../hooks/useToast';

import { Button, EmptyState, IconButton, Input, Island, Modal, PageTitle, Panel, SectionHeader, Toolbar } from '../ui';

const STORAGE_KEY = 'bpmn_polygon_diagrams';

interface SavedDiagram {
  id: string;
  name: string;
  xml: string;
  updatedAt: number;
}

function loadDiagrams(): SavedDiagram[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveDiagrams(diagrams: SavedDiagram[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
}

export function BpmnPage() {
  const editorRef = useRef<BpmnEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notify } = useToast();

  const [diagrams, setDiagrams] = useState<SavedDiagram[]>(loadDiagrams);
  const [activeDiagramId, setActiveDiagramId] = useState<string | null>(
    () => loadDiagrams()[0]?.id ?? null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [diagramToDelete, setDiagramToDelete] = useState<SavedDiagram | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuClosing, setExportMenuClosing] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const closeExportMenu = useCallback(() => {
    setExportMenuClosing(true);
    setTimeout(() => {
      setShowExportMenu(false);
      setExportMenuClosing(false);
    }, 150);
  }, []);

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        closeExportMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu, closeExportMenu]);

  const activeDiagram = useMemo(() => 
    diagrams.find((d) => d.id === activeDiagramId) ?? null
  , [diagrams, activeDiagramId]);

  const handleNew = useCallback(() => {
    setActiveDiagramId(null);
    setIsDirty(false);
    setSaveNameInput('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    const xml = await editorRef.current.getXml();
    const name = saveNameInput.trim() || activeDiagram?.name || 'Без названия';

    if (activeDiagramId) {
      const updated = diagrams.map((d) =>
        d.id === activeDiagramId ? { ...d, name, xml, updatedAt: Date.now() } : d
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
  }, [editorRef, diagrams, activeDiagramId, activeDiagram, saveNameInput, notify]);

  const handleOpen = useCallback(async (diagram: SavedDiagram) => {
    setActiveDiagramId(diagram.id);
    setIsDirty(false);
    await editorRef.current?.importXml(diagram.xml);
  }, []);

  const handleDelete = useCallback((d: SavedDiagram) => {
    setDiagramToDelete(d);
    setShowDeleteModal(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (!diagramToDelete) return;
    const updated = diagrams.filter((d) => d.id !== diagramToDelete.id);
    saveDiagrams(updated);
    setDiagrams(updated);
    if (activeDiagramId === diagramToDelete.id) {
      setActiveDiagramId(updated[0]?.id ?? null);
    }
    notify('Диаграмма удалена', 'error');
    setShowDeleteModal(false);
    setDiagramToDelete(null);
  }, [diagrams, activeDiagramId, diagramToDelete, notify]);

  const handleExportXml = useCallback(async () => {
    if (!editorRef.current) return;
    const xml = await editorRef.current.getXml();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDiagram?.name ?? 'diagram'}.bpmn`;
    a.click();
    URL.revokeObjectURL(url);
    notify('BPMN файл скачан');
  }, [editorRef, activeDiagram, notify]);

  const handleExportImage = useCallback(async () => {
    await editorRef.current?.exportImage('jpeg');
    notify('Изображение скачано');
  }, [editorRef, notify]);

  const handleImportXml = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await editorRef.current?.importXml(text);
    setIsDirty(true);
    notify(`Импортировано: ${file.name}`);
    e.target.value = '';
  }, [editorRef, notify]);

  const handleFit = useCallback(() => {
    editorRef.current?.fitViewport();
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

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content">

        {/* --- Toolbar --- */}
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
                onClick={() => showExportMenu ? closeExportMenu() : setShowExportMenu(true)}
                icon={<Download size={14} />}
              >
                Экспорт <ChevronDown size={12} style={{ marginLeft: '4px' }} />
              </Button>
              {showExportMenu && (
                <div className={`bpmn-export-menu ${exportMenuClosing ? 'bpmn-export-menu--closing' : ''}`}>
                  <Button variant="ghost" size="sm" className="bpmn-export-menu__item" onClick={() => { handleExportXml(); closeExportMenu(); }}>
                    <FileCode2 size={14} /> BPMN файл (.bpmn)
                  </Button>
                  <Button variant="ghost" size="sm" className="bpmn-export-menu__item" onClick={() => { handleExportImage(); closeExportMenu(); }}>
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

        {/* --- Main Workspace --- */}
        <div className="bpmn-workspace">
          <Island className="bpmn-canvas-card">
            <BpmnEditor
              ref={editorRef}
              initialXml={activeDiagram?.xml}
              onChange={() => setIsDirty(true)}
            />
          </Island>

          <Panel as="aside" className="bpmn-diagrams-card" padded={false}>
            <SectionHeader className="bpmn-diagrams-card__header" title="Сохранённые" count={diagrams.length} />
            <div className="bpmn-diagrams-card__list custom-scrollbar">
              {diagrams.length === 0 && (
                <EmptyState className="bpmn-diagrams-card__empty" icon={null} description="Нет сохранённых диаграмм" />
              )}
              {diagrams.map((d) => (
                <div
                  key={d.id}
                  className={`bpmn-diagram-item ${d.id === activeDiagramId ? 'bpmn-diagram-item--active' : ''}`}
                  onClick={() => handleOpen(d)}
                >
                  <div className="bpmn-diagram-item__info">
                    <div className="bpmn-diagram-item__name">{d.name}</div>
                    <div className="bpmn-diagram-item__date">{new Date(d.updatedAt).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <IconButton
                    className="bpmn-diagram-item__delete"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={13} />}
                    label="Удалить"
                    onClick={(e) => { e.stopPropagation(); handleDelete(d); }}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* --- Modals --- */}
      <Modal 
        isOpen={showSaveModal} 
        onClose={() => setShowSaveModal(false)} 
        title="Сохранить диаграмму"
        footer={<>
          <Button size="sm" onClick={() => setShowSaveModal(false)}>Отмена</Button>
          <Button size="sm" variant="primary" onClick={handleSave} disabled={!saveNameInput.trim()}>Сохранить</Button>
        </>}
      >
        <Input 
          autoFocus 
          label="Название диаграммы" 
          value={saveNameInput} 
          onChange={(e) => setSaveNameInput(e.target.value)} 
          placeholder="Введите название..."
          fullWidth
          onKeyDown={(e) => e.key === 'Enter' && saveNameInput.trim() && handleSave()}
        />
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Удалить диаграмму?"
        variant="danger"
        footer={<>
          <Button size="sm" onClick={() => setShowDeleteModal(false)}>Отмена</Button>
          <Button size="sm" variant="danger" onClick={onConfirmDelete}>Удалить</Button>
        </>}
      >
        <p>Вы уверены, что хотите удалить диаграмму <strong>{diagramToDelete?.name}</strong>?</p>
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Сбросить холст?"
        variant="danger"
        footer={<>
          <Button size="sm" onClick={() => setShowResetModal(false)}>Отмена</Button>
          <Button size="sm" variant="danger" onClick={onConfirmReset}>Сбросить</Button>
        </>}
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
