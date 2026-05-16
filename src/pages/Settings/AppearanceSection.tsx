import { memo } from 'react';
import { Select, ThemePreviewCard } from '../../ui';
import type { AppTheme, AppSettings } from '../../types';

const THEME_OPTIONS: { value: AppTheme; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Current dark theme' },
  { value: 'nothing', label: 'Nothing', description: 'Light technical blueprint theme' },
  { value: '099', label: '099', description: 'Dark terminal workbench theme' },
];

interface AppearanceSectionProps { settings: AppSettings; onThemeChange: (theme: AppTheme) => void; }

function AppearanceSection_({ settings, onThemeChange }: AppearanceSectionProps) {
  return (
    <div className="settings-section__body">
      <div className="settings-row settings-row--stacked">
        <div className="settings-row__info">
          <span className="settings-row__label">Тема приложения</span>
          <span className="settings-row__hint">Выберите тему кликом по превью. Изменения применяются сразу.</span>
        </div>
        <div className="settings-row__control">
          <div className="theme-preview-grid">
            {THEME_OPTIONS.map((option) => (
              <ThemePreviewCard key={option.value} value={option.value} label={option.label} description={option.description} selected={settings.theme === option.value} onSelect={onThemeChange} />
            ))}
          </div>
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row__info">
          <span className="settings-row__label">Тема приложения</span>
          <span className="settings-row__hint">Список тем для точного выбора и keyboard-навигации</span>
        </div>
        <div className="settings-row__control">
          <Select value={settings.theme} onChange={onThemeChange} options={THEME_OPTIONS} size="sm" />
        </div>
      </div>
    </div>
  );
}

export const AppearanceSection = memo(AppearanceSection_);
