import { Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<div className="p-10">登录页占位（Task 11 实现）</div>} />
      <Route path="/" element={<div className="p-10">Todos 页占位（Task 11 实现）</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
