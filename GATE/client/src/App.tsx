import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScannerPage from './pages/ScannerPage';
import StudentsDashboard from './pages/StudentsDashboard';
import HistoryDashboard from './pages/HistoryDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ScannerPage />} />
        <Route path="students" element={<StudentsDashboard />} />
        <Route path="history" element={<HistoryDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
