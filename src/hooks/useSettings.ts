import { useState, useCallback, useEffect } from 'react';
import type { AppSettings, ConnectionMethod } from '../types';
import { loadSettings, saveSettings, SETTINGS_EVENT, SETTINGS_KEY } from '../lib/appSettings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppSettings>;
      setSettings(customEvent.detail);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_KEY) {
        setSettings(loadSettings());
      }
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsChange as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSettingsChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const setConnectionMethod = useCallback((method: ConnectionMethod) => {
    updateSettings({ connectionMethod: method });
  }, [updateSettings]);

  return {
    settings,
    updateSettings,
    setConnectionMethod,
  };
}
