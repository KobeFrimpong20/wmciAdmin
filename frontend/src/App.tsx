import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MemberDetail from './pages/MemberDetail';
import ApplicationDetail from './pages/ApplicationDetail';
import IntakePage from './pages/IntakePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/intake" element={<IntakePage />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/members/:id" element={<MemberDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
