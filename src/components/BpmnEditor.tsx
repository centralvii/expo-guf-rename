import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

export interface BpmnDiagramStats {
  tasks: number;
  gateways: number;
  startEvents: number;
  endEvents: number;
  intermediateEvents: number;
  flows: number;
}

export interface BpmnEditorHandle {
  getXml: () => Promise<string>;
  importXml: (xml: string) => Promise<void>;
  fitViewport: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetDiagram: () => Promise<void>;
  exportImage: (format?: 'jpeg' | 'png') => Promise<void>;
  getStats: () => BpmnDiagramStats;
}

interface BpmnEditorProps {
  initialXml?: string;
  onChange?: () => void;
  onStatsChange?: (stats: BpmnDiagramStats) => void;
  onImportError?: (message: string) => void;
}

interface BpmnCanvas {
  zoom: (value?: string | number) => void | number;
}

interface BpmnElement {
  id: string;
  type: string;
}

interface BpmnModelerInstance {
  saveXML: (options: { format: boolean }) => Promise<{ xml?: string }>;
  importXML: (xml: string) => Promise<unknown>;
  saveSVG: () => Promise<{ svg: string }>;
  get(service: 'canvas'): BpmnCanvas;
  get(service: 'elementRegistry'): { getAll: () => BpmnElement[] };
  get(service: 'selection'): { select: (elements: BpmnElement[]) => void };
  on: (event: string, callback: () => void) => void;
  destroy: () => void;
}

const EMPTY_STATS: BpmnDiagramStats = {
  tasks: 0,
  gateways: 0,
  startEvents: 0,
  endEvents: 0,
  intermediateEvents: 0,
  flows: 0,
};

export const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  targetNamespace="http://bpmn.io/schema/bpmn"
  id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Начало" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

function addDotGrid(container: HTMLDivElement) {
  const svg = container.querySelector('svg');
  if (!svg) return;

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  if (!defs.querySelector('#dot-grid')) {
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'dot-grid');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '24');
    pattern.setAttribute('height', '24');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '1.5');
    circle.setAttribute('cy', '1.5');
    circle.setAttribute('r', '1');
    circle.setAttribute('fill', '#d7deea');
    pattern.appendChild(circle);
    defs.appendChild(pattern);
  }

  const viewport = svg.querySelector('.djs-viewport');
  if (viewport && !viewport.querySelector('.djs-dot-bg')) {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('class', 'djs-dot-bg');
    bgRect.setAttribute('x', '-10000');
    bgRect.setAttribute('y', '-10000');
    bgRect.setAttribute('width', '30000');
    bgRect.setAttribute('height', '30000');
    bgRect.setAttribute('fill', 'url(#dot-grid)');
    bgRect.setAttribute('pointer-events', 'none');
    viewport.insertBefore(bgRect, viewport.firstChild);
  }
}

function collectDiagramStats(modeler: BpmnModelerInstance): BpmnDiagramStats {
  const stats = { ...EMPTY_STATS };
  const elements = modeler.get('elementRegistry').getAll();

  elements.forEach((element) => {
    if (element.type.endsWith('Task') || element.type === 'bpmn:CallActivity') {
      stats.tasks += 1;
      return;
    }

    if (element.type.endsWith('Gateway')) {
      stats.gateways += 1;
      return;
    }

    if (element.type === 'bpmn:StartEvent') {
      stats.startEvents += 1;
      return;
    }

    if (element.type === 'bpmn:EndEvent') {
      stats.endEvents += 1;
      return;
    }

    if (element.type.includes('Event')) {
      stats.intermediateEvents += 1;
      return;
    }

    if (element.type === 'bpmn:SequenceFlow') {
      stats.flows += 1;
    }
  });

  return stats;
}

