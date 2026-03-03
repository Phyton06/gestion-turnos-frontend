import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertCircle, Stethoscope, User, Lock, Activity, Check, KeyRound, Mail, ArrowLeft, Shield, Sun, Moon } from 'lucide-react';
import Swal from 'sweetalert2';
import { saveSession, isSessionValid, getStoredUser } from '../utils/auth';
import { useTheme } from '../context/ThemeContext';

const Login: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de validación dinámica
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  // ── Estados para restablecimiento de contraseña ──
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1); // 1=email, 2=code, 3=new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetCountdown, setResetCountdown] = useState(0);

  const navigate = useNavigate();

  // Si ya tiene sesión válida, redirigir directamente
  useEffect(() => {
    if (isSessionValid()) {
      const user = getStoredUser<{ id_rol: number }>();
      if (user?.id_rol === 1) navigate('/admin-dashboard', { replace: true });
      else if (user?.id_rol === 2) navigate('/doctor-dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Timer de conteo regresivo para el código de 5 minutos
  useEffect(() => {
    if (resetCountdown <= 0) return;
    const timer = setInterval(() => setResetCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resetCountdown]);

  // Validaciones en tiempo real
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val.length > 0) {
      setEmailValid(/\S+@\S+\.\S+/.test(val));
    } else {
      setEmailValid(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (val.length > 0) {
      setPasswordValid(val.length >= 6);
    } else {
      setPasswordValid(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailValid || !passwordValid) {
      Swal.fire({
        icon: 'error',
        title: 'Error de validación',
        text: 'Por favor corrige los campos marcados en rojo.'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/auth/login', {
        email,
        password,
      });

      console.log('Login exitoso:', response.data);

      if (response.data.success) {
        // Guardar sesión con timestamp de inicio (para control de expiración de 10h)
        saveSession(
          response.data.data.token || 'session-activa',
          response.data.data
        );

        setWelcomeName(`${response.data.data.nombre} ${response.data.data.apellido}`);
        setRedirecting(true);

        const roleId = response.data.data.id_rol;
        const userId = response.data.data.id_usuario;

        // Pre-cargar datos del dashboard durante la espera de 8 segundos
        let preloadedHistory = null;
        if (roleId === 3) { // Solo para pacientes por ahora
          try {
            const historyRes = await axios.get(`/appointments/history?pacienteId=${userId}`);
            if (historyRes.data.success) {
              preloadedHistory = historyRes.data.data;
            }
          } catch (err) {
            console.error("Error pre-cargando datos:", err);
          }
        }

        // Esperar 8 segundos antes de navegar
        setTimeout(() => {
          if (roleId === 2) {
            navigate('/doctor-dashboard');
          } else if (roleId === 1) {
            navigate('/admin-dashboard');
          } else {
            // Pasar los datos pre-cargados al dashboard
            navigate('/dashboard', { state: { initialHistory: preloadedHistory } });
          }
        }, 8000);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de Login',
          text: 'Login fallido'
        });
      }

    } catch (err: any) {
      console.error('Error en login:', err);
      let message = 'Ocurrió un error inesperado';
      if (err.response) {
        message = err.response.data.message || 'Credenciales incorrectas';
      } else if (err.request) {
        message = 'El servidor no responde. Verifica tu conexión.';
      }

      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 dark:bg-slate-900 relative">
      {/* Boton toggle de tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all"
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Lado izquierdo: Imagen/Banner decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 to-indigo-500 opacity-90"></div>

        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full bg-white blur-3xl"></div>
        </div>

        <div className="relative z-10 text-white text-center px-12">
          <div className="mb-6 flex justify-center">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <Activity size={48} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Gestión Inteligente</h1>
          <p className="text-indigo-100 text-lg leading-relaxed">
            Plataforma integral para la administración de turnos médicos y pacientes.
            Eficiencia y cuidado en un solo lugar.
          </p>
        </div>
      </div>

      {/* Lado derecho: Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 transition-all duration-500 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-xl lg:shadow-none border border-gray-100 dark:border-slate-700 lg:border-none">

          <div className="text-center lg:text-left">
            <div className="inline-flex lg:hidden justify-center items-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 mb-6 shadow-inner border border-indigo-100 dark:border-indigo-800">
              <Stethoscope size={28} />
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Bienvenido de nuevo</h2>
            <p className="mt-2 font-medium text-gray-500 dark:text-slate-400">Ingresa tus credenciales para acceder al panel.</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-5">

              {/* Input Email con Validación */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className={`h-5 w-5 transition-colors ${emailValid === false ? 'text-red-400' : 'text-gray-400 group-focus-within:text-indigo-500'}`} />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg leading-5 bg-white dark:bg-slate-700 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm transition-all shadow-sm
                    ${emailValid === false
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500'
                      : emailValid === true
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-200 dark:border-green-500'
                        : 'border-gray-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400'
                    }
                  `}
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={handleEmailChange}
                />
                {/* Icono de validación a la derecha */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {emailValid === true && <Check className="h-5 w-5 text-green-500" />}
                  {emailValid === false && <AlertCircle className="h-5 w-5 text-red-500" />}
                </div>
              </div>
              {emailValid === false && (
                <p className="text-xs text-red-500 ml-1">Ingresa un correo válido (ej: usuario@dominio.com)</p>
              )}

              {/* Input Password con Validación */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 transition-colors ${passwordValid === false ? 'text-red-400' : 'text-gray-400 group-focus-within:text-indigo-500'}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg leading-5 bg-white dark:bg-slate-700 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm transition-all shadow-sm
                    ${passwordValid === false
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500'
                      : 'border-gray-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400'
                    }
                  `}
                  placeholder="Contraseña"
                  value={password}
                  onChange={handlePasswordChange}
                />
              </div>
              {passwordValid === false && (
                <p className="text-xs text-red-500 ml-1">La contraseña debe tener al menos 6 caracteres.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || emailValid === false || passwordValid === false}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white 
                transform transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-lg hover:-translate-y-0.5
                ${(loading || emailValid === false || passwordValid === false)
                  ? 'bg-gray-400 cursor-not-allowed transform-none shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <LogIn className="h-5 w-5 text-indigo-200 group-hover:text-indigo-100 transition-colors" aria-hidden="true" />
                )}
              </span>
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>

            {/* Enlace de olvidé contraseña */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => { setShowResetModal(true); setResetStep(1); setResetMessage(''); setResetEmail(''); setResetCode(''); setResetNewPassword(''); setResetConfirmPassword(''); }}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

          <div className="mt-8 text-center bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-sm font-medium text-gray-500">
              ¿Eres paciente y no tienes cuenta?{' '}
              <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 transition-colors">
                Regístrate aquí <AlertCircle size={14} className="opacity-0 group-hover:opacity-100" />
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Modal de Restablecer Contraseña ───────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <KeyRound size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Restablecer Contraseña</h3>
                <p className="text-indigo-100 text-xs mt-0.5">
                  {resetStep === 1 && 'Paso 1 de 3 — Ingresa tu correo'}
                  {resetStep === 2 && 'Paso 2 de 3 — Verifica el código'}
                  {resetStep === 3 && 'Paso 3 de 3 — Nueva contraseña'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${(resetStep / 3) * 100}%` }}
              />
            </div>

            <div className="p-6">
              {/* Mensaje de feedback */}
              {resetMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${resetMessage.includes('Error') || resetMessage.includes('incorrecto') || resetMessage.includes('expirado')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                  <Shield size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{resetMessage}</span>
                </div>
              )}

              {/* ── Paso 1: Email ── */}
              {resetStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Ingresa el correo electrónico asociado a tu cuenta.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      placeholder="tu-correo@ejemplo.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
                        setResetMessage('Por favor ingresa un correo válido.');
                        return;
                      }
                      setResetLoading(true);
                      setResetMessage('');
                      try {
                        const res = await axios.post('/auth/forgot-password', { email: resetEmail });
                        setResetMessage(res.data.message);
                        setResetStep(2);
                        setResetCountdown(300); // 5 minutos
                      } catch {
                        setResetMessage('Si tu correo está registrado, recibirás un código. Revisa también tu carpeta de spam.');
                        setResetStep(2);
                        setResetCountdown(300);
                      } finally {
                        setResetLoading(false);
                      }
                    }}
                    disabled={resetLoading}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar código'}
                  </button>
                </div>
              )}

              {/* ── Paso 2: Código ── */}
              {resetStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Ingresa el código de 6 caracteres que recibiste en tu correo.
                  </p>
                  {resetCountdown > 0 && (
                    <p className="text-xs text-amber-600 font-medium">
                      ⏱ El código expira en {Math.floor(resetCountdown / 60)}:{String(resetCountdown % 60).padStart(2, '0')}
                    </p>
                  )}
                  {resetCountdown <= 0 && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠ El código ha expirado. Solicita uno nuevo.
                    </p>
                  )}
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="ABC123"
                    value={resetCode}
                    onChange={e => setResetCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className="block w-full text-center text-2xl font-mono tracking-[0.5em] py-4 border-2 border-dashed border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-indigo-50/50 transition-all"
                  />
                  <button
                    onClick={async () => {
                      if (resetCode.length !== 6) {
                        setResetMessage('El código debe tener exactamente 6 caracteres.');
                        return;
                      }
                      setResetLoading(true);
                      setResetMessage('');
                      try {
                        const res = await axios.post('/auth/verify-reset-code', { email: resetEmail, code: resetCode });
                        if (res.data.success) {
                          setResetMessage(res.data.message);
                          setResetStep(3);
                        } else {
                          setResetMessage(res.data.message || 'Código incorrecto.');
                        }
                      } catch (err: any) {
                        setResetMessage(err.response?.data?.message || 'Código incorrecto o expirado.');
                      } finally {
                        setResetLoading(false);
                      }
                    }}
                    disabled={resetLoading || resetCode.length !== 6}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Verificando...' : 'Verificar código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetStep(1); setResetCode(''); setResetMessage(''); }}
                    className="w-full py-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={14} /> Volver a ingresar correo
                  </button>
                </div>
              )}

              {/* ── Paso 3: Nueva contraseña ── */}
              {resetStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Ingresa tu nueva contraseña.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      placeholder="Nueva contraseña (mín. 6 caracteres)"
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      placeholder="Confirmar contraseña"
                      value={resetConfirmPassword}
                      onChange={e => setResetConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  {resetNewPassword.length > 0 && resetNewPassword.length < 6 && (
                    <p className="text-xs text-amber-600">La contraseña debe tener al menos 6 caracteres.</p>
                  )}
                  {resetConfirmPassword.length > 0 && resetNewPassword !== resetConfirmPassword && (
                    <p className="text-xs text-red-600">Las contraseñas no coinciden.</p>
                  )}
                  <button
                    onClick={async () => {
                      if (resetNewPassword.length < 6) {
                        setResetMessage('La contraseña debe tener al menos 6 caracteres.');
                        return;
                      }
                      if (resetNewPassword !== resetConfirmPassword) {
                        setResetMessage('Las contraseñas no coinciden.');
                        return;
                      }
                      setResetLoading(true);
                      setResetMessage('');
                      try {
                        const res = await axios.post('/auth/reset-password', {
                          email: resetEmail,
                          code: resetCode,
                          newPassword: resetNewPassword,
                        });
                        if (res.data.success) {
                          setShowResetModal(false);
                          Swal.fire({
                            icon: 'success',
                            title: '¡Contraseña restablecida!',
                            text: 'Ya puedes iniciar sesión con tu nueva contraseña.',
                            confirmButtonColor: '#4f46e5',
                          });
                        } else {
                          setResetMessage(res.data.message || 'Error al restablecer.');
                        }
                      } catch (err: any) {
                        setResetMessage(err.response?.data?.message || 'Error al restablecer la contraseña.');
                      } finally {
                        setResetLoading(false);
                      }
                    }}
                    disabled={resetLoading || resetNewPassword.length < 6 || resetNewPassword !== resetConfirmPassword}
                    className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Guardando...' : 'Restablecer contraseña'}
                  </button>
                </div>
              )}

              {/* Botón cancelar */}
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Carga 5s (Nueva solicitud) */}
      {
        redirecting && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity size={32} className="text-indigo-600 animate-pulse" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenid@ {welcomeName}!</h2>
            <p className="text-gray-500 max-w-xs mx-auto mb-8">
              Gracias por usar los servicios de gestión de citas. Estamos preparando tu panel personalizado...
            </p>

            {/* Barra de progreso simulada */}
            <div className="w-full max-w-xs bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full animate-[progress_8s_linear_forwards]"></div>
            </div>

            <style>{`
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
          </div>
        )
      }
    </div >
  );
};

export default Login;
