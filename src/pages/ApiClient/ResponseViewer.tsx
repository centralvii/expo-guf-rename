import { memo, useState, useMemo } from 'react';
import { Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { ApiResponse } from '../../types';
import { Button } from '../../ui/Button/Button';
import { Badge } from '../../ui/Badge/Badge';
import type { BadgeVariant } from '../../ui/Badge/Badge';

type ResponseTab = 'body' | 'headers';

interface ResponseViewerProps {
  response: ApiResponse | null;
  isLoading: boolean;
  error: string | null;
}

function getStatusVariant(status: number): BadgeVariant {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'danger';
  return 'default';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function tryFormatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export const ResponseViewer = memo(function ResponseViewer({
  response,
  isLoading,
  error,
}: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [isPretty, setIsPretty] = useState(true);
  const [copied, setCopied] = useState(false);

  const displayBody = useMemo(() => {
    if (!response) return '';
    if (isPretty && response.contentType.includes('json')) {
      return tryFormatJson(response.body);
    }
    return response.body;
  }, [response, isPretty]);

  const handleCopy = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(displayBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // игнорируем
    }
  };

  if (isLoading) {
    return (
      <div className="response-viewer__state">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)', opacity: 0.7 }} />
        <p className="response-viewer__state-text">Отправка запроса...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-viewer__state response-viewer__state--error">
        <AlertCircle size={32} />
        <p className="response-viewer__state-text">{error}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-viewer__state">
        <p className="response-viewer__state-text">
          Ответ появится здесь после отправки запроса.
        </p>
      </div>
    );
  }

  return (
    <div className="response-viewer">
      <div className="response-viewer__meta">
        <div className="response-viewer__meta-item">
          <span className="response-viewer__meta-label">Статус</span>
          <Badge variant={getStatusVariant(response.status)} dot>
            {response.status} {response.statusText}
          </Badge>
        </div>
        <div className="response-viewer__meta-item">
          <span className="response-viewer__meta-label">Время</span>
          <span className="response-viewer__meta-value">{response.durationMs} ms</span>
        </div>
        <div className="response-viewer__meta-item">
          <span className="response-viewer__meta-label">Размер</span>
          <span className="response-viewer__meta-value">{formatSize(response.sizeBytes)}</span>
        </div>
      </div>

      <div className="response-viewer__tabs">
        <button
          type="button"
          className={`response-viewer__tab ${activeTab === 'body' ? 'response-viewer__tab--active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Тело ответа
        </button>
        <button
          type="button"
          className={`response-viewer__tab ${activeTab === 'headers' ? 'response-viewer__tab--active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
          <span className="response-viewer__tab-count">{Object.keys(response.headers).length}</span>
        </button>

        <div className="response-viewer__tab-actions">
          {activeTab === 'body' && response.contentType.includes('json') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPretty(!isPretty)}
            >
              {isPretty ? 'Raw' : 'Pretty'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={handleCopy}
            title="Скопировать"
          >
            {copied ? 'Скопировано' : 'Копировать'}
          </Button>
        </div>
      </div>

      <div className="response-viewer__content custom-scrollbar">
        {activeTab === 'body' ? (
          <pre className="response-viewer__body">{displayBody}</pre>
        ) : (
          <table className="response-viewer__headers">
            <tbody>
              {Object.entries(response.headers).map(([key, value]) => (
                <tr key={key}>
                  <td className="response-viewer__header-key">{key}</td>
                  <td className="response-viewer__header-value">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});
