import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { GufPackerPage } from './pages/GufPackerPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/guf-packer" element={<GufPackerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
