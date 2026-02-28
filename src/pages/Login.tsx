import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertCircle, Stethoscope, User, Lock, Activity, Check } from 'lucide-react';
import Swal from 'sweetalert2';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de validación dinámica
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  const navigate = useNavigate();

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
        localStorage.setItem('token', response.data.data.token || 'session-activa');
        localStorage.setItem('user', JSON.stringify(response.data.data));

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
    <div className="min-h-screen w-full flex bg-gray-50">

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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 transition-all duration-500">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl lg:shadow-none border border-gray-100 lg:border-none">

          <div className="text-center lg:text-left">
            <div className="inline-flex lg:hidden justify-center items-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-inner border border-indigo-100">
              <Stethoscope size={28} />
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Bienvenido de nuevo</h2>
            <p className="mt-2 font-medium text-gray-500">Ingresa tus credenciales para acceder al panel.</p>
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
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all shadow-sm
                    ${emailValid === false
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : emailValid === true
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400'
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
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-all shadow-sm
                    ${passwordValid === false
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-400'
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
