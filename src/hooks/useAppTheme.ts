import { useEffect } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_EVENT, SETTINGS_KEY, loadSettings } from '../lib/appSettings';
import type { AppTheme, AppSettings } from '../types';

const LIGHT_THEMES = new Set<AppTheme>(['nothing']);

function resolveTheme(settings?: Partial<AppSettings>): AppTheme {
  return settings?.theme ?? DEFAULT_SETTINGS.theme;
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = LIGHT_THEMES.has(theme) ? 'light' : 'dark';
}

export function useAppTheme() {
  useEffect(() => {
    applyTheme(resolveTheme(loadSettings()));

    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppSettings>;
      applyTheme(resolveTheme(customEvent.detail));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_KEY) {
        return;
      }

      if (!event.newValue) {
        applyTheme(DEFAULT_SETTINGS.theme);
        return;
      }

      try {
        applyTheme(resolveTheme(JSON.parse(event.newValue) as Partial<AppSettings>));
      } catch {
        applyTheme(DEFAULT_SETTINGS.theme);
      }
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsChange as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSettingsChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
}
