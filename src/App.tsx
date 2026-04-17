import { useAppState } from './hooks/useAppState';
import { FileUploader } from './components/FileUploader';
import { TemplateEditor } from './components/TemplateEditor';
import { MassActions } from './components/MassActions';
import { FileTable } from './components/FileTable';
import { ValidationPanel } from './components/ValidationPanel';
import { Download, FileArchive, Trash2 } from 'lucide-react';
import './App.css';

function App() {
  const state = useAppState();

  // Пока состояние восстанавливается из IndexedDB — показываем спиннер
  if (state.isRestoring) {
    return (
      <div className="app">
        <div className="app-restore">
          <div className="spinner" />
          <span>Восстановление сессии…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__logo">
            <FileArchive size={28} />
            <div>
              <h1>GUF Renamer</h1>
              <span className="app-header__subtitle">
                Пакетное переименование файлов из ZIP-архива
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Upload zone */}
        <FileUploader
          onFileLoaded={state.loadZip}
          isLoading={state.isLoading}
          hasFiles={state.files.length > 0}
        />

        {/* Show everything else only when files are loaded */}
        {state.files.length > 0 && (
          <>
            {/* Template editor */}
            <TemplateEditor
              template={state.template}
              onChange={state.setTemplate}
              onReset={state.resetTemplate}
            />

            {/* Mass actions */}
            <MassActions
              onMassUpdate={state.massUpdateField}
              onAutoNumber={state.autoNumberDocNumbers}
              fileCount={state.files.length}
              startNumber={state.startNumber}
              onStartNumberChange={state.setStartNumber}
            />

            {/* File table */}
            <FileTable
              files={state.files}
              errorFileIds={state.errorFileIds}
              onReorder={state.reorderFiles}
              onFieldChange={state.updateField}
            />

            {/* Validation errors */}
            <ValidationPanel errors={state.errors} />

            {/* Export bar */}
            <div className="export-bar">
              <button
                className="btn btn--ghost btn--danger"
                onClick={state.clearFiles}
              >
                <Trash2 size={16} />
                Очистить
              </button>

              <button
                className="btn btn--export"
                onClick={state.exportZip}
                disabled={state.hasErrors || state.isExporting}
              >
                {state.isExporting ? (
                  <>
                    <div className="spinner spinner--sm" />
                    Упаковка…
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Скачать ZIP
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>GUF Renamer &mdash; клиентское приложение, файлы не покидают ваш браузер</span>
      </footer>
    </div>
  );
}

export default App;
