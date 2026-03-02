/**
 * auth.ts — Utilidad centralizada de autenticación
 * 
 * Claves en localStorage:
 *   token          → JWT o string de sesión
 *   user           → JSON del usuario
 *   sessionStart   → timestamp (ms) del inicio de sesión
 *   loggedOut      → "true" cuando el usuario cerró sesión activamente
 *
 * Reglas:
 *   - Sesión dura SESSION_DURATION_MS (10 horas)
 *   - Si el usuario cerró sesión explícitamente → NO hay auto-login
 *   - Si la sesión expiró → redirect silencioso al volver a la app
 *   - Si la sesión expira MIENTRAS el usuario está navegando → alerta + redirect
 */

export const SESSION_DURATION_MS = 10 * 60 * 60 * 1000; // 10 horas en ms

// ─── Guardar sesión al hacer login ───────────────────────────────────────────
export function saveSession(token: string, user: object): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('sessionStart', Date.now().toString());
    localStorage.removeItem('loggedOut'); // Limpiar flag de logout explícito
}

// ─── Cerrar sesión explícitamente ────────────────────────────────────────────
export function clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionStart');
    localStorage.setItem('loggedOut', 'true'); // Marcar que fue logout manual
}

// ─── Verificar si la sesión es válida ────────────────────────────────────────
export function isSessionValid(): boolean {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const sessionStart = localStorage.getItem('sessionStart');
    const loggedOut = localStorage.getItem('loggedOut');

    // Si cerró sesión explícitamente → inválida siempre
    if (loggedOut === 'true') return false;

    // Si falta token o usuario → inválida
    if (!token || !user) return false;

    // Si no hay sessionStart (sesiones antiguas antes de esta actualización),
    // asumir que la sesión es válida y registrar el inicio ahora
    if (!sessionStart) {
        localStorage.setItem('sessionStart', Date.now().toString());
        return true;
    }

    // Verificar que no hayan pasado más de SESSION_DURATION_MS
    const elapsed = Date.now() - parseInt(sessionStart, 10);
    return elapsed < SESSION_DURATION_MS;
}

// ─── Ms restantes hasta la expiración ────────────────────────────────────────
export function msUntilExpiry(): number {
    const sessionStart = localStorage.getItem('sessionStart');
    if (!sessionStart) return SESSION_DURATION_MS;
    const elapsed = Date.now() - parseInt(sessionStart, 10);
    return Math.max(0, SESSION_DURATION_MS - elapsed);
}

// ─── Obtener usuario del localStorage ────────────────────────────────────────
export function getStoredUser<T = any>(): T | null {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
