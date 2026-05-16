import { memo } from 'react';

interface SystemSectionProps { appVersion: string; gitCommit: string; mode: string; }

function SystemSection_({ appVersion, gitCommit, mode }: SystemSectionProps) {
  return (
    <div className="settings-section__body">
      <div className="settings-row">
        <div className="settings-row__info"><span className="settings-row__label">Версия приложения</span></div>
        <div className="settings-row__control"><span className="settings-value settings-value--mono">{appVersion}</span></div>
      </div>
      <div className="settings-row">
        <div className="settings-row__info"><span className="settings-row__label">Git commit</span></div>
        <div className="settings-row__control"><span className="settings-value settings-value--mono">{gitCommit}</span></div>
      </div>
      <div className="settings-row">
        <div className="settings-row__info"><span className="settings-row__label">Среда</span></div>
        <div className="settings-row__control"><span className="settings-value settings-value--mono">{mode}</span></div>
      </div>
      <div className="settings-row">
        <div className="settings-row__info"><span className="settings-row__label">React</span></div>
        <div className="settings-row__control"><span className="settings-value settings-value--mono">19.2.4</span></div>
      </div>
    </div>
  );
}

export const SystemSection = memo(SystemSection_);
