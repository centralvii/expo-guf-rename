import { memo, useCallback } from 'react';
import { Wand2 } from 'lucide-react';
import type { ApiBodyType } from '../../types';
import { Button, SegmentedControl, Textarea } from '../../ui';

interface BodyEditorProps {
  bodyType: ApiBodyType;
  bodyContent: string;
  disabled?: boolean;
  onTypeChange: (type: ApiBodyType) => void;
  onContentChange: (content: string) => void;
}

const BODY_TYPES: { value: ApiBodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'form-urlencoded', label: 'Form URL-encoded' },
];

export const BodyEditor = memo(function BodyEditor({
  bodyType,
  bodyContent,
  disabled = false,
  onTypeChange,
  onContentChange,
}: BodyEditorProps) {
  const formatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(bodyContent);
      onContentChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Игнорируем — невалидный JSON
    }
  }, [bodyContent, onContentChange]);

  return (
    <div className="body-editor">
      <div className="body-editor__toolbar">
        <div className="body-editor__types">
          <SegmentedControl value={bodyType} options={BODY_TYPES} onChange={onTypeChange} size="sm" />
        </div>
        {bodyType === 'json' && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Wand2 size={14} />}
            onClick={formatJson}
            disabled={!bodyContent.trim()}
          >
            Форматировать
          </Button>
        )}
      </div>

      {disabled && (
        <p className="body-editor__disabled-msg">
          Тело запроса недоступно для методов GET и HEAD.
        </p>
      )}

      {!disabled && bodyType === 'none' && (
        <p className="body-editor__disabled-msg">
          Тело запроса не будет отправлено.
        </p>
      )}

      {!disabled && bodyType !== 'none' && (
        <Textarea
          value={bodyContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={
            bodyType === 'json'
              ? '{\n  "key": "value"\n}'
              : bodyType === 'form-urlencoded'
              ? 'key1=value1&key2=value2'
              : 'Произвольный текст...'
          }
          className="body-editor__textarea"
          fullWidth
          spellCheck={false}
        />
      )}
    </div>
  );
});
