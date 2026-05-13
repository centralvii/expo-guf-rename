import { Download, Trash2 } from 'lucide-react';
import { FileTable } from '../components/FileTable';
import { FileUploader } from '../components/FileUploader';
import { MassActions } from '../components/MassActions';
import { ReadmeEditor } from '../components/ReadmeEditor';
import { TemplateEditor } from '../components/TemplateEditor';
import { ValidationPanel } from '../components/ValidationPanel';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../hooks/useToast';

// --- UI-Kit Imports ---
import { Button, Island, Loader } from '../ui';

/**
 * GufPackerPage - Пакетровщик .guf файлов.
 * Позволяет массово переименовывать и упаковывать файлы.
 */
export const GufPackerPage = () => {
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

  const handleGufFilesAdded = (files: File[]) => {
    state.loadGufFiles(files);
    notify(`Добавлено .guf файлов: ${files.length}`);
  };

  const handleAddFiles = (files: File[]) => {
    state.addFiles(files);
    notify(`Добавлено файлов: ${files.length}`);
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
          <Loader size="lg" />
          <span style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Восстановление сессии...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">
        <FileUploader
          onZipLoaded={handleLoadZip}
          onGufFilesAdded={handleGufFilesAdded}
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
              onAddFiles={handleAddFiles}
            />

            <ReadmeEditor
              value={state.readmeContent}
              onChange={state.setReadmeContent}
            />

            <ValidationPanel errors={state.errors} />

            <Island className="export-bar" flex={false} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearFiles}
                icon={<Trash2 size={16} />}
              >
                Очистить список
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExportZip}
                disabled={state.hasErrors || state.isExporting}
                isLoading={state.isExporting}
                icon={<Download size={18} />}
                style={{ minWidth: '180px' }}
              >
                Скачать ZIP
              </Button>
            </Island>
          </>
        )}
      </div>
    </div>
  );
};

GufPackerPage.displayName = 'GufPackerPage';
