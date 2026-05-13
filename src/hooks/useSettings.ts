import { useState, useCallback } from 'react';
import type { AppSettings, ConnectionMethod } from '../types';
import { loadSettings, saveSettings } from '../lib/appSettings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

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
