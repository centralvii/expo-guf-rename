import { memo, type ReactNode } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { Button } from '../../ui';

interface DataSectionProps {
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row__info">
        <span className="settings-row__label">{label}</span>
        {hint && <span className="settings-row__hint">{hint}</span>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

function DataSection_({ onExport, onImport, onClear }: DataSectionProps) {
  return (
    <div className="settings-section__body">
      <SettingsRow label="Экспорт настроек" hint="Сохранить текущую конфигурацию в JSON файл">
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={onExport}>Экспорт</Button>
      </SettingsRow>
      <SettingsRow label="Импорт настроек" hint="Восстановить конфигурацию из JSON файла">
        <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={onImport}>Импорт</Button>
      </SettingsRow>
      <SettingsRow label="Очистка локальных данных" hint="Удалит сохранённые BPMN-диаграммы, API-запросы и локальные сессии. Настройки подключения сохранятся.">
        <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={onClear}>Очистить</Button>
      </SettingsRow>
    </div>
  );
}

export const DataSection = memo(DataSection_);
