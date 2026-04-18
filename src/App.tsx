import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastProvider';
import { HomePage } from './pages/HomePage';
import { GufPackerPage } from './pages/GufPackerPage';
import { TaskHelperPage } from './pages/TaskHelperPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import './App.css';
import './TaskHelper.css';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="guf-packer" element={<GufPackerPage />} />
            <Route path="task-helper" element={<TaskHelperPage />} />
            <Route path="task-helper/:taskId" element={<TaskDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
