/**
 * GUF Packer — страница инструмента переименования .guf файлов.
 * Весь функционал перенесён из старого App.tsx.
 */

import { useAppState } from '../hooks/useAppState';
import { FileUploader } from '../components/FileUploader';
import { TemplateEditor } from '../components/TemplateEditor';
import { MassActions } from '../components/MassActions';
import { FileTable } from '../components/FileTable';
import { ReadmeEditor } from '../components/ReadmeEditor';
import { ValidationPanel } from '../components/ValidationPanel';
import { Download, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GufPackerPage() {
  const state = useAppState();

  // Пока состояние восстанавливается из IndexedDB — показываем спиннер
  if (state.isRestoring) {
    return (
      <div className="tool-page">
        <div className="app-restore">
          <div className="spinner" />
          <span>Восстановление сессии…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-page">
      {/* Breadcrumb / Back */}
      <div className="tool-page__nav">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>GD Helper</span>
        </Link>
        <span className="back-link__sep">/</span>
        <span className="back-link__current">GUF Packer</span>
      </div>

      <div className="tool-page__content">
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
              template={state.template}
              fieldValues={state.fieldValues}
              onFieldChange={state.setFieldValue}
              fileCount={state.files.length}
              startNumber={state.startNumber}
              onStartNumberChange={state.setStartNumber}
            />

            {/* File table */}
            <FileTable
              files={state.files}
              errorFileIds={state.errorFileIds}
              onReorder={state.reorderFiles}
              onCleanNameChange={state.updateFileCleanName}
            />

            {/* README editor */}
            <ReadmeEditor
              value={state.readmeContent}
              onChange={state.setReadmeContent}
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
      </div>
    </div>
  );
}
