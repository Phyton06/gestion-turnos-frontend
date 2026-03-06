import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, Mail, Phone, ChevronDown, Search, Sun, Moon } from 'lucide-react';
import Swal from 'sweetalert2';
import { useTheme } from '../context/ThemeContext';

interface Country {
    code: string;
    name: string;
    dial: string;
    flag: string;
}

/** Formatea hasta 10 dígitos como 111-111-11-11 */
const formatPhoneNumber = (digits: string): string => {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    if (d.length <= 8) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
};

const Register: React.FC = () => {
    const { isDark, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        confirmPassword: '',
        fecha_nacimiento: '',
    });

    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [phoneDigits, setPhoneDigits] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [loading, setLoading] = useState(false);

    // Dropdown de países
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();

    // Cargar países desde RESTCountries API al montar
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,cca2,flag');
                const data = await res.json();

                const parsed: Country[] = data
                    .filter((c: any) => c.idd?.root && c.idd?.suffixes?.length > 0)
                    .map((c: any) => {
                        const suffix = c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : '';
                        const dial = `${c.idd.root}${suffix}`;
                        return {
                            code: c.cca2,
                            name: c.name.common,
                            dial,
                            flag: c.flag || '',  // emoji de bandera (ej: 🇲🇽)
                        };
                    })
                    .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

                setCountries(parsed);
                // Seleccionar México por defecto
                const mx = parsed.find((c: Country) => c.code === 'MX') || parsed[0];
                setSelectedCountry(mx);
            } catch {
                // Fallback mínimo si la API falla
                const fallback: Country[] = [
                    { code: 'MX', name: 'México', dial: '+52', flag: '🇲🇽' },
                    { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸' },
                    { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
                    { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
                    { code: 'ES', name: 'España', dial: '+34', flag: '🇪🇸' },
                ];
                setCountries(fallback);
                setSelectedCountry(fallback[0]);
            } finally {
                setLoadingCountries(false);
            }
        };
        fetchCountries();
    }, []);

    // Cerrar dropdown al hacer clic afuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Solo letras (incluyendo acentos y ñ) para nombre y apellido
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Solo dígitos, máximo 10
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhoneDigits(raw);
    };

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            Swal.fire({ icon: 'error', title: 'Error de validación', text: 'Las contraseñas no coinciden.' });
            return;
        }

        const telefonoFinal = phoneDigits && selectedCountry
            ? `${selectedCountry.dial} ${formatPhoneNumber(phoneDigits)}`
            : '';

        setLoading(true);
        try {
            const response = await axios.post('/auth/register', {
                nombre: formData.nombre,
                apellido: formData.apellido,
                email: formData.email,
                password: formData.password,
                fechaNacimiento: formData.fecha_nacimiento,
                telefono: telefonoFinal
            });

            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Registro exitoso!',
                    text: 'Serás redirigido al inicio de sesión.',
                    timer: 2000,
                    showConfirmButton: false
                });
                navigate('/login');
            } else {
                Swal.fire({ icon: 'error', title: 'Error de registro', text: response.data.message || 'Error al registrarse' });
            }
        } catch (err: any) {
            const message = err.response?.data?.message || 'Error de conexión con el servidor.';
            Swal.fire({ icon: 'error', title: 'Oops...', text: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-gray-50 dark:bg-slate-900 items-center justify-center p-4 relative">
            {/* Boton toggle de tema */}
            <button
                onClick={toggleTheme}
                className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all"
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-10 rounded-[2rem] shadow-xl border border-gray-100 dark:border-slate-700">

                <div className="text-center mb-10">
                    <div className="inline-flex justify-center items-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 mb-6 shadow-inner border border-indigo-100 dark:border-indigo-800">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Crear una cuenta</h2>
                    <p className="mt-2 font-medium text-gray-500 dark:text-slate-400">Registrate para gestionar tus citas medicas.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="nombre"
                                    required
                                    className="block w-full pl-10 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500"
                                    placeholder="Juan"
                                    value={formData.nombre}
                                    onChange={handleNameChange}
                                />
                            </div>
                        </div>

                        {/* Apellido */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Apellido</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="apellido"
                                    required
                                    className="block w-full pl-10 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500"
                                    placeholder="Perez"
                                    value={formData.apellido}
                                    onChange={handleNameChange}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Correo Electronico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="block w-full pl-10 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500"
                                    placeholder="juan.perez@ejemplo.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Fecha de Nacimiento */}
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fecha de Nacimiento</label>
                            <input
                                type="date"
                                name="fecha_nacimiento"
                                required
                                max={new Date().toISOString().split('T')[0]}
                                className="block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:dark:invert"
                                value={formData.fecha_nacimiento}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Teléfono con selector de país personalizado */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                Teléfono <span className="text-gray-400 font-normal">(Opcional)</span>
                            </label>
                            <div className="flex gap-2">

                                {/* Selector de país con dropdown personalizado */}
                                <div className="relative flex-shrink-0" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setDropdownOpen(o => !o)}
                                        disabled={loadingCountries}
                                        className="flex items-center gap-2 h-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {loadingCountries ? (
                                            <span className="text-gray-400">Cargando...</span>
                                        ) : selectedCountry ? (
                                            <>
                                                <span className="text-xl leading-none">{selectedCountry.flag}</span>
                                                <span className="font-bold text-indigo-700">{selectedCountry.dial}</span>
                                            </>
                                        ) : null}
                                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown de países con búsqueda */}
                                    {dropdownOpen && (
                                        <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                            {/* Buscar */}
                                            <div className="p-3 border-b border-gray-100 dark:border-slate-700">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        placeholder="Buscar país o código..."
                                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        value={search}
                                                        onChange={e => setSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            {/* Lista */}
                                            <div className="max-h-56 overflow-y-auto">
                                                {filteredCountries.length === 0 ? (
                                                    <div className="px-4 py-3 text-sm text-gray-400 text-center">No se encontraron países</div>
                                                ) : filteredCountries.map(c => (
                                                    <button
                                                        key={c.code}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCountry(c);
                                                            setDropdownOpen(false);
                                                            setSearch('');
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors
                                                            ${selectedCountry?.code === c.code ? 'bg-indigo-50 dark:bg-indigo-900/40 font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'}`}
                                                    >
                                                        <span className="text-lg leading-none flex-shrink-0">{c.flag}</span>
                                                        <span className="flex-1 truncate">{c.name}</span>
                                                        <span className="text-gray-400 dark:text-slate-500 font-mono text-xs flex-shrink-0">{c.dial}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Número con formato automático */}
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Phone size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        name="telefono"
                                        className="block w-full pl-10 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-mono tracking-wider dark:placeholder:text-slate-500"
                                        placeholder="111-111-11-11"
                                        value={formatPhoneNumber(phoneDigits)}
                                        onChange={handlePhoneChange}
                                        maxLength={13}
                                    />
                                </div>
                            </div>

                            {/* Indicador de progreso del número */}
                            {phoneDigits.length > 0 && phoneDigits.length < 10 && (
                                <p className="mt-1.5 text-xs text-amber-600 font-medium">
                                    {10 - phoneDigits.length} dígito{10 - phoneDigits.length !== 1 ? 's' : ''} restante{10 - phoneDigits.length !== 1 ? 's' : ''}
                                </p>
                            )}
                            {phoneDigits.length === 10 && (
                                <p className="mt-1.5 text-xs text-emerald-600 font-medium">✓ Número completo</p>
                            )}
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={6}
                                    className="block w-full pl-10 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors dark:placeholder-slate-500"
                                    placeholder="******"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Confirmar Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    minLength={6}
                                    className={`block w-full pl-10 py-2.5 border rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors dark:bg-slate-700 text-gray-900 dark:text-white
                                        ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300 focus:border-red-500 dark:border-red-500/50' : 'border-gray-300 dark:border-slate-600'}
                                    `}
                                    placeholder="******"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="mt-1 text-xs text-red-500 font-medium">Las contraseñas no coinciden</p>
                            )}
                        </div>

                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white outline-none focus:ring-4 focus:ring-indigo-500/20 shadow-md hover:shadow-lg active:scale-95 transition-all
                                ${loading ? 'bg-gray-400 cursor-not-allowed transform-none shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}
                            `}
                        >
                            {loading ? 'Registrando...' : 'Crear Cuenta'}
                        </button>
                    </div>

                    <div className="mt-8 text-center bg-gray-50 dark:bg-slate-700/40 rounded-xl p-5 border border-gray-100 dark:border-slate-600 flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                            ¿Ya tienes una cuenta o eres administrador/médico?
                        </p>
                        <Link to="/login" className="inline-flex items-center gap-2 font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-6 py-2 rounded-xl transition-colors border border-indigo-100 dark:border-indigo-800 bg-white dark:bg-slate-700 shadow-sm">
                            Volver al inicio de sesión
                        </Link>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Register;
