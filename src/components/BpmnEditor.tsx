/**
 * BpmnEditor — обёртка над bpmn-js Modeler.
 * Монтирует редактор в DOM-контейнер и предоставляет
 * методы импорта/экспорта XML через ref.
 */
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

export interface BpmnEditorHandle {
  getXml: () => Promise<string>;
  importXml: (xml: string) => Promise<void>;
  fitViewport: () => void;
  resetDiagram: () => Promise<void>;
  exportImage: (format?: 'jpeg' | 'png') => Promise<void>;
}

interface BpmnEditorProps {
  initialXml?: string;
  onChange?: () => void;
}

interface BpmnCanvas {
  zoom: (mode: string) => void;
}

interface BpmnElement {
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

/**
 * Добавляет точечный SVG-паттерн внутрь .djs-viewport —
 * он является частью SVG-холста и двигается вместе с ним при панорамировании.
 */
function addDotGrid(container: HTMLDivElement) {
  const svg = container.querySelector('svg');
  if (!svg) return;

  // defs
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  if (!defs.querySelector('#dot-grid')) {
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'dot-grid');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '20');
    pattern.setAttribute('height', '20');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '1');
    circle.setAttribute('cy', '1');
    circle.setAttribute('r', '1');
    circle.setAttribute('fill', '#c0c0c0');
    pattern.appendChild(circle);
    defs.appendChild(pattern);
  }

  // Rect внутри viewport — двигается вместе с холстом
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

export const BpmnEditor = forwardRef<BpmnEditorHandle, BpmnEditorProps>(
  ({ initialXml, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const modelerRef = useRef<BpmnModelerInstance | null>(null);

    useImperativeHandle(ref, () => ({
      getXml: async () => {
        if (!modelerRef.current) return '';
        const { xml } = await modelerRef.current.saveXML({ format: true });
        return xml ?? '';
      },
      importXml: async (xml: string) => {
        if (!modelerRef.current) return;
        await modelerRef.current.importXML(xml);
        modelerRef.current.get('canvas').zoom('fit-viewport');
        if (containerRef.current) addDotGrid(containerRef.current);
      },
      fitViewport: () => {
        modelerRef.current?.get('canvas').zoom('fit-viewport');
      },
      resetDiagram: async () => {
        if (!modelerRef.current) return;
        await modelerRef.current.importXML(EMPTY_DIAGRAM);
        modelerRef.current.get('canvas').zoom('fit-viewport');
        if (containerRef.current) addDotGrid(containerRef.current);
      },

      exportImage: async (format: 'jpeg' | 'png' = 'jpeg') => {
        if (!modelerRef.current) return;

        // Получаем SVG от bpmn-js
        const { svg } = await modelerRef.current.saveSVG();

        // Парсим SVG и убираем точечный фон перед экспортом
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = svgDoc.querySelector('svg')!;

        // Убираем dot-bg из экспорта
        svgDoc.querySelector('.djs-dot-bg')?.remove();

        // Белый фон
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const vb = svgEl.getAttribute('viewBox')?.split(' ') ?? ['0', '0', '800', '600'];
        bg.setAttribute('x', vb[0]);
        bg.setAttribute('y', vb[1]);
        bg.setAttribute('width', vb[2]);
        bg.setAttribute('height', vb[3]);
        bg.setAttribute('fill', '#ffffff');
        svgEl.insertBefore(bg, svgEl.firstChild);

        const svgString = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 1200;
          const h = img.naturalHeight || 800;
          const scale = 2; // retina

          const canvas = document.createElement('canvas');
          canvas.width = w * scale;
          canvas.height = h * scale;
          const ctx = canvas.getContext('2d')!;
          ctx.scale(scale, scale);

          if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
          }

          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(svgUrl);

          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = format === 'jpeg' ? 0.95 : undefined;
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `diagram.${format}`;
            a.click();
            URL.revokeObjectURL(url);
          }, mimeType, quality);
        };
        img.src = svgUrl;
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const modeler = new BpmnModeler({
        container: containerRef.current,
        // Keyboard binding is now handled differently or automatically in newer versions
      }) as unknown as BpmnModelerInstance;
      modelerRef.current = modeler;

      const loadInitial = async () => {
        try {
          const xml = initialXml || EMPTY_DIAGRAM;
          await modeler.importXML(xml);
          modeler.get('canvas').zoom('fit-viewport');
          if (containerRef.current) addDotGrid(containerRef.current);
        } catch (err) {
          console.error('Error importing BPMN XML:', err);
        }
      };

      loadInitial();

      if (onChange) {
        modeler.on('commandStack.changed', onChange);
      }

      // Ctrl+A — выделить все элементы диаграммы
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          if (
            !containerRef.current?.contains(document.activeElement) &&
            document.activeElement !== document.body
          ) return;

          e.preventDefault();
          const elementRegistry = modeler.get('elementRegistry');
          const selection = modeler.get('selection');
          const allElements = elementRegistry.getAll().filter(
            (el) => el.type !== 'bpmn:Process' && el.type !== '__implicitroot'
          );
          selection.select(allElements);
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        modeler.destroy();
        modelerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        ref={containerRef}
        className="bpmn-editor-canvas"
        tabIndex={0}
      />
    );
  }
);

BpmnEditor.displayName = 'BpmnEditor';
