import { useState, useCallback, useEffect } from 'react';
import type { AppSettings, ConnectionMethod } from '../types';

const SETTINGS_KEY = 'gd-helper-settings';

const DEFAULT_SETTINGS: AppSettings = {
  connectionMethod: 'supabase',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  postgresUrl: 'http://localhost:5432', // Дефолтный URL для локального прокси/API
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
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
