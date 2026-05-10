import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastProvider';
import { HomePage } from './pages/HomePage';
import { GufPackerPage } from './pages/GufPackerPage';
import { TaskHelperPage } from './pages/TaskHelperPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { BpmnPage } from './pages/BpmnPage';
import { PdfViewerPage } from './pages/PdfViewerPage';
import './App.css';
import './Dashboard.css';
import './TaskHelper.css';
import './Bpmn.css';
import './Pdf.css';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="guf-packer" element={<GufPackerPage />} />
            <Route path="task-helper" element={<TaskHelperPage />} />
            <Route path="task-helper/:taskId" element={<TaskDetailPage />} />
            <Route path="bpmn" element={<BpmnPage />} />
            <Route path="pdf-viewer" element={<PdfViewerPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
