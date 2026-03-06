import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, UserPlus, Shield, AlertTriangle, CheckCircle, XCircle, Pencil, Filter, X, ChevronLeft, ChevronRight, Calendar, Phone, ChevronDown, Sun, Moon } from 'lucide-react';
import Swal from 'sweetalert2';
import { useSessionGuard } from '../hooks/useSessionGuard';
import { clearSession, getStoredUser } from '../utils/auth';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';
import { useTheme } from '../context/ThemeContext';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface User {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
    idRol: number;
    medicoId?: number;
    estado: boolean;
    telefono: string | null;
    fechaRegistro: string;
}

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

const AdminDashboard: React.FC = () => {

    useSessionGuard(); // Protege la ruta: chequeo en mount + timer de expiración
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRol, setFilterRol] = useState<string>('');
    const [filterEstado, setFilterEstado] = useState<string>('active');
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [perPageOpen, setPerPageOpen] = useState(false);
    const [perPagePos, setPerPagePos] = useState({ top: 0, left: 0, width: 0 });
    const perPageBtnRef = useRef<HTMLButtonElement>(null);

    // Estado para el formulario de creación/edición
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editUserId, setEditUserId] = useState<number | null>(null);
    const [editMedicoId, setEditMedicoId] = useState<number | null>(null);
    const [specialties, setSpecialties] = useState<{ id: number, nombre: string }[]>([]);
    const [showNewSpecialty, setShowNewSpecialty] = useState(false);
    const [newSpecialtyName, setNewSpecialtyName] = useState('');
    const [countries, setCountries] = useState<Country[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [phoneDigits, setPhoneDigits] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const countryDropdownRef = useRef<HTMLDivElement>(null);
    const countryBtnRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const [adminName, setAdminName] = useState('Administrador');

    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        telefono: '',
        fecha_nacimiento: '',
        idRol: 3, // Default Paciente
        // Campos extra para médicos
        cedulaProfesional: '',
        idEspecialidad: 1, // Default Cardiología
        horaInicio: 9,
        horaFin: 17,
        diasDescanso: [0, 6], // Domingo y Sábado
        isHorarioQuebrado: false,
        horariosPorDia: [
            { dia: 1, horaInicio: 9, horaFin: 17 },
            { dia: 2, horaInicio: 9, horaFin: 17 },
            { dia: 3, horaInicio: 9, horaFin: 17 },
            { dia: 4, horaInicio: 9, horaFin: 17 },
            { dia: 5, horaInicio: 9, horaFin: 17 },
            { dia: 6, horaInicio: 9, horaFin: 17 },
            { dia: 0, horaInicio: 9, horaFin: 17 }
        ] as { dia: number, horaInicio: number, horaFin: number }[]
    });

    const showNotification = (message: string, type: NotificationType) => {
        const swalType = type === 'info' ? 'info' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success';
        Swal.fire({
            title: message,
            icon: swalType,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    };

    useEffect(() => {
        // La redirección si no hay sesión la maneja useSessionGuard.
        // Aquí solo cargamos datos del usuario y verificamos el rol.
        const user = getStoredUser<{ nombre?: string; apellido?: string; id_rol?: number }>();
        if (!user) return; // ya fue redirigido por el hook

        setAdminName(`${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Administrador');

        if (user.id_rol !== 1) {
            navigate('/login', { replace: true });
            return;
        }
        fetchUsers();
        fetchSpecialties();
    }, [navigate]);

    // Cargar países desde RESTCountries API
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const res = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,cca2,flag');
                const data = await res.json();
                const parsed: Country[] = data
                    .filter((c: any) => c.idd?.root && c.idd?.suffixes?.length > 0)
                    .map((c: any) => {
                        const suffix = c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : '';
                        return { code: c.cca2, name: c.name.common, dial: `${c.idd.root}${suffix}`, flag: c.flag || '' };
                    })
                    .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
                setCountries(parsed);
                const mx = parsed.find((c: Country) => c.code === 'MX') || parsed[0];
                setSelectedCountry(mx);
            } catch {
                const fallback: Country[] = [
                    { code: 'MX', name: 'México', dial: '+52', flag: '🇲🇽' },
                    { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸' },
                ];
                setCountries(fallback);
                setSelectedCountry(fallback[0]);
            } finally {
                setLoadingCountries(false);
            }
        };
        fetchCountries();
    }, []);

    // Cerrar dropdown al click afuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const portalDropdown = document.getElementById('admin-country-dropdown-portal');
            if (
                countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node) &&
                (!portalDropdown || !portalDropdown.contains(e.target as Node))
            ) {
                setCountryDropdownOpen(false);
                setCountrySearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/users');
            console.log("Respuesta API Usuarios:", response.data); // Debug
            if (response.data.success && response.data.data?.users) {
                setUsers(response.data.data.users);
            } else {
                console.warn("Estructura de respuesta inesperada:", response.data);
                setUsers([]);
            }
        } catch (error) {
            console.error("Error cargando usuarios:", error);
            showNotification('Error al cargar la lista de usuarios.', 'error');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSpecialties = async () => {
        try {
            const response = await axios.get('/medicos/specialties?all=true');
            if (response.data.success) {
                setSpecialties(response.data.data);
            }
        } catch (error) {
            console.error("Error cargando especialidades:", error);
        }
    };

    const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
        const action = currentStatus ? 'desactivar' : 'activar';

        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `¿Estás seguro de ${action} este usuario?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#d33',
            confirmButtonText: `Sí, ${action}`,
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await axios.patch(`/users/${userId}/toggle-status`);

            if (response.data.success) {
                setUsers(users.map(u => u.id === userId ? { ...u, estado: !currentStatus } : u));
                showNotification(`Usuario ${currentStatus ? 'desactivado' : 'activado'} correctamente.`, 'success');
            }
        } catch (error) {
            console.error("Error cambiando estado:", error);
            showNotification('Error al cambiar el estado del usuario.', 'error');
        }
    };

    const openEditForm = (user: User) => {
        // Parsear teléfono existente: separar código de área del número
        let parsedDigits = '';
        let parsedCountry: Country | null = selectedCountry;
        if (user.telefono) {
            // El formato guardado es "+52 111-111-11-11" o similar
            const matchDial = user.telefono.match(/^(\+\d+)\s(.+)$/);
            if (matchDial && countries.length > 0) {
                parsedCountry = countries.find(c => c.dial === matchDial[1]) || selectedCountry;
                parsedDigits = matchDial[2].replace(/\D/g, '').slice(0, 10);
            } else {
                parsedDigits = user.telefono.replace(/\D/g, '').slice(0, 10);
            }
        }
        if (parsedCountry) setSelectedCountry(parsedCountry);
        setPhoneDigits(parsedDigits);
        setFormData({
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            email: user.email || '',
            password: '', // Leave empty unless changing
            telefono: user.telefono || '',
            fecha_nacimiento: (user as any).fechaNacimiento || '',
            idRol: user.idRol,
            cedulaProfesional: '', // Se requerirá una llamada extra si queremos popular esto siempre, pero por practicidad asuminos edición básica
            idEspecialidad: 1,
            horaInicio: 9,
            horaFin: 17,
            diasDescanso: [0, 6],
            isHorarioQuebrado: false,
            horariosPorDia: [
                { dia: 1, horaInicio: 9, horaFin: 17 }, { dia: 2, horaInicio: 9, horaFin: 17 },
                { dia: 3, horaInicio: 9, horaFin: 17 }, { dia: 4, horaInicio: 9, horaFin: 17 },
                { dia: 5, horaInicio: 9, horaFin: 17 }, { dia: 6, horaInicio: 9, horaFin: 17 }, { dia: 0, horaInicio: 9, horaFin: 17 }
            ]
        });
        setEditUserId(user.id);
        setEditMedicoId(user.medicoId || null);
        setShowNewSpecialty(false);
        setNewSpecialtyName('');
        setShowCreateForm(true);
    };

    const resetForm = () => {
        setFormData({
            nombre: '', apellido: '', email: '', password: '', telefono: '', fecha_nacimiento: '', idRol: 3,
            cedulaProfesional: '', idEspecialidad: 1, horaInicio: 9, horaFin: 17, diasDescanso: [0, 6],
            isHorarioQuebrado: false,
            horariosPorDia: [
                { dia: 1, horaInicio: 9, horaFin: 17 }, { dia: 2, horaInicio: 9, horaFin: 17 },
                { dia: 3, horaInicio: 9, horaFin: 17 }, { dia: 4, horaInicio: 9, horaFin: 17 },
                { dia: 5, horaInicio: 9, horaFin: 17 }, { dia: 6, horaInicio: 9, horaFin: 17 }, { dia: 0, horaInicio: 9, horaFin: 17 }
            ]
        });
        setPhoneDigits('');
        setEditUserId(null);
        setEditMedicoId(null);
        setShowCreateForm(false);
        setShowNewSpecialty(false);
        setNewSpecialtyName('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Solo letras para nombre y apellido
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    // Solo dígitos, máximo 10
    const handlePhoneDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhoneDigits(raw);
    };

    const handleDayToggle = (day: number) => {
        setFormData(prev => {
            const current = [...prev.diasDescanso];
            const allDays = [0, 1, 2, 3, 4, 5, 6];
            if (current.includes(day)) {
                // Quitar de descanso (habilitar el día) — siempre permitido
                return { ...prev, diasDescanso: current.filter(d => d !== day) };
            } else {
                // Agregar a descanso (deshabilitar el día) — solo si quedaría al menos 1 día laboral
                const afterToggle = [...current, day];
                const remainingWorkDays = allDays.filter(d => !afterToggle.includes(d));
                if (remainingWorkDays.length === 0) {
                    showNotification('Debe haber al menos un día laboral en la agenda del médico.', 'warning');
                    return prev; // No cambiar
                }
                return { ...prev, diasDescanso: afterToggle };
            }
        });
    };

    const handleHorarioPorDiaChange = (dia: number, field: 'horaInicio' | 'horaFin', value: string) => {
        setFormData(prev => ({
            ...prev,
            horariosPorDia: prev.horariosPorDia.map(h =>
                h.dia === dia ? { ...h, [field]: Number(value) } : h
            )
        }));
    };

    // Solo alfanumérico para cédula profesional
    const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
        setFormData(prev => ({ ...prev, cedulaProfesional: value }));
    };

    // Posicionar el dropdown de países usando coordenadas fijas
    const openCountryDropdown = () => {
        if (countryBtnRef.current) {
            const rect = countryBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260) });
        }
        setCountryDropdownOpen(o => !o);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        // Componer teléfono con código de área
        const telefonoFinal = phoneDigits && selectedCountry
            ? `${selectedCountry.dial} ${formatPhoneNumber(phoneDigits)}`
            : '';
        try {
            let response;
            const roleId = Number(formData.idRol);

            let finalSpecialtyId = Number(formData.idEspecialidad);

            if (roleId === 2) {
                // Si la especialidad seleccionada es "Otra" (-1), primero creamos la especialidad
                if (finalSpecialtyId === -1 && newSpecialtyName.trim() !== '') {
                    try {
                        const specResp = await axios.post('/medicos/specialties', {
                            nombre: newSpecialtyName
                        });
                        if (specResp.data.success) {
                            finalSpecialtyId = specResp.data.data.id;
                            await fetchSpecialties(); // Update list
                        }
                    } catch (error: any) {
                        const msg = error.response?.data?.message || 'Error al crear la nueva especialidad.';
                        showNotification(msg, 'error');
                        return; // Halt if specialty creation failed
                    }
                }

                // Endpoint específico para Médicos
                const payload: any = {
                    nombre: formData.nombre,
                    apellido: formData.apellido,
                    email: formData.email,
                    telefono: telefonoFinal,
                    fechaNacimiento: formData.fecha_nacimiento,
                    idEspecialidad: finalSpecialtyId,
                    cedulaProfesional: formData.cedulaProfesional,
                };
                if (formData.password) payload.password = formData.password;

                if (editUserId) {
                    // Si ya existe el medicoId, lo usamos. Si no existe (raro), fallaría o usaríamos el userId si fuera compatible (pero no lo es)
                    const targetId = editMedicoId || editUserId;
                    response = await axios.put(`/medicos/${targetId}`, payload);
                } else {
                    payload.agenda = {
                        horaInicio: Number(formData.horaInicio),
                        horaFin: Number(formData.horaFin),
                        diasDescanso: formData.diasDescanso,
                        horarioPorDia: formData.isHorarioQuebrado
                            ? formData.horariosPorDia.filter(h => !formData.diasDescanso.includes(h.dia))
                            : undefined
                    };
                    response = await axios.post('/medicos', payload);
                }
            } else {
                // Endpoint genérico para Usuarios (Pacientes/Admins)
                const payload: any = {
                    nombre: formData.nombre,
                    apellido: formData.apellido,
                    email: formData.email,
                    telefono: telefonoFinal,
                    fechaNacimiento: formData.fecha_nacimiento,
                    idRol: roleId
                };
                if (formData.password) payload.password = formData.password;

                if (editUserId) {
                    response = await axios.put(`/users/${editUserId}`, payload);
                } else {
                    response = await axios.post('/users', payload);
                }
            }

            if (response?.data?.success) {
                const msg = editUserId
                    ? 'Usuario actualizado exitosamente.'
                    : (roleId === 2 ? 'Médico registrado y agenda generada.' : 'Usuario registrado exitosamente.');
                showNotification(msg, 'success');

                resetForm();
                fetchUsers();
            }
        } catch (error: any) {
            console.error("Error guardando usuario:", error);
            const msg = error.response?.data?.message || 'Error al guardar el usuario.';
            showNotification(msg, 'error');
        }
    };

    const handleLogout = () => {
        clearSession(); // Marca logout explícito y limpia localStorage
        navigate('/login', { replace: true });
    };

    // Filtrado y Ordenamiento
    const filteredUsers = (users || [])
        .filter(user => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                (user.nombre?.toLowerCase() || '').includes(term) ||
                (user.apellido?.toLowerCase() || '').includes(term) ||
                (user.email?.toLowerCase() || '').includes(term);

            const matchesRol = filterRol === '' || user.idRol.toString() === filterRol;

            let matchesEstado = true;
            if (filterEstado === 'active') matchesEstado = user.estado === true;
            if (filterEstado === 'inactive') matchesEstado = user.estado === false;

            let matchesDate = true;
            if (filterDate) {
                const formattedFilterDate = filterDate.toLocaleDateString('en-CA');
                const userDate = new Date(user.fechaRegistro).toISOString().split('T')[0];
                matchesDate = userDate === formattedFilterDate;
            }

            return matchesSearch && matchesRol && matchesEstado && matchesDate;
        })
        .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());

    // Paginación
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const clearFilters = () => {
        setSearchTerm('');
        setFilterRol('');
        setFilterEstado('active');
        setFilterDate(null);
        setCurrentPage(1);
    };

    // Reset a la página 1 si cambian los filtros o el tamaño de página
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRol, filterEstado, filterDate, itemsPerPage]);

    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
            {/* Navbar Admin - Responsive */}
            <nav className="bg-white dark:bg-slate-800 shadow-md shadow-indigo-900/5 dark:shadow-slate-900/50 px-4 sm:px-8 py-4 sm:py-5 flex justify-between items-center relative z-10 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 sm:gap-4 border-l-4 border-indigo-500 pl-3 sm:pl-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 sm:p-3 rounded-2xl text-indigo-600 shadow-inner">
                        <Shield size={22} className="sm:hidden" />
                        <Shield size={32} className="hidden sm:block" />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-0.5">
                            <span className="hidden sm:inline">Panel de Administracion</span>
                            <span className="sm:hidden">Admin Panel</span>
                        </h1>
                        <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden sm:block">
                            Gestion de Turnos v1.0 | <span className="text-indigo-600">{adminName}</span>
                        </p>
                        <p className="text-xs font-bold text-indigo-600 sm:hidden">{adminName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toggle de tema */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all text-xs sm:text-sm font-bold border border-gray-100 dark:border-slate-600 shadow-sm active:scale-95"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Cerrar Sesion</span>
                        <span className="sm:hidden">Salir</span>
                    </button>
                </div>
            </nav>

            <div className="flex-1 container mx-auto p-3 sm:p-6 max-w-7xl">

                {/* Header y Acciones */}
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestion de Usuarios</h2>
                        <p className="text-gray-500 dark:text-slate-400 font-medium mt-1 text-sm sm:text-base">Administra pacientes, medicos y permisos del sistema.</p>
                    </div>
                    <button
                        onClick={() => {
                            if (showCreateForm) {
                                resetForm();
                            } else {
                                setShowCreateForm(true);
                            }
                        }}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl transition-all shadow-sm font-bold active:scale-95
                    ${showCreateForm
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300 shadow-md border-none'
                            }
                `}
                    >
                        {showCreateForm ? <XCircle size={18} /> : <UserPlus size={18} />}
                        {showCreateForm ? 'Cancelar' : 'Nuevo Usuario'}
                    </button>
                </div>

                {/* Formulario de Creación/Edición (Expandible con animación) */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showCreateForm ? 'max-h-[2000px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-lg border border-indigo-100 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-3 h-full bg-indigo-500"></div>
                        <h3 className="font-black text-2xl mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                            {editUserId ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                            {!editUserId && (
                                <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                    Todos los campos son obligatorios
                                </span>
                            )}
                        </h3>
                        <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre</label>
                                <input name="nombre" placeholder="Ej: Juan" value={formData.nombre} onChange={handleNameChange} required className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Apellido</label>
                                <input name="apellido" placeholder="Ej: Perez" value={formData.apellido} onChange={handleNameChange} required className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                                <input name="email" type="email" placeholder="usuario@ejemplo.com" value={formData.email} onChange={handleInputChange} required className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Contrasena {editUserId && '(Opcional)'}</label>
                                <input name="password" type="password" placeholder={editUserId ? "Dejar en blanco para no cambiar" : "••••••"} value={formData.password} onChange={handleInputChange} required={!editUserId} className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fecha de Nacimiento</label>
                                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleInputChange} required className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-gray-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:dark:invert" max={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefono</label>
                                <div className="flex gap-2">
                                    {/* Selector de país */}
                                    <div className="relative flex-shrink-0" ref={countryDropdownRef}>
                                        <button
                                            ref={countryBtnRef}
                                            type="button"
                                            onClick={openCountryDropdown}
                                            disabled={loadingCountries}
                                            className="flex items-center gap-2 h-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {loadingCountries ? (
                                                <span className="text-gray-400 text-xs">...</span>
                                            ) : selectedCountry ? (
                                                <>
                                                    <span className="text-lg leading-none">{selectedCountry.flag}</span>
                                                    <span className="font-bold text-gray-700 dark:text-slate-300 text-xs">{selectedCountry.dial}</span>
                                                </>
                                            ) : null}
                                            <ChevronDown size={12} className={`text-gray-400 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {/* Dropdown con position:fixed para escapar overflow:hidden del contenedor animado */}
                                        {countryDropdownOpen && (
                                            <div
                                                style={{
                                                    position: 'fixed',
                                                    top: dropdownPos.top,
                                                    left: dropdownPos.left,
                                                    width: dropdownPos.width,
                                                    zIndex: 99999
                                                }}
                                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl overflow-hidden"
                                            >
                                                <div className="p-2 border-b border-gray-100">
                                                    <div className="relative">
                                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            placeholder="Buscar país o código..."
                                                            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            value={countrySearch}
                                                            onChange={e => setCountrySearch(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-52 overflow-y-auto">
                                                    {countries.filter(c =>
                                                        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                                        c.dial.includes(countrySearch)
                                                    ).map(c => (
                                                        <button
                                                            key={c.code}
                                                            type="button"
                                                            onClick={() => { setSelectedCountry(c); setCountryDropdownOpen(false); setCountrySearch(''); }}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors
                                                                ${selectedCountry?.code === c.code ? 'bg-indigo-50 dark:bg-indigo-900/30 font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'}`}
                                                        >
                                                            <span className="text-base leading-none flex-shrink-0">{c.flag}</span>
                                                            <span className="flex-1 truncate">{c.name}</span>
                                                            <span className="text-gray-400 font-mono flex-shrink-0">{c.dial}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Número con formato automático */}
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                                            <Phone size={15} />
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="111-111-11-11"
                                            className="block w-full pl-8 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono tracking-wider text-sm dark:placeholder:text-slate-500"
                                            value={formatPhoneNumber(phoneDigits)}
                                            onChange={handlePhoneDigitsChange}
                                            maxLength={13}
                                        />
                                    </div>
                                </div>
                                {phoneDigits.length > 0 && phoneDigits.length < 10 && (
                                    <p className="mt-1 text-xs text-amber-600 font-medium">{10 - phoneDigits.length} dígitos restantes</p>
                                )}
                                {phoneDigits.length === 10 && (
                                    <p className="mt-1 text-xs text-emerald-600 font-medium">✓ Número completo</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rol</label>
                                <select name="idRol" value={formData.idRol} onChange={handleInputChange} className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer">
                                    <option value={1}>Administrador</option>
                                    <option value={2}>Médico</option>
                                    <option value={3}>Paciente</option>
                                </select>
                            </div>

                            {/* Campos Condicionales para Médicos */}
                            {Number(formData.idRol) === 2 && (
                                <>
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                                        <select
                                            name="idEspecialidad"
                                            value={formData.idEspecialidad}
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                setShowNewSpecialty(e.target.value === '-1');
                                            }}
                                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-all cursor-pointer"
                                        >
                                            {specialties.map(esp => (
                                                <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                                            ))}
                                            <option value="-1" className="font-bold text-indigo-600">➕ Agregar Otra Especialidad...</option>
                                        </select>
                                    </div>

                                    {showNewSpecialty && (
                                        <div className="animate-fade-in">
                                            <label className="block text-sm font-medium text-indigo-700 mb-1">Nombre de la Nueva Especialidad</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Cirugía General"
                                                value={newSpecialtyName}
                                                onChange={(e) => setNewSpecialtyName(e.target.value)}
                                                required={Number(formData.idEspecialidad) === -1}
                                                className="w-full border border-indigo-300 bg-indigo-50 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    )}

                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cédula Profesional</label>
                                        <input name="cedulaProfesional" placeholder="Ej: MED12345" value={formData.cedulaProfesional} onChange={handleCedulaChange} required={Number(formData.idRol) === 2 && !editUserId} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                                    </div>

                                    {/* Configuración de Agenda (Sólo en Creación) */}
                                    {!editUserId && (
                                        <>
                                            <div className="animate-fade-in md:col-span-2 lg:col-span-3 mt-4 border-t border-gray-100 pt-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Configuración de Agenda del Médico</h4>
                                                    <label className="flex items-center cursor-pointer">
                                                        <div className="relative">
                                                            <input type="checkbox" className="sr-only" name="isHorarioQuebrado" checked={formData.isHorarioQuebrado} onChange={handleInputChange} />
                                                            <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isHorarioQuebrado ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isHorarioQuebrado ? 'transform translate-x-4' : ''}`}></div>
                                                        </div>
                                                        <div className="ml-3 text-sm font-medium text-gray-700">Horario Quebrado (Por Día)</div>
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {!formData.isHorarioQuebrado ? (
                                                        <div className="flex gap-4">
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Hora de Entrada (24h)</label>
                                                                <input type="number" name="horaInicio" min="0" max="23" value={formData.horaInicio} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-lg text-center" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Hora de Salida (24h)</label>
                                                                <input type="number" name="horaFin" min="1" max="24" value={formData.horaFin} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-lg text-center" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="col-span-1 md:col-span-2 space-y-3">
                                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Horario Específico por Día</label>
                                                            {[
                                                                { id: 1, label: 'Lunes' }, { id: 2, label: 'Martes' }, { id: 3, label: 'Miércoles' },
                                                                { id: 4, label: 'Jueves' }, { id: 5, label: 'Viernes' }, { id: 6, label: 'Sábado' }, { id: 0, label: 'Domingo' }
                                                            ].filter(d => !formData.diasDescanso.includes(d.id)).map(diaObj => {
                                                                const h = formData.horariosPorDia.find(hd => hd.dia === diaObj.id)!;
                                                                return (
                                                                    <div key={diaObj.id} className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                                        <div className="w-24 font-medium text-sm text-gray-700">{diaObj.label}</div>
                                                                        <div className="flex-1 flex gap-2">
                                                                            <input type="number" min="0" max="23" value={h.horaInicio} onChange={(e) => handleHorarioPorDiaChange(diaObj.id, 'horaInicio', e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-center text-sm" placeholder="Entrada" />
                                                                            <span className="text-gray-400 self-center">-</span>
                                                                            <input type="number" min="1" max="24" value={h.horaFin} onChange={(e) => handleHorarioPorDiaChange(diaObj.id, 'horaFin', e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-center text-sm" placeholder="Salida" />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-2">Días de Descanso (Selecciona)</label>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {[
                                                                { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'X' },
                                                                { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 0, label: 'D' }
                                                            ].map(d => (
                                                                <button
                                                                    key={d.id} type="button"
                                                                    onClick={() => handleDayToggle(d.id)}
                                                                    className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${formData.diasDescanso.includes(d.id) ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                                >
                                                                    {d.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 lg:col-span-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-700 animate-fade-in flex items-center gap-2 mt-2">
                                                <span className="font-bold">Nota:</span> Al registrar este médico, el sistema generará automáticamente su agenda inicial basándose en esta configuración de horario.
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                            <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
                                <button type="button" onClick={resetForm} className="mr-3 px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg font-medium">
                                    {editUserId ? 'Guardar Cambios' : 'Registrar Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Tabla de Usuarios */}
                <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-4 sm:mb-8">
                    {/* Barra de busqueda y Filtros */}
                    <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-700/30">
                        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
                            <div className="relative flex-1 w-full">
                                <Search size={18} className="text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, email o apellido..."
                                    className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg pr-2 overflow-hidden shadow-sm">
                                    <div className="bg-gray-100 dark:bg-slate-600 p-2 text-gray-500 dark:text-slate-300 border-r border-gray-200 dark:border-slate-500">
                                        <Filter size={16} />
                                    </div>
                                    <select
                                        className="py-2 px-2 text-sm outline-none bg-transparent dark:text-white cursor-pointer"
                                        value={filterRol}
                                        onChange={(e) => setFilterRol(e.target.value)}
                                    >
                                        <option value="">Todos los Roles</option>
                                        <option value="1">Administradores</option>
                                        <option value="2">Médicos</option>
                                        <option value="3">Pacientes</option>
                                    </select>
                                </div>

                                <div className="relative group w-full md:w-auto">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                        <Calendar className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <DatePicker
                                        selected={filterDate}
                                        onChange={(date: Date | null) => setFilterDate(date)}
                                        dateFormat="dd/MM/yyyy"
                                        locale={es}
                                        placeholderText="Filtrar por fecha..."
                                        isClearable={false} // Avoid double clear buttons, we have the global one
                                        className="py-2.5 pl-9 pr-3 text-sm bg-white border border-gray-200 rounded-lg outline-none shadow-sm cursor-pointer w-full md:w-36 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <select
                                    className="py-2.5 px-3 text-sm bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600 border border-gray-200 rounded-lg outline-none shadow-sm cursor-pointer w-full sm:w-auto"
                                    value={filterEstado}
                                    onChange={(e) => setFilterEstado(e.target.value)}
                                >
                                    <option value="all">Todos los Estados</option>
                                    <option value="active">Solo Activos</option>
                                    <option value="inactive">Solo Inactivos (Desactivados)</option>
                                </select>

                                {(searchTerm || filterRol || filterEstado !== 'active' || filterDate) && (
                                    <button
                                        onClick={clearFilters}
                                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        <X size={14} /> Eliminar Filtros
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <div className="text-sm text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-3 py-1 rounded-md border border-gray-200 dark:border-slate-600 shadow-sm inline-block">
                                Total resultados: <span className="font-bold text-gray-800 dark:text-white">{filteredUsers.length}</span> usuarios
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                            <p>Cargando usuarios...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Search size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No se encontraron usuarios con ese criterio.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Vista Tarjetas para Mobile */}
                            <div className="sm:hidden divide-y divide-gray-100 dark:divide-slate-700">
                                {paginatedUsers.map(user => (
                                    <div key={user.id} className="p-4 hover:bg-indigo-50/20 dark:hover:bg-slate-700/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0
                                                    ${user.idRol === 1 ? 'bg-purple-600' : user.idRol === 2 ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                                    {user.nombre?.charAt(0)}{user.apellido?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{user.nombre} {user.apellido}</div>
                                                    <div className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[180px]">{user.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleToggleStatus(user.id, user.estado)}
                                                    className={`p-1.5 rounded-lg border ${user.estado ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-green-600 border-green-200 bg-green-50'
                                                        }`}
                                                    title={user.estado ? 'Desactivar' : 'Activar'}
                                                >
                                                    {user.estado ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
                                                </button>
                                                <button
                                                    onClick={() => { openEditForm(user); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    className="p-1.5 rounded-lg text-blue-600 border border-blue-200 bg-blue-50"
                                                    title="Editar"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${user.idRol === 1 ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                user.idRol === 2 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>{user.rol}</span>
                                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                                                <span className={`w-2 h-2 rounded-full ${user.estado ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                                {user.estado ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Vista Tabla para Desktop */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-slate-700/60 text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">
                                            <th className="p-5 border-b border-gray-100 dark:border-slate-700">Usuario</th>
                                            <th className="p-5 border-b border-gray-100 dark:border-slate-700">Rol</th>
                                            <th className="p-5 border-b border-gray-100 dark:border-slate-700">Estado</th>
                                            <th className="p-5 border-b border-gray-100 dark:border-slate-700">Registro</th>
                                            <th className="p-5 border-b border-gray-100 dark:border-slate-700 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {paginatedUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/50 transition-colors group">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
                                                ${user.idRol === 1 ? 'bg-purple-600' :
                                                                user.idRol === 2 ? 'bg-blue-500' : 'bg-emerald-500'}
                                            `}>
                                                            {user.nombre ? user.nombre.charAt(0) : 'U'}
                                                            {user.apellido ? user.apellido.charAt(0) : ''}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white">{user.nombre} {user.apellido}</div>
                                                            <div className="text-sm text-gray-500 dark:text-slate-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border
                                            ${user.idRol === 1 ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                            user.idRol === 2 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}
                                        `}>
                                                        {user.rol}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${user.estado ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                        <span className={`text-sm font-medium ${user.estado ? 'text-gray-700 dark:text-slate-300' : 'text-gray-500 dark:text-slate-500'}`}>
                                                            {user.estado ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-sm text-gray-500 dark:text-slate-400">
                                                    {user.fechaRegistro ? new Date(user.fechaRegistro).toLocaleDateString('es-ES', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    }) : '-'}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {/* Botón de Toggle Status */}
                                                        <button
                                                            onClick={() => handleToggleStatus(user.id, user.estado)}
                                                            className={`p-2 rounded-lg transition-all border ${user.estado
                                                                ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                                                                : 'text-green-600 border-green-200 hover:bg-green-50'
                                                                }`}
                                                            title={user.estado ? "Desactivar cuenta" : "Activar cuenta"}
                                                        >
                                                            {user.estado ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                                                        </button>

                                                        {/* Botón de Editar */}
                                                        <button
                                                            onClick={() => {
                                                                openEditForm(user);
                                                                // Scroll top to see the form
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="p-2 rounded-lg text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all"
                                                            title="Editar usuario"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>{/* end desktop table */}

                            {/* Barra de paginacion siempre visible */}
                            <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/30 dark:bg-slate-700/20">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                    <span>Mostrar</span>
                                    <div className="relative">
                                        <button
                                            ref={perPageBtnRef}
                                            type="button"
                                            onClick={() => {
                                                if (perPageBtnRef.current) {
                                                    const rect = perPageBtnRef.current.getBoundingClientRect();
                                                    setPerPagePos({ top: rect.top, left: rect.left, width: rect.width });
                                                }
                                                setPerPageOpen(o => !o);
                                            }}
                                            className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-700 transition-colors shadow-sm"
                                        >
                                            {itemsPerPage}
                                            <ChevronDown size={12} className={`text-gray-400 transition-transform ${perPageOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {perPageOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[99990]" onClick={() => setPerPageOpen(false)} />
                                                <div
                                                    style={{
                                                        position: 'fixed',
                                                        bottom: `calc(100vh - ${perPagePos.top}px)`,
                                                        left: perPagePos.left,
                                                        minWidth: Math.max(perPagePos.width, 120),
                                                        zIndex: 99999
                                                    }}
                                                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl overflow-hidden"
                                                >
                                                    {[5, 10, 15, 20].map(n => (
                                                        <button
                                                            key={n}
                                                            type="button"
                                                            onClick={() => { setItemsPerPage(n); setPerPageOpen(false); }}
                                                            className={`w-full px-4 py-2 text-xs text-left font-medium transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${itemsPerPage === n ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 font-bold' : 'text-gray-700 dark:text-slate-300'}`}
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <span>por página</span>
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500 dark:text-slate-400">
                                            Pag. <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> / <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-white hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }).map((_, i) => {
                                                const page = i + 1;
                                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentPage(page)}
                                                            className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${currentPage === page ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-300 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-700'}`}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                }
                                                if (page === currentPage - 2 || page === currentPage + 2) {
                                                    return <span key={page} className="text-gray-400 text-sm">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-white hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;

