import { memo, type ReactNode } from 'react';

export interface SettingsRowProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export const SettingsRow = memo(function SettingsRow({ label, hint, children }: SettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__info">
        <span className="settings-row__label">{label}</span>
        {hint && <span className="settings-row__hint">{hint}</span>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
});
