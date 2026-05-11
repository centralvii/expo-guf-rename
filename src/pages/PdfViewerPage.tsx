import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FilePlus, Search, Trash2, Edit3,
  ZoomIn, ZoomOut, Bookmark,
  Loader2,
  ExternalLink, ArrowLeft,
  PanelRight, PanelRightClose,
  FileSearch,
  ArrowRight,
  Maximize,
  Expand
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import {
  fetchPdfDocuments,
  deletePdfDocument,
  renamePdfDocument,
  fetchPdfAnnotations,
  addPdfAnnotation,
  deletePdfAnnotation,
  getPdfPublicUrl
} from '../lib/pdfRepository';
import type { PdfDocument, PdfAnnotation, PdfBoundingBox } from '../types';
import { PdfDocumentViewer } from '../components/pdf/PdfDocumentViewer';
import { PdfUploader } from '../components/pdf/PdfUploader';
import { PdfAnnotationSidebar } from '../components/pdf/PdfAnnotationSidebar';
import { getCachedPdfBlob, cachePdfBlob } from '../utils/pdfPersistence';

// --- UI-Kit Imports ---
import { Button } from '../ui/Button/Button';
import { Input } from '../ui/Input/Input';
import { Textarea } from '../ui/Input/Textarea';
import { Modal } from '../ui/Modal/Modal';
import { Toolbar } from '../ui/Toolbar/Toolbar';
import { Island } from '../ui/Layout/Island';
import { PageTitle } from '../ui/Layout/PageTitle';
import { Table } from '../ui/Table/Table';

type ModalType = 'rename-doc' | 'delete-doc' | 'add-annotation' | 'delete-annotation' | null;

