import { Download, Trash2 } from 'lucide-react';
import { FileTable } from '../components/FileTable';
import { FileUploader } from '../components/FileUploader';
import { MassActions } from '../components/MassActions';
import { ReadmeEditor } from '../components/ReadmeEditor';
import { TemplateEditor } from '../components/TemplateEditor';
import { ValidationPanel } from '../components/ValidationPanel';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../hooks/useToast';

export function GufPackerPage() {
  const state = useAppState();
  const { notify } = useToast();

  const handleLoadZip = async (file: File) => {
    try {
      await state.loadZip(file);
      notify('Архив загружен');
    } catch (loadError) {
      console.error('[guf-packer] Failed to load zip', loadError);
      notify('Не удалось загрузить архив', 'error');
      throw loadError;
    }
  };

  const handleClearFiles = () => {
    state.clearFiles();
    notify('Список файлов очищен', 'error');
  };

  const handleExportZip = async () => {
    try {
      await state.exportZip();
      notify('ZIP архив скачан');
    } catch (exportError) {
      console.error('[guf-packer] Failed to export zip', exportError);
      notify('Не удалось сформировать ZIP архив', 'error');
    }
  };

  if (state.isRestoring) {
    return (
      <div className="tool-page">
        <div className="app-restore">
          <div className="spinner" />
          <span>Восстановление сессии...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-page">
      <div className="tool-page__content">
        <FileUploader
          onFileLoaded={handleLoadZip}
          isLoading={state.isLoading}
          hasFiles={state.files.length > 0}
        />

        {state.files.length > 0 && (
          <>
            <div className="guf-packer__config">
              <TemplateEditor
                template={state.template}
                variables={state.variables}
                onChange={state.setTemplate}
                onReset={state.resetTemplate}
              />

              <MassActions
                template={state.template}
                variables={state.variables}
                onVariableChange={state.setVariableValue}
                onAddVariable={state.addVariable}
                onRemoveVariable={state.removeVariable}
                fileCount={state.files.length}
                startNumber={state.startNumber}
                onStartNumberChange={state.setStartNumber}
              />
            </div>

            <FileTable
              files={state.files}
              errorFileIds={state.errorFileIds}
              onReorder={state.reorderFiles}
              onCleanNameChange={state.updateFileCleanName}
              onAddFiles={state.addFiles}
            />

            <ReadmeEditor
              value={state.readmeContent}
              onChange={state.setReadmeContent}
            />

            <ValidationPanel errors={state.errors} />

            <div className="export-bar">
              <button
                className="btn btn--ghost btn--danger"
                onClick={handleClearFiles}
              >
                <Trash2 size={16} />
                Очистить
              </button>

              <button
                className="btn btn--export"
                onClick={handleExportZip}
                disabled={state.hasErrors || state.isExporting}
              >
                {state.isExporting ? (
                  <>
                    <div className="spinner spinner--sm" />
                    Упаковка...
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
