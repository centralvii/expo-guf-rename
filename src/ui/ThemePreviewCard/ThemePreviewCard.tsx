/* eslint-disable react-refresh/only-export-components */
import { memo } from 'react';
import type { AppTheme } from '../../types';
import './ThemePreviewCard.css';

export interface ThemePreviewCardProps {
  value: AppTheme;
  label: string;
  description: string;
  selected: boolean;
  onSelect: (theme: AppTheme) => void;
}

export const THEME_PREVIEWS: Record<AppTheme, {
  label: string;
  description: string;
  swatches: {
    page: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    border: string;
  };
}> = {
  default: {
    label: 'Default',
    description: 'Текущая тёмная тема',
    swatches: {
      page: '#0b1220',
      surface: '#111827',
      text: '#f8fafc',
      muted: '#94a3b8',
      accent: '#3b82f6',
      border: '#334155',
    },
  },
  nothing: {
    label: 'Nothing',
    description: 'Светлая technical blueprint тема',
    swatches: {
      page: '#eeeeee',
      surface: '#fafafa',
      text: '#020202',
      muted: '#a49d9a',
      accent: '#ef6f2e',
      border: '#b8b3b0',
    },
  },
  '099': {
    label: '099',
    description: 'Тёмная terminal workbench тема',
    swatches: {
      page: '#000000',
      surface: '#1d1d1d',
      text: '#ffffff',
      muted: '#888888',
      accent: '#ffffff',
      border: '#383838',
    },
  },
};

export const ThemePreviewCard = memo(function ThemePreviewCard({
  value,
  label,
  description,
  selected,
  onSelect,
}: ThemePreviewCardProps) {
  return (
    <button
      type="button"
      className={`theme-preview-card theme-preview-card--${value} ${selected ? 'theme-preview-card--selected' : ''}`}
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      title={label}
    >
      <div className="theme-preview-card__mock" aria-hidden="true">
        <div className="theme-preview-card__topline" />
        <div className="theme-preview-card__panel">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="theme-preview-card__body">
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
    </button>
  );
});
