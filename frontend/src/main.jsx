import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import AdminPanel from './AdminPanel.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* URL Predeterminada: Ideal para la tablet física de la planta */}
        <Route path="/" element={<App />} />
        
        {/* URL Exclusiva: Para abrir únicamente en la PC de la oficina */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);