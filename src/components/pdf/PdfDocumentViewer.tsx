import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, Plus } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { PdfAnnotation, PdfBoundingBox } from '../../types';

// --- UI-Kit Imports ---
import { Button } from '../../ui/Button/Button';

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfDocumentViewerProps {
  url: string;
  annotations: PdfAnnotation[];
  selectedAnnotationId?: string | null;
  onAddAnnotation: (data: { pageNumber: number; boundingBox: PdfBoundingBox; textExcerpt: string }) => void;
  zoomMode: 'fit-page' | 'fit-width' | 'custom';
  scale: number;
  containerWidth: number;
  containerHeight: number;
}

export const PdfDocumentViewer = memo(({ 
  url, 
  annotations, 
  selectedAnnotationId,
  onAddAnnotation, 
  zoomMode, 
  scale, 
  containerWidth, 
  containerHeight 
}: PdfDocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [selectionMenu, setSelectionMenu] = useState<{
    x: number;
    y: number;
    data: { pageNumber: number; boundingBox: PdfBoundingBox; textExcerpt: string };
  } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Clear menu on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionMenu(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleMouseUp = useCallback((pageNumber: number, e: React.MouseEvent) => {
    // Small timeout to let the selection settle
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionMenu(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length === 0) return;

      const pageElement = (e.target as HTMLElement).closest('.react-pdf__Page');
      if (!pageElement || !containerRef.current) return;

      const pageRect = pageElement.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Get the main bounding rect of the selection
      const rect = range.getBoundingClientRect();

      const boundingBox: PdfBoundingBox = {
        x: ((rect.left - pageRect.left) / pageRect.width) * 100,
        y: ((rect.top - pageRect.top) / pageRect.height) * 100,
        width: (rect.width / pageRect.width) * 100,
        height: (rect.height / pageRect.height) * 100,
      };

      const textExcerpt = selection.toString();

      // Position the button centered above the selection relative to viewer container
      setSelectionMenu({
        x: rect.left - containerRect.left + (rect.width / 2),
        y: rect.top - containerRect.top - 40,
        data: { pageNumber, boundingBox, textExcerpt }
      });
    }, 10);
  }, []);

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionMenu) {
      onAddAnnotation(selectionMenu.data);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  // Calculate dynamic scale based on mode
  const renderProps = (() => {
    const horizontalMargin = 48 + 16; 
    const verticalMargin = 40 + 8;

    if (zoomMode === 'fit-width') {
      return { width: Math.max(200, containerWidth - horizontalMargin) };
    }
    if (zoomMode === 'fit-page') {
      return { height: Math.max(200, containerHeight - verticalMargin) };
    }
    return { scale: scale };
  })();

  return (
    <div 
      ref={containerRef} 
      className="pdf-viewer-container" 
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
    >
      {/* Floating Selection Menu */}
      {selectionMenu && (
        <div 
          className="pdf-floating-wrap"
          style={{
            left: `${selectionMenu.x}px`,
            top: `${selectionMenu.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <Button
            variant="primary"
            className="pdf-floating-btn"
            onClick={handleAddClick}
            icon={<Plus size={14} strokeWidth={3} />}
          >
            Заметка
          </Button>
        </div>
      )}

      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className="pdf-state-centered"><Loader2 size={32} className="animate-spin" /></div>}
        error={<div className="pdf-state-centered" style={{ color: 'var(--danger)' }}>Ошибка загрузки документа</div>}
      >
        {Array.from(new Array(numPages), (_, index) => {
          const pageNum = index + 1;
          const pageAnnotations = annotations.filter(a => a.pageNumber === pageNum);

          return (
            <div 
              key={`page_${pageNum}`} 
              className="pdf-page-container"
              data-page-number={pageNum}
              onMouseUp={(e) => handleMouseUp(pageNum, e)}
            >
              <Page
                pageNumber={pageNum}
                {...renderProps}
                renderAnnotationLayer={true}
                renderTextLayer={true}
              />
              
              <div className="pdf-highlights-layer">
                {pageAnnotations
                  .filter(ann => ann.id === selectedAnnotationId)
                  .map(ann => (
                    <div
                      key={ann.id}
                      id={`pdf-ann-${ann.id}`}
                      className="pdf-highlight-item"
                      title={ann.content}
                      style={{
                        left: `${ann.boundingBox.x}%`,
                        top: `${ann.boundingBox.y}%`,
                        width: `${ann.boundingBox.width}%`,
                        height: `${ann.boundingBox.height}%`,
                      }}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </Document>
    </div>
  );
});

PdfDocumentViewer.displayName = 'PdfDocumentViewer';
