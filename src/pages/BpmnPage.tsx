import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Maximize2, Download, Upload, FilePlus, Save, Trash2, RotateCcw, FileImage, FileCode2, ChevronDown
} from 'lucide-react';
import { BpmnEditor, type BpmnEditorHandle } from '../components/BpmnEditor';
import { useToast } from '../hooks/useToast';

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
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [savePanelClosing, setSavePanelClosing] = useState(false);

  const openSavePanel = useCallback(() => {
    setSavePanelClosing(false);
    setShowSavePanel(true);
  }, []);

  const closeSavePanel = useCallback(() => {
    setSavePanelClosing(true);
    setTimeout(() => {
      setShowSavePanel(false);
      setSavePanelClosing(false);
    }, 180);
  }, []);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuClosing, setExportMenuClosing] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const openExportMenu = useCallback(() => {
    setExportMenuClosing(false);
    setShowExportMenu(true);
  }, []);

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

  const activeDiagram = diagrams.find((d) => d.id === activeDiagramId) ?? null;

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
    closeSavePanel();
    setSaveNameInput('');
    notify('Диаграмма сохранена');
  }, [editorRef, diagrams, activeDiagramId, activeDiagram, saveNameInput, notify]);

  const handleOpen = useCallback(async (diagram: SavedDiagram) => {
    setActiveDiagramId(diagram.id);
    setIsDirty(false);
    await editorRef.current?.importXml(diagram.xml);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const updated = diagrams.filter((d) => d.id !== id);
    saveDiagrams(updated);
    setDiagrams(updated);
    if (activeDiagramId === id) {
      setActiveDiagramId(updated[0]?.id ?? null);
    }
    notify('Диаграмма удалена', 'error');
  }, [diagrams, activeDiagramId, notify]);

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

  const handleReset = useCallback(async () => {
    await editorRef.current?.resetDiagram();
    setIsDirty(true);
    notify('Диаграмма сброшена');
  }, [notify]);

  const handleFit = useCallback(() => {
    editorRef.current?.fitViewport();
  }, []);

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content" style={{ height: 'calc(100vh - 88px)' }}>

        {/* Toolbar card */}
        <div className="bpmn-toolbar-card">
          <div className="bpmn-toolbar-card__left">
            <span className="bpmn-toolbar-card__name">
              {activeDiagram?.name ?? 'Новая диаграмма'}
              {isDirty && <span className="bpmn-toolbar__dirty"> ●</span>}
            </span>
          </div>
          <div className="bpmn-toolbar-card__actions">
            <button className="btn-bpmn" onClick={handleFit} title="Вписать в экран">
              <Maximize2 size={14} /> Вписать
            </button>
            <button className="btn-bpmn" onClick={handleNew} title="Новая диаграмма">
              <FilePlus size={14} /> Новая
            </button>
            <button className="btn-bpmn btn-bpmn--danger" onClick={handleReset} title="Сбросить разметку">
              <RotateCcw size={14} /> Сброс
            </button>
            <div className="bpmn-toolbar__divider" />
            <button className="btn-bpmn" onClick={handleImportXml}>
              <Upload size={14} /> Импорт
            </button>
            <div className="bpmn-export-wrap" ref={exportMenuRef}>
              <button className="btn-bpmn" onClick={() => showExportMenu ? closeExportMenu() : openExportMenu()}>
                <Download size={14} /> Экспорт <ChevronDown size={12} />
              </button>
              {showExportMenu && (
                <div className={`bpmn-export-menu ${exportMenuClosing ? 'bpmn-export-menu--closing' : ''}`}>
                  <button className="bpmn-export-menu__item" onClick={() => { handleExportXml(); closeExportMenu(); }}>
                    <FileCode2 size={14} /> BPMN файл (.bpmn)
                  </button>
                  <button className="bpmn-export-menu__item" onClick={() => { handleExportImage(); closeExportMenu(); }}>
                    <FileImage size={14} /> Изображение (.jpg)
                  </button>
                </div>
              )}
            </div>
            <div className="bpmn-toolbar__divider" />
            <button
              className="btn-bpmn btn-bpmn--primary"
              onClick={() => showSavePanel ? closeSavePanel() : openSavePanel()}
            >
              <Save size={14} /> Сохранить
            </button>
          </div>
        </div>

        {/* Save panel */}
        {showSavePanel && (
          <div className={`bpmn-save-panel ${savePanelClosing ? 'bpmn-save-panel--closing' : ''}`}>
            <input
              autoFocus
              type="text"
              className="bpmn-save-panel__input"
              placeholder={activeDiagram?.name ?? 'Название диаграммы...'}
              value={saveNameInput}
              onChange={(e) => setSaveNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') closeSavePanel();
              }}
            />
            <button className="btn-bpmn btn-bpmn--primary" onClick={handleSave}>
              Сохранить
            </button>
            <button className="btn-bpmn" onClick={closeSavePanel}>
              Отмена
            </button>
          </div>
        )}

        {/* Editor + saved diagrams side by side */}
        <div className="bpmn-workspace">

          {/* Canvas card */}
          <div className="bpmn-canvas-card">
            <BpmnEditor
              ref={editorRef}
              initialXml={activeDiagram?.xml}
              onChange={() => setIsDirty(true)}
            />
          </div>

          {/* Saved diagrams card */}
          <div className="bpmn-diagrams-card">
            <div className="bpmn-diagrams-card__header">
              <span className="bpmn-diagrams-card__title">Сохранённые</span>
              <span className="bpmn-diagrams-card__count">{diagrams.length}</span>
            </div>
            <div className="bpmn-diagrams-card__list">
              {diagrams.length === 0 && (
                <div className="bpmn-diagrams-card__empty">
                  Нет сохранённых диаграмм
                </div>
              )}
              {diagrams.map((d) => (
                <div
                  key={d.id}
                  className={`bpmn-diagram-item ${d.id === activeDiagramId ? 'bpmn-diagram-item--active' : ''}`}
                  onClick={() => handleOpen(d)}
                >
                  <div className="bpmn-diagram-item__info">
                    <div className="bpmn-diagram-item__name">{d.name}</div>
                    <div className="bpmn-diagram-item__date">
                      {new Date(d.updatedAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <button
                    className="bpmn-diagram-item__delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                    title="Удалить"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

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
