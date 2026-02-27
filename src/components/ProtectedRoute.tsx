import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: number[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const location = useLocation();

    if (!token || !userStr) {
        // Redirigir al login si no está autenticado
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    try {
        const user = JSON.parse(userStr);

        // Verificar si el rol del usuario está permitido en esta ruta
        if (!allowedRoles.includes(user.id_rol)) {
            console.warn(`[Security] Acceso denegado: el Rol ${user.id_rol} intentó acceder a una ruta de Roles ${allowedRoles}`);
            // Redirigir a una ruta por defecto o al inicio de sesión limpiando credenciales si se intenta vulnerar
            if (user.id_rol === 1) return <Navigate to="/doctor-dashboard" replace />;
            if (user.id_rol === 3) return <Navigate to="/admin-dashboard" replace />;
            return <Navigate to="/dashboard" replace />;
        }

        return <>{children}</>;
    } catch (error) {
        // Si la sesión manipulo localStorage, forzar logout
        console.error('[Security] Token de usuario modificado o inválido:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;
