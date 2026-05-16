import { memo, useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ApiResponse } from '../../types';
import { Badge, Button, EmptyState, InlineError, Loader } from '../../ui';
import { getStatusVariant } from '../../lib/responseUtils';

type ResponseTab = 'body' | 'headers';

interface ResponseViewerProps {
  response: ApiResponse | null;
  isLoading: boolean;
  error: string | null;
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
      <Loader className="response-viewer__state" size="lg" label="Отправка запроса..." />
    );
  }

  if (error) {
    return (
      <InlineError className="response-viewer__state response-viewer__state--error" message={error} />
    );
  }

  if (!response) {
    return (
      <EmptyState
        className="response-viewer__state"
        icon={null}
        description="Ответ появится здесь после отправки запроса."
      />
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
