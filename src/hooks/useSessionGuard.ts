import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { isSessionValid, msUntilExpiry, clearSession } from '../utils/auth';

/**
 * useSessionGuard — Protege una ruta con la lógica de sesión de 10 horas
 *
 * Uso: llamar al inicio de cada dashboard/dashboard protegido
 *
 * Comportamiento:
 *  - En mount: si la sesión no es válida → redirect silencioso al login
 *  - Si la sesión es válida: programa un timer para cuando expire
 *    * Si el usuario ESTÁ en la página → muestra alerta "sesión expirada" → login
 *    * (Si ya no está en la página, el timer no habrá disparado la alerta)
 */
export function useSessionGuard(): boolean {
    const navigate = useNavigate();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // ── 1. Verificación inicial en mount (silenciosa) ────────────────────
        if (!isSessionValid()) {
            navigate('/login', { replace: true });
            return;
        }

        // ── 2. Programar alerta cuando la sesión expire mientras se navega ──
        const remaining = msUntilExpiry();

        timerRef.current = setTimeout(async () => {
            // Solo si el documento sigue activo (usuario en la pestaña)
            clearSession();

            await Swal.fire({
                icon: 'warning',
                title: 'Sesión expirada',
                text: 'Tu sesión de 10 horas ha finalizado. Por favor vuelve a iniciar sesión.',
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'Ir al login',
                allowOutsideClick: false,
                allowEscapeKey: false,
            });

            navigate('/login', { replace: true });
        }, remaining);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [navigate]);

    return isSessionValid();
}
