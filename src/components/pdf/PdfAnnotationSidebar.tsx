import { MessageSquare, Trash2, Clock, Hash } from 'lucide-react';
import type { PdfAnnotation } from '../../types';

interface PdfAnnotationSidebarProps {
  annotations: PdfAnnotation[];
  selectedAnnotationId?: string | null;
  onDelete: (id: string) => void;
  onNavigate: (pageNum: number, annId: string) => void;
}

export function PdfAnnotationSidebar({ annotations, selectedAnnotationId, onDelete, onNavigate }: PdfAnnotationSidebarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Заметки</h3>
        <span style={{ 
          fontSize: '11px', 
          background: 'var(--bg-muted)', 
          padding: '2px 8px', 
          borderRadius: '100px',
          marginLeft: 'auto',
          border: '1px solid var(--border)'
        }}>
          {annotations.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="custom-scrollbar">
        {annotations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
              Выделите текст в PDF документе, чтобы создать заметку с привязкой.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {annotations.map(ann => {
              const isActive = ann.id === selectedAnnotationId;
              return (
                <div 
                  key={ann.id}
                  style={{ 
                    background: isActive ? 'var(--accent-soft)' : 'var(--bg-muted)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 4px 12px rgba(0, 112, 243, 0.15)' : 'none'
                  }}
                  onClick={() => onNavigate(ann.pageNumber, ann.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <Hash size={12} />
                      <span>СТР. {ann.pageNumber}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                      title="Удалить"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-primary)', 
                    fontWeight: 500,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {ann.content}
                  </div>

                  {ann.textExcerpt && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                      paddingLeft: '8px',
                      borderLeft: '2px solid var(--accent-border)',
                      margin: '4px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      "{ann.textExcerpt}"
                    </div>
                  )}

                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} />
                    <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