export function PdfViewerPage() {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [localBlob, setLocalBlob] = useState<Blob | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnnotationsLoading, setIsAnnotationsLoading] = useState(false);
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // UI State
  const [zoomMode, setZoomMode] = useState<'fit-page' | 'fit-width' | 'custom'>('fit-page');
  const [scale, setScale] = useState(1.0);
  const [searchTerm, setSearchBase] = useState('');
  const [showNotes, setShowNotes] = useState(true);
  const [viewMode, setViewMode] = useState<'library' | 'viewer'>('library');

  // Modal State
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [modalValue, setModalValue] = useState('');
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  // Container measurement
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { notify } = useToast();

  const activeDoc = useMemo(() =>
    documents.find(d => d.id === selectedDocId)
    , [documents, selectedDocId]);

  // Memoize the URL
  const pdfUrl = useMemo(() => {
    if (!localBlob) return null;
    return URL.createObjectURL(localBlob);
  }, [localBlob]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Initial Load
  useEffect(() => {
    loadDocs();
  }, []);

  // Sync Data on selection
  useEffect(() => {
    if (selectedDocId) {
      loadDocumentData(selectedDocId);
      loadAnnotations(selectedDocId);
    } else {
      setAnnotations([]);
      setLocalBlob(null);
      setSelectedAnnotationId(null);
    }
  }, [selectedDocId]);

  // Resize Observer
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver((entries) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const entry of entries) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      }, 150);
    });

    observer.observe(scrollContainerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [viewMode]);

  // Modal cleanup effect
  useEffect(() => {
    if (activeModal === null) {
      const timer = setTimeout(() => {
        setModalData(null);
        setModalValue('');
        setIsModalSubmitting(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeModal]);

  async function loadDocs() {
    setIsLoading(true);
    try {
      const docs = await fetchPdfDocuments();
      setDocuments(docs);
    } catch (e) {
      notify('Ошибка при загрузке документов', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDocumentData(docId: string) {
    setIsBlobLoading(true);
    try {
      const cached = await getCachedPdfBlob(docId);
      if (cached) {
        setLocalBlob(cached);
        setIsBlobLoading(false);
        return;
      }
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;
      const url = getPdfPublicUrl(doc.storagePath);
      const response = await fetch(url);
      const blob = await response.blob();
      await cachePdfBlob(docId, blob);
      setLocalBlob(blob);
    } catch (e) {
      notify('Не удалось загрузить файл', 'error');
    } finally {
      setIsBlobLoading(false);
    }
  }

  async function loadAnnotations(docId: string) {
    setIsAnnotationsLoading(true);
    try {
      const data = await fetchPdfAnnotations(docId);
      setAnnotations(data);
    } catch (e) {
      notify('Ошибка при загрузке заметок', 'error');
    } finally {
      setIsAnnotationsLoading(false);
    }
  }

  const handleOpenDoc = (id: string) => {
    setSelectedDocId(id);
    setViewMode('viewer');
    setZoomMode('fit-page');
  };

  const handleBackToLibrary = () => {
    setViewMode('library');
    setSelectedDocId(null);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleAddAnnotation = (data: { pageNumber: number; boundingBox: PdfBoundingBox; textExcerpt: string }) => {
    if (!selectedDocId) return;
    setModalData(data);
    setModalValue('');
    setActiveModal('add-annotation');
  };

  const onConfirmAddAnnotation = async () => {
    if (!selectedDocId || !modalData || !modalValue.trim()) return;
    setIsModalSubmitting(true);
    try {
      const newAnn = await addPdfAnnotation({
        documentId: selectedDocId,
        content: modalValue.trim(),
        pageNumber: modalData.pageNumber,
        boundingBox: modalData.boundingBox,
        textExcerpt: modalData.textExcerpt
      });
      setAnnotations(prev => [...prev, newAnn]);
      notify('Заметка сохранена');
      closeModal();
    } catch (e) {
      notify('Ошибка сохранения', 'error');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleDeleteAnnotation = (id: string) => {
    setModalData(id);
    setActiveModal('delete-annotation');
  };

  const onConfirmDeleteAnnotation = async () => {
    if (!modalData) return;
    setIsModalSubmitting(true);
    try {
      await deletePdfAnnotation(modalData);
      setAnnotations(prev => prev.filter(a => a.id !== modalData));
      notify('Заметка удалена', 'info');
      closeModal();
    } catch (e) {
      notify('Ошибка удаления', 'error');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleDeleteDoc = (doc: PdfDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalData(doc);
    setActiveModal('delete-doc');
  };

  const onConfirmDeleteDoc = async () => {
    if (!modalData) return;
    setIsModalSubmitting(true);
    try {
      await deletePdfDocument(modalData.id, modalData.storagePath);
      setDocuments(prev => prev.filter(d => d.id !== modalData.id));
      if (selectedDocId === modalData.id) {
        setSelectedDocId(null);
        setViewMode('library');
      }
      notify('Документ удален', 'error');
      closeModal();
    } catch (e) {
      notify('Ошибка удаления', 'error');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleRenameDoc = (doc: PdfDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalData(doc);
    setModalValue(doc.name);
    setActiveModal('rename-doc');
  };

  const onConfirmRenameDoc = async () => {
    if (!modalData || !modalValue.trim() || modalValue === modalData.name) {
      closeModal();
      return;
    }
    setIsModalSubmitting(true);
    try {
      await renamePdfDocument(modalData.id, modalValue.trim());
      setDocuments(prev => prev.map(d => d.id === modalData.id ? { ...d, name: modalValue.trim() } : d));
      notify('Название обновлено');
      closeModal();
    } catch (e) {
      notify('Ошибка переименования', 'error');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleZoomIn = () => {
    setZoomMode('custom');
    setScale(s => Math.min(3, s + 0.1));
  };

  const handleZoomOut = () => {
    setZoomMode('custom');
    setScale(s => Math.max(0.5, s - 0.1));
  };

  const filteredDocs = documents.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Rendering Helpers ---

  const renderLibrary = () => (
    <div className="pdf-lib anim-fade-in">
      <Toolbar>
        <Toolbar.Left>
          <PageTitle>
            Библиотека
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px', fontSize: '14px' }}>
              • {documents.length} PDF
            </span>
          </PageTitle>
        </Toolbar.Left>

        <div className="pdf-lib__search-wrap">
          <Input
            placeholder="Быстрый поиск по названию..."
            icon={<Search size={18} />}
            value={searchTerm}
            onChange={(e) => setSearchBase(e.target.value)}
            fullWidth
          />
        </div>

        <Toolbar.Right>
          <Button variant="primary" size="sm" icon={<FilePlus size={16} />} onClick={() => setShowUploader(true)}>
            Загрузить PDF
          </Button>
        </Toolbar.Right>
      </Toolbar>

      <Island className="pdf-table-card">
        {isLoading ? (
          <div className="pdf-state-centered island-loader">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)', opacity: 0.5 }} />
            <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Загрузка библиотеки...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="pdf-state-centered">
            <div className="pdf-empty-icon">
              <FileSearch size={40} />
            </div>
            <p style={{ fontWeight: 500 }}>{searchTerm ? 'Ничего не найдено' : 'Библиотека пуста'}</p>
            <p style={{ fontSize: '13px', opacity: 0.7 }}>Загрузите PDF документы для работы.</p>
          </div>
        ) : (
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell style={{ width: '40px' }}> </Table.HeaderCell>
                <Table.HeaderCell>Название документа</Table.HeaderCell>
                <Table.HeaderCell style={{ width: '180px' }}>Дата загрузки</Table.HeaderCell>
                <Table.HeaderCell style={{ width: '120px' }}>Управление</Table.HeaderCell>
                <Table.HeaderCell style={{ width: '140px' }}> </Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredDocs.map(doc => (
                <Table.Row key={doc.id} onClick={() => handleOpenDoc(doc.id)} className="pdf-row">
                  <Table.Cell><Bookmark size={18} className="pdf-row__icon" /></Table.Cell>
                  <Table.Cell><div className="pdf-row__title" title={doc.name}>{doc.name}</div></Table.Cell>
                  <Table.Cell><div className="pdf-row__date">{new Date(doc.createdAt).toLocaleDateString('ru-RU')}</div></Table.Cell>
                  <Table.Cell>
                    <div className="pdf-row__actions">
                      <Button variant="ghost" size="sm" onClick={(e) => handleRenameDoc(doc, e)} title="Переименовать"><Edit3 size={14} /></Button>
                      <Button variant="danger" size="sm" onClick={(e) => handleDeleteDoc(doc, e)} title="Удалить"><Trash2 size={14} /></Button>
                    </div>
                  </Table.Cell>
                  <Table.Cell style={{ textAlign: 'right' }}><div className="pdf-row__open-btn">Открыть <ArrowRight size={14} /></div></Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Island>
    </div>
  );

  const renderViewer = () => (
    <div className="pdf-viewer-layout anim-fade-in">
      <Toolbar>
        <Toolbar.Left>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={16} />} onClick={handleBackToLibrary}>
            Библиотека
          </Button>
          <Toolbar.Divider />
          <PageTitle>
            {activeDoc?.name && activeDoc.name.length > 30 ? `${activeDoc.name.slice(0, 30)}...` : activeDoc?.name}
          </PageTitle>
        </Toolbar.Left>

        <Toolbar.Right>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-muted)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <Button variant={zoomMode === 'fit-page' ? 'primary' : 'ghost'} size="sm" style={{ height: '28px', padding: '0 8px' }} onClick={() => setZoomMode('fit-page')} title="Вписать страницу"><Maximize size={14} /></Button>
            <Button variant={zoomMode === 'fit-width' ? 'primary' : 'ghost'} size="sm" style={{ height: '28px', padding: '0 8px' }} onClick={() => setZoomMode('fit-width')} title="По ширине"><Expand size={14} /></Button>
          </div>
          <Toolbar.Divider />
          <div className="pdf-viewer__zoom-group">
            <Button variant="ghost" size="sm" onClick={handleZoomOut}><ZoomOut size={15} /></Button>
            <span className="pdf-viewer__zoom-val">{zoomMode === 'custom' ? `${Math.round(scale * 100)}%` : 'Авто'}</span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn}><ZoomIn size={15} /></Button>
          </div>
          <Toolbar.Divider />
          <Button variant="secondary" size="sm" icon={<ExternalLink size={16} />} onClick={() => window.open(pdfUrl || '', '_blank')} style={{ width: '36px', padding: 0 }} title="Оригинал" />

          <Button
            variant={showNotes ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            style={{ width: '36px', height: '32px', padding: 0, justifyContent: 'center' }}
            title={showNotes ? 'Скрыть заметки' : 'Заметки'}
          >
            {showNotes ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
          </Button>

          <Button variant="danger" size="sm" onClick={() => activeDoc && handleDeleteDoc(activeDoc)} title="Удалить"><Trash2 size={16} /></Button>
        </Toolbar.Right>
      </Toolbar>

      <main className="pdf-viewer-island">
        <Island className="pdf-viewer__canvas-wrap" flex>
          <Island.ScrollArea ref={scrollContainerRef} className="pdf-viewer__canvas-scroll">
            {isBlobLoading ? (
              <div className="pdf-state-centered"><Button variant="ghost" isLoading size="lg" disabled>Подготовка документа...</Button></div>
            ) : pdfUrl && (
              <PdfDocumentViewer
                url={pdfUrl}
                annotations={annotations}
                selectedAnnotationId={selectedAnnotationId}
                onAddAnnotation={handleAddAnnotation}
                zoomMode={zoomMode}
                scale={scale}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
              />
            )}
          </Island.ScrollArea>
        </Island>

        <aside className={`pdf-notes-sidebar-wrap ${!showNotes ? 'pdf-notes-sidebar-wrap--collapsed' : ''}`}>
          <div className="pdf-notes-sidebar">
            {isAnnotationsLoading ? (
              <div className="pdf-state-centered"><Button variant="ghost" isLoading size="lg" disabled /></div>
            ) : (
              <PdfAnnotationSidebar
                annotations={annotations}
                selectedAnnotationId={selectedAnnotationId}
                onDelete={handleDeleteAnnotation}
                onNavigate={(p, annId) => {
                  setSelectedAnnotationId(annId);
                  setTimeout(() => {
                    const highlight = document.getElementById(`pdf-ann-${annId}`);
                    if (highlight) highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    else {
                      const el = document.querySelector(`.pdf-page-container[data-page-number="${p}"]`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 50);
                }}
              />
            )}
          </div>
        </aside>
      </main>
    </div>
  );

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content">
        {viewMode === 'library' ? renderLibrary() : renderViewer()}
      </div>
      {showUploader && <PdfUploader onSuccess={loadDocs} onClose={() => setShowUploader(false)} />}

      <Modal isOpen={activeModal === 'rename-doc'} onClose={closeModal} title="Переименовать" footer={<><Button size="sm" onClick={closeModal}>Отмена</Button><Button size="sm" variant="primary" onClick={onConfirmRenameDoc} disabled={isModalSubmitting || !modalValue.trim()}>Сохранить</Button></>}>
        <Input value={modalValue} onChange={(e) => setModalValue(e.target.value)} autoFocus label="Название файла" fullWidth />
      </Modal>

      <Modal isOpen={activeModal === 'delete-doc'} onClose={closeModal} title="Удалить?" variant="danger" footer={<><Button size="sm" onClick={closeModal}>Отмена</Button><Button size="sm" variant="danger" onClick={onConfirmDeleteDoc} disabled={isModalSubmitting}>Удалить</Button></>}>
        <p>Удалить <strong>{modalData?.name}</strong>?</p>
      </Modal>

      <Modal isOpen={activeModal === 'add-annotation'} onClose={closeModal} title="Новая заметка" icon={<Bookmark size={24} />} footer={<><Button size="sm" onClick={closeModal}>Отмена</Button><Button size="sm" variant="primary" onClick={onConfirmAddAnnotation} disabled={isModalSubmitting || !modalValue.trim()}>Добавить</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {modalData?.textExcerpt && <div className="custom-scrollbar" style={{ padding: '12px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontStyle: 'italic', borderLeft: '3px solid var(--accent)', maxHeight: '140px', overflowY: 'auto' }}>"{modalData.textExcerpt}"</div>}
          <Textarea label="Ваш комментарий" value={modalValue} onChange={(e) => setModalValue(e.target.value)} placeholder="О чем эта заметка?..." autoFocus fullWidth />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'delete-annotation'} onClose={closeModal} title="Удалить заметку?" variant="danger" footer={<><Button size="sm" onClick={closeModal}>Отмена</Button><Button size="sm" variant="danger" onClick={onConfirmDeleteAnnotation} disabled={isModalSubmitting}>Удалить</Button></>}>
        <p>Вы уверены?</p>
      </Modal>
    </div>
  );
}
