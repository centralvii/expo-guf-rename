/**
 * Редактор README.txt для включения в архив.
 * Позволяет писать заметки о поставке обновлений.
 */

import { FileText } from 'lucide-react';

interface ReadmeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReadmeEditor({ value, onChange }: ReadmeEditorProps) {
  return (
    <div className="readme-card">
      <div className="readme-card__header">
        <h2>
          <FileText size={18} />
          Заметки к поставке
        </h2>
        <span className="readme-card__hint">
          Будет включён в архив как README.txt
        </span>
      </div>
      <textarea
        className="readme-card__textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Опишите изменения, версию, автора или любые другие заметки к поставке обновлений…"
        rows={5}
      />
    </div>
  );
}