export const BpmnEditor = forwardRef<BpmnEditorHandle, BpmnEditorProps>(
  ({ initialXml, onChange, onStatsChange, onImportError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const modelerRef = useRef<BpmnModelerInstance | null>(null);
    const listenerModelerRef = useRef<BpmnModelerInstance | null>(null);
    const initialXmlRef = useRef(initialXml);
    const onChangeRef = useRef(onChange);
    const onStatsChangeRef = useRef(onStatsChange);
    const onImportErrorRef = useRef(onImportError);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      onStatsChangeRef.current = onStatsChange;
    }, [onStatsChange]);

    useEffect(() => {
      onImportErrorRef.current = onImportError;
    }, [onImportError]);

    const applyImportedXml = useCallback(async (modeler: BpmnModelerInstance, xml: string) => {
      await modeler.importXML(xml);
      modeler.get('canvas').zoom('fit-viewport');
      onStatsChangeRef.current?.(collectDiagramStats(modeler));
      if (containerRef.current) {
        addDotGrid(containerRef.current);
      }
    }, []);

    const attachModelerListeners = useCallback((modeler: BpmnModelerInstance, isCancelledRef: { current: boolean }) => {
      if (listenerModelerRef.current === modeler) {
        return;
      }

      modeler.on('commandStack.changed', () => {
        if (isCancelledRef.current || !modelerRef.current) return;
        onChangeRef.current?.();
        onStatsChangeRef.current?.(collectDiagramStats(modelerRef.current));
      });
      listenerModelerRef.current = modeler;
    }, []);

    const createModeler = useCallback((container: HTMLDivElement) => {
      return new BpmnModeler({
        container,
      }) as unknown as BpmnModelerInstance;
    }, []);

    const recreateModeler = useCallback((isCancelledRef: { current: boolean }) => {
      const container = containerRef.current;
      if (!container) {
        throw new Error('Контейнер BPMN редактора недоступен.');
      }

      if (modelerRef.current) {
        modelerRef.current.destroy();
      }

      container.innerHTML = '';
      listenerModelerRef.current = null;
      const freshModeler = createModeler(container);
      modelerRef.current = freshModeler;
      return freshModeler;
    }, [createModeler]);

    const importXmlWithFallback = useCallback(async (
      modeler: BpmnModelerInstance,
      xml: string,
      errorMessage: string,
      rethrowError: boolean,
      isCancelledRef?: { current: boolean },
      reportError: boolean = true
    ) => {
      try {
        await applyImportedXml(modeler, xml);
      } catch {
        if (reportError) {
          onImportErrorRef.current?.(errorMessage);
        }

        try {
          const fallbackModeler = isCancelledRef ? recreateModeler(isCancelledRef) : modeler;
          await applyImportedXml(fallbackModeler, EMPTY_DIAGRAM);
          if (isCancelledRef) {
            attachModelerListeners(fallbackModeler, isCancelledRef);
          }
        } catch (fallbackError) {
          console.warn('[BpmnEditor] Fallback diagram also failed:', fallbackError);
        }

        if (rethrowError) {
          throw new Error(errorMessage);
        }
      }
    }, [applyImportedXml, attachModelerListeners, recreateModeler]);

    useImperativeHandle(ref, () => ({
      getXml: async () => {
        if (!modelerRef.current) return '';
        const { xml } = await modelerRef.current.saveXML({ format: true });
        return xml ?? '';
      },
      importXml: async (xml: string) => {
        if (!modelerRef.current) return;
        await importXmlWithFallback(
          modelerRef.current,
          xml,
          'Не удалось импортировать BPMN XML. Загружена пустая диаграмма.',
          true,
          { current: false },
          true
        );
      },
      fitViewport: () => {
        modelerRef.current?.get('canvas').zoom('fit-viewport');
      },
      zoomIn: () => {
        if (!modelerRef.current) return;
        const canvas = modelerRef.current.get('canvas');
        const current = Number(canvas.zoom() ?? 1);
        canvas.zoom(Math.min(4, current + 0.2));
      },
      zoomOut: () => {
        if (!modelerRef.current) return;
        const canvas = modelerRef.current.get('canvas');
        const current = Number(canvas.zoom() ?? 1);
        canvas.zoom(Math.max(0.2, current - 0.2));
      },
      resetDiagram: async () => {
        if (!modelerRef.current) return;
        await applyImportedXml(modelerRef.current, EMPTY_DIAGRAM);
      },
      exportImage: async (format: 'jpeg' | 'png' = 'jpeg') => {
        if (!modelerRef.current) return;

        const { svg } = await modelerRef.current.saveSVG();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = svgDoc.querySelector('svg');

        if (!svgEl) {
          throw new Error('Не удалось подготовить SVG диаграммы для экспорта.');
        }

        svgDoc.querySelector('.djs-dot-bg')?.remove();

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const viewBox = svgEl.getAttribute('viewBox')?.split(' ') ?? ['0', '0', '800', '600'];
        bg.setAttribute('x', viewBox[0]);
        bg.setAttribute('y', viewBox[1]);
        bg.setAttribute('width', viewBox[2]);
        bg.setAttribute('height', viewBox[3]);
        bg.setAttribute('fill', '#ffffff');
        svgEl.insertBefore(bg, svgEl.firstChild);

        const svgString = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        await new Promise<void>((resolve, reject) => {
          const img = new Image();

          img.onload = () => {
            const width = img.naturalWidth || 1200;
            const height = img.naturalHeight || 800;
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              URL.revokeObjectURL(svgUrl);
              reject(new Error('Не удалось подготовить canvas для экспорта диаграммы.'));
              return;
            }

            ctx.scale(scale, scale);

            if (format === 'jpeg') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
            }

            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(svgUrl);

            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const quality = format === 'jpeg' ? 0.95 : undefined;
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Не удалось сформировать изображение диаграммы.'));
                return;
              }

              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `diagram.${format}`;
              link.click();
              URL.revokeObjectURL(url);
              resolve();
            }, mimeType, quality);
          };

          img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            reject(new Error('Не удалось загрузить SVG для экспорта изображения.'));
          };

          img.src = svgUrl;
        });
      },
      getStats: () => {
        if (!modelerRef.current) return EMPTY_STATS;
        return collectDiagramStats(modelerRef.current);
      },
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Track if this effect is still active
      let isCancelled = false;
      const isCancelledRef = { current: false };
      let modeler: BpmnModelerInstance | null = null;

      const initModeler = async () => {
        // Create modeler
        modeler = createModeler(container);

        // Store reference only after successful creation
        modelerRef.current = modeler;

        // Check if cancelled during creation
        if (isCancelled) {
          modeler.destroy();
          if (modelerRef.current === modeler) {
            modelerRef.current = null;
          }
          return;
        }

        // Load initial diagram
        try {
          const xml = initialXmlRef.current || EMPTY_DIAGRAM;
          await importXmlWithFallback(
            modeler,
            xml,
            'Не удалось загрузить BPMN XML. Загружена пустая диаграмма.',
            false,
            isCancelledRef,
            false
          );
          
          if (isCancelled) return;
          if (modelerRef.current) {
            attachModelerListeners(modelerRef.current, isCancelledRef);
          }
        } catch {
          if (isCancelled) return;
        }

      };

      void initModeler();

      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
          if (
            !container?.contains(document.activeElement) &&
            document.activeElement !== document.body
          ) {
            return;
          }

          event.preventDefault();
          if (!modelerRef.current) return;
          const elementRegistry = modelerRef.current.get('elementRegistry');
          const selection = modelerRef.current.get('selection');
          const allElements = elementRegistry.getAll().filter(
            (element) => element.type !== 'bpmn:Process' && element.type !== '__implicitroot'
          );
          selection.select(allElements);
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        isCancelled = true;
        isCancelledRef.current = true;
        document.removeEventListener('keydown', handleKeyDown);
        if (modelerRef.current) {
          modelerRef.current.destroy();
          modelerRef.current = null;
        }
        listenerModelerRef.current = null;
      };
    }, [attachModelerListeners, createModeler, importXmlWithFallback]);

    return <div ref={containerRef} className="bpmn-editor-canvas" tabIndex={0} />;
  }
);

BpmnEditor.displayName = 'BpmnEditor';
