import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastProvider';
import { useAppTheme } from './hooks/useAppTheme';
import { Loader } from './ui';
import './styles/themes.css';
import './App.css';
import './Dashboard.css';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const GufPackerPage = lazy(() => import('./pages/GufPackerPage').then(m => ({ default: m.GufPackerPage })));
const TaskHelperPage = lazy(() => import('./pages/TaskHelperPage').then(m => ({ default: m.TaskHelperPage })));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })));
const BpmnPage = lazy(() => import('./pages/BpmnPage').then(m => ({ default: m.BpmnPage })));
const ApiClientPage = lazy(() => import('./pages/ApiClientPage').then(m => ({ default: m.ApiClientPage })));
const SqlInspectorPage = lazy(() => import('./pages/SqlInspectorPage').then(m => ({ default: m.SqlInspectorPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="app-restore anim-fade-in">
      <Loader size="lg" />
      <span style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Загрузка страницы...</span>
    </div>
  );
}

function App() {
  useAppTheme();

  return (
    <ToastProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="guf-packer" element={<GufPackerPage />} />
              <Route path="task-helper" element={<TaskHelperPage />} />
              <Route path="task-helper/:taskId" element={<TaskDetailPage />} />
              <Route path="bpmn" element={<BpmnPage />} />
              <Route path="api-client" element={<ApiClientPage />} />
              <Route path="sql-inspector" element={<SqlInspectorPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
