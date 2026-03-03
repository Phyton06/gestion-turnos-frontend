import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import axios from 'axios';

// Configurar URL base
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Interceptor global: adjuntar JWT a cada peticion autenticada
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'session-activa') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

function App() {
  return (
    <ThemeProvider>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard de Pacientes (Rol 3) */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={[3]}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Dashboard de Medicos (Rol 2) */}
          <Route path="/doctor-dashboard" element={
            <ProtectedRoute allowedRoles={[2]}>
              <DoctorDashboard />
            </ProtectedRoute>
          } />

          {/* Dashboard de Admin (Rol 1) */}
          <Route path="/admin-dashboard" element={
            <ProtectedRoute allowedRoles={[1]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

export default App;
