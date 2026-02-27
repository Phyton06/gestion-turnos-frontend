import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import axios from 'axios';

// Configurar URL base y evitar filtrado de rutas fijas
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Configurar Interceptor Global de Axios para la Seguridad de la API (JWT)
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // Evitar enviar el token anterior (que era una simple variable "session-activa") en Authorization
  // Ahora usaremos el verdadero JWT devuelto por el Backend.
  if (token && token !== 'session-activa') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

function App() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard de Pacientes (Rol 2) */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={[2]}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Dashboard de Médicos (Rol 1) */}
        <Route path="/doctor-dashboard" element={
          <ProtectedRoute allowedRoles={[1]}>
            <DoctorDashboard />
          </ProtectedRoute>
        } />

        {/* Dashboard de Admin (Rol 3) */}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={[3]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>
  );
}

export default App;
