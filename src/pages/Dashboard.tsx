import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, LogOut, Activity, User, Plus, ChevronLeft, ChevronRight, Search, FilterX } from 'lucide-react';
import Swal from 'sweetalert2';
import { useSessionGuard } from '../hooks/useSessionGuard';
import { clearSession, getStoredUser } from '../utils/auth';

// Interfaces
interface Especialidad {
    id: number;
    nombre: string;
}

interface Medico {
    id: number;
    nombre: string;
    especialidad: string;
    especialidadId: number;
}

interface HorarioAPI {
    id: number;
    horaInicio: string;
    horaFin: string;
}

interface MedicoAvailability {
    medico: {
        id: number;
        nombre: string;
        especialidad: string;
    };
    slots: HorarioAPI[];
}

interface Turno {
    id: number;
    fecha: string;
    hora: string;
    medico: string;
    especialidad: string;
    estado: string;
}

type NotificationType = 'success' | 'error' | 'warning' | 'info';

const Dashboard: React.FC = () => {
    useSessionGuard(); // Protege la ruta: chequeo en mount + timer de expiración
    const navigate = useNavigate();
    const location = useLocation();

    // UI States
    const [view, setView] = useState<'dashboard' | 'booking'>('dashboard');
    const [filterStatus, setFilterStatus] = useState<'todas' | 'activo' | 'completado' | 'cancelado'>('todas');
    const [loading, setLoading] = useState(false);
    const [loadingMedicos, setLoadingMedicos] = useState(false);

    // Data States
    const [userId, setUserId] = useState<number | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [misTurnos, setMisTurnos] = useState<Turno[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<{ medicoId: number, horarioId: number, hora: string } | null>(null);

    // Booking Flow States
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [selectedEspecialidad, setSelectedEspecialidad] = useState<number | null>(null);
    const [medicos, setMedicos] = useState<Medico[]>([]);
    const [selectedMedico, setSelectedMedico] = useState<number | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [disponibilidad, setDisponibilidad] = useState<MedicoAvailability[]>([]);
    const [monthCalendar, setMonthCalendar] = useState<Record<string, string>>({});

    // Advanced Filtering States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

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
        const user = getStoredUser<{ id_usuario?: number; nombre?: string; apellido?: string }>();
        if (!user) return;

        setUserId(user.id_usuario ?? null);
        setUserName(`${user.nombre ?? ''} ${user.apellido ?? ''}`.trim());

        if (location.state?.initialHistory) {
            mapAndSetTurnos(location.state.initialHistory);
        } else {
            fetchHistorial(user.id_usuario!);
        }

        fetchEspecialidades();
    }, [navigate, location.state]);

    const fetchEspecialidades = async () => {
        try {
            const response = await axios.get('/medicos/specialties');
            if (response.data.success) {
                setEspecialidades(response.data.data);
            }
        } catch (error) {
            console.error("Error cargando especialidades:", error);
        }
    };

    const mapAndSetTurnos = (data: any[]) => {
        const turnosMapeados = data.map((t: any) => ({
            id: t.id,
            fecha: t.fecha,
            hora: t.hora,
            medico: t.medico,
            especialidad: t.especialidad,
            estado: t.estado || 'activo',
        }));
        setMisTurnos(turnosMapeados);
    };

    const fetchHistorial = async (idUsuario: number) => {
        try {
            const response = await axios.get(`/appointments/history?pacienteId=${idUsuario}`);
            if (response.data.success) {
                mapAndSetTurnos(response.data.data);
            }
        } catch (error) {
            console.error("Error cargando historial:", error);
        }
    };

    useEffect(() => {
        if (selectedEspecialidad) {
            fetchMedicos(selectedEspecialidad);
        } else {
            setMedicos([]);
        }
        setSelectedMedico(null);
        setSelectedDate(null);
        setDisponibilidad([]);
        setMonthCalendar({});
    }, [selectedEspecialidad]);

    useEffect(() => {
        if (selectedMedico) {
            fetchCalendarInfo();
        } else {
            setMonthCalendar({});
        }
    }, [selectedMedico, currentMonth]);

    const fetchCalendarInfo = async () => {
        if (!selectedMedico) return;
        try {
            const y = currentMonth.getFullYear();
            const m = currentMonth.getMonth() + 1;
            const res = await axios.get(`/availability/calendar?medicoId=${selectedMedico}&anio=${y}&mes=${m}`);
            if (res.data.success) {
                setMonthCalendar(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching calendar info", error);
        }
    };

    const fetchMedicos = async (espId: number) => {
        setLoadingMedicos(true);
        try {
            const response = await axios.get(`/medicos?especialidadId=${espId}`);
            if (response.data.success) {
                const medicosData = response.data.data.medicos || response.data.data;
                setMedicos(Array.isArray(medicosData) ? medicosData : []);
            }
        } catch (error) {
            console.error("Error cargando médicos", error);
        } finally {
            setLoadingMedicos(false);
        }
    };

    const fetchAvailability = async (date: Date) => {
        if (!selectedMedico) return;
        setLoading(true);
        setDisponibilidad([]);
        try {
            const fechaStr = date.toISOString().split('T')[0];
            const response = await axios.get(`/availability?fecha=${fechaStr}&especialidadId=${selectedEspecialidad}&pacienteId=${userId}`);
            if (response.data.success) {
                const todos = response.data.data as MedicoAvailability[];
                const filtrados = todos.filter(g => g.medico.id === selectedMedico);
                setDisponibilidad(filtrados);
                if (filtrados.length === 0) showNotification('El médico no tiene horarios libres hoy.', 'info');
            }
        } catch (error) {
            showNotification('Error al cargar horarios.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        fetchAvailability(date);
    };

    const handleReservar = (medicoId: number, horarioId: number, hora: string) => {
        setPendingBooking({ medicoId, horarioId, hora });
        setShowConfirmModal(true);
    };

    const executeReservar = async () => {
        if (!userId || !pendingBooking) return;
        const { medicoId, horarioId } = pendingBooking;
        setLoading(true);

        try {
            const response = await axios.post('/turnos', {
                id_usuario: userId,
                id_medico: medicoId,
                id_horario: horarioId
            });
            if (response.data.success) {
                showNotification('¡Turno reservado con éxito!', 'success');
                setShowConfirmModal(false);
                setPendingBooking(null);
                showNotification('¡Turno reservado con éxito!', 'success');
                // Forzar actualización inmediata de turnos locales
                const updatedResponse = await axios.get(`/appointments/history?pacienteId=${userId}`);
                if (updatedResponse.data.success) {
                    mapAndSetTurnos(updatedResponse.data.data);
                }

                setView('dashboard');
                // Limpiar reserva
                setSelectedEspecialidad(null);
                setSelectedMedico(null);
                setSelectedDate(null);
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'No se pudo reservar el turno.';
            const status = error.response?.status;

            if (status === 409) {
                Swal.fire({
                    title: 'Horario Ocupado',
                    text: 'Lo sentimos, este horario acaba de ser reservado por otro paciente o ya tienes un compromiso a esta hora.',
                    icon: 'warning',
                    confirmButtonColor: '#2563eb',
                    confirmButtonText: 'Entendido'
                });
            } else {
                showNotification(msg, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancelar = async (turnoId: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Estás seguro de cancelar este turno?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, mantener'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await axios.patch(`/turnos/${turnoId}/cancel`);
            if (response.data.success) {
                showNotification('Turno cancelado.', 'success');
                if (userId) fetchHistorial(userId);
            }
        } catch (error) {
            showNotification('Error al cancelar el turno.', 'error');
        }
    };

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let i = 0; i < firstDay.getDay(); i++) days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const pad = (n: number) => n.toString().padStart(2, '0');
            const dateStr = `${year}-${pad(month + 1)}-${pad(i)}`;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const calendarStatus = monthCalendar[dateStr];
            const isPast = date < today || calendarStatus === 'pasado';
            const isResting = calendarStatus === 'descanso';
            const isFull = calendarStatus === 'lleno';
            const isDisabled = isPast || isResting || isFull;

            const isToday = new Date().toDateString() === date.toDateString();
            days.push(
                <button
                    key={i}
                    disabled={isDisabled}
                    onClick={() => handleDateSelect(date)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                        ${isSelected ? 'bg-blue-600 text-white shadow-lg scale-110' : 'hover:bg-blue-100 text-gray-700'}
                        ${isToday ? 'border-2 border-blue-400' : ''}
                        ${isDisabled ? 'opacity-30 cursor-not-allowed bg-gray-50' : ''}
                        ${isFull && !isDisabled ? 'bg-red-50 text-red-500 hover:bg-red-100' : ''}
                    `}
                >
                    {i}
                    {isResting && <span className="absolute bottom-1 w-1 h-1 bg-gray-400 rounded-full"></span>}
                    {isFull && <span className="absolute bottom-1 w-1 h-1 bg-red-400 rounded-full"></span>}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Navbar Premium - Responsive */}
            <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                        <Activity size={20} className="sm:hidden" />
                        <Activity size={24} className="hidden sm:block" />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">CitasOnline</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none hidden sm:block">Portal Paciente</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-6">
                    <div className="hidden md:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {userName.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700 font-bold">Hola, {userName.split(' ')[0]}</span>
                    </div>
                    {/* Mobile user avatar */}
                    <div className="flex md:hidden items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {userName.charAt(0)}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            clearSession();
                            navigate('/login', { replace: true });
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Cerrar sesión"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            <main className="flex-1 container mx-auto p-3 sm:p-6 max-w-6xl">
                {view === 'dashboard' ? (
                    <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-500">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4 sm:mb-8">
                            <div>
                                <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mb-1 sm:mb-2">Tu Resumen</h2>
                                <p className="text-gray-500 font-medium text-sm sm:text-lg">Gestiona tus consultas y salud personal.</p>
                            </div>
                            <button
                                onClick={() => setView('booking')}
                                className="w-full sm:w-auto bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-95 group"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                Agendar Nueva Cita
                            </button>
                        </div>

                        {/* Quick Stats - Próxima Cita Detallada */}
                        <div className="grid grid-cols-1 gap-6">
                            {(() => {
                                const parseDateTime = (fecha: string, hora: string) => {
                                    const match = hora.match(/(\d+):(\d+)(?:\s*(am|pm|p\.\s*m\.|a\.\s*m\.))?/i);
                                    if (!match) return new Date(fecha).getTime();

                                    let h = parseInt(match[1]);
                                    const m = parseInt(match[2]);
                                    const period = (match[3] || '').toLowerCase();

                                    if ((period.includes('p') || period.includes('pm')) && h < 12) h += 12;
                                    if ((period.includes('a') || period.includes('am')) && h === 12) h = 0;

                                    // Usamos un separador T para formar un string ISO-like compatible
                                    return new Date(`${fecha}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`).getTime();
                                };

                                const proxima = [...misTurnos]
                                    .filter(t => t.estado === 'activo')
                                    .sort((a, b) => parseDateTime(a.fecha, a.hora) - parseDateTime(b.fecha, b.hora))[0];
                                return proxima ? (
                                    <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 animate-in slide-in-from-top duration-700 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                            <Activity size={180} />
                                        </div>

                                        <div className="bg-blue-50 text-blue-600 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-inner self-start sm:self-auto">
                                            <Clock size={36} strokeWidth={2.5} className="sm:hidden" />
                                            <Clock size={48} strokeWidth={2.5} className="hidden sm:block" />
                                        </div>

                                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-8 w-full items-start sm:items-center">
                                            <div className="space-y-1 col-span-2 sm:col-span-1 lg:col-span-1 border-b sm:border-b-0 sm:border-r border-gray-100 pb-3 sm:pb-0">
                                                <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-none">Próxima Cita</h3>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Fecha</p>
                                                <h3 className="text-sm sm:text-xl font-black text-gray-800 tracking-tight">{proxima.fecha}</h3>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Horario</p>
                                                <h3 className="text-sm sm:text-xl font-black text-gray-800 tracking-tight">{proxima.hora}</h3>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Médico</p>
                                                <h3 className="text-sm sm:text-xl font-black text-gray-800 tracking-tight">{proxima.medico}</h3>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Especialidad</p>
                                                <div className="flex">
                                                    <span className="bg-blue-600 text-white text-[10px] font-black px-3 sm:px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-blue-200">
                                                        {proxima.especialidad}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6 opacity-60">
                                        <div className="bg-gray-50 text-gray-300 p-5 rounded-2xl">
                                            <CalendarIcon size={32} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Agenda Disponible</p>
                                            <h3 className="text-lg font-bold text-gray-400 tracking-tight leading-none">No tienes citas próximas. ¿Necesitas una revisión?</h3>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Citas Main Table/Grid */}
                        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="p-4 sm:p-8 border-b border-gray-50 flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                                    <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Listado de Consultas</h3>
                                    <div className="flex gap-1 bg-gray-50 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
                                        {['todas', 'activo', 'completado', 'cancelado'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setFilterStatus(status as any);
                                                    setCurrentPage(1);
                                                }}
                                                className={`flex-1 md:flex-none px-5 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-tighter
                                                    ${filterStatus === status ? 'bg-white shadow-md text-blue-600' : 'text-gray-400 hover:text-gray-600'}
                                                `}
                                            >
                                                {status === 'activo' ? 'Próximas' : status === 'cancelado' ? 'Inasistencias / Canceladas' : status === 'completado' ? 'Completas' : 'Todas'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                            <Search size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar médico o especialidad..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                            <CalendarIcon size={18} />
                                        </div>
                                        <input
                                            type="date"
                                            value={filterDate}
                                            onChange={(e) => {
                                                setFilterDate(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilterDate('');
                                                setFilterStatus('todas');
                                                setCurrentPage(1);
                                            }}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
                                        >
                                            <FilterX size={16} />
                                            Limpiar Filtros
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 sm:p-8">
                                    {(() => {
                                        const filtered = misTurnos.filter(t => {
                                            const matchesStatus = filterStatus === 'todas' ||
                                                (filterStatus === 'cancelado' ? (t.estado === 'cancelado' || t.estado === 'no_asistio') : t.estado === filterStatus);
                                            const matchesSearch = t.medico.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                t.especialidad.toLowerCase().includes(searchTerm.toLowerCase());
                                            const matchesDate = !filterDate || t.fecha === filterDate;
                                            return matchesStatus && matchesSearch && matchesDate;
                                        }).sort((a, b) => {
                                            // 1. Prioridad por estado
                                            const statusWeight = { 'activo': 0, 'completado': 1, 'no_asistio': 2, 'cancelado': 2 };
                                            const weightA = statusWeight[a.estado as keyof typeof statusWeight] ?? 3;
                                            const weightB = statusWeight[b.estado as keyof typeof statusWeight] ?? 3;

                                            if (weightA !== weightB) return weightA - weightB;

                                            // 2. Orden cronológico dentro del mismo estado
                                            const parseDateTime = (fecha: string, hora: string) => {
                                                const match = hora.match(/(\d+):(\d+)(?:\s*(am|pm|p\.\s*m\.|a\.\s*m\.))?/i);
                                                if (!match) return new Date(fecha).getTime();
                                                let h = parseInt(match[1]);
                                                const m = parseInt(match[2]);
                                                const period = (match[3] || '').toLowerCase();
                                                if ((period.includes('p') || period.includes('pm')) && h < 12) h += 12;
                                                if ((period.includes('a') || period.includes('am')) && h === 12) h = 0;
                                                return new Date(`${fecha}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`).getTime();
                                            };

                                            const dateA = parseDateTime(a.fecha, a.hora);
                                            const dateB = parseDateTime(b.fecha, b.hora);

                                            // Activo: más cercanas primero. Completado/Otros: más recientes primero.
                                            if (a.estado === 'activo') return dateA - dateB;
                                            return dateB - dateA;
                                        });

                                        const totalItems = filtered.length;
                                        const totalPages = Math.ceil(totalItems / itemsPerPage);
                                        const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                                        if (totalItems === 0) {
                                            return (
                                                <div className="py-20 flex flex-col items-center text-center">
                                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-inner">
                                                        <CalendarIcon size={40} className="text-gray-200" />
                                                    </div>
                                                    <h4 className="text-lg font-bold text-gray-800">Sin registros</h4>
                                                    <p className="text-gray-400 text-sm max-w-xs">No se encontraron citas que coincidan con tus filtros.</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {paginatedItems.map(turno => (
                                                        <div key={turno.id} className="group bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all">
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                                                ${turno.estado === 'activo' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                        turno.estado === 'completado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                            'bg-red-50 text-red-600 border border-red-100'}
                                                            `}>
                                                                    {turno.estado === 'activo' ? 'Próxima' :
                                                                        turno.estado === 'completado' ? 'Completado' :
                                                                            turno.estado === 'no_asistio' ? 'Inasistencia' : 'Cancelada'}
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-300">ID-{turno.id}</span>
                                                            </div>

                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                                                    <User size={28} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-black text-gray-900 leading-none mb-1">{turno.medico}</h4>
                                                                    <p className="text-[11px] text-blue-600 font-black uppercase tracking-widest">{turno.especialidad}</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                                <div className="bg-gray-50/80 p-3 rounded-2xl flex items-center gap-2">
                                                                    <CalendarIcon size={14} className="text-blue-500" />
                                                                    <span className="text-xs font-black text-gray-700">{turno.fecha}</span>
                                                                </div>
                                                                <div className="bg-gray-50/80 p-3 rounded-2xl flex items-center gap-2">
                                                                    <Clock size={14} className="text-blue-500" />
                                                                    <span className="text-xs font-black text-gray-700">{turno.hora}</span>
                                                                </div>
                                                            </div>

                                                            {turno.estado === 'activo' && (
                                                                <button
                                                                    onClick={() => handleCancelar(turno.id)}
                                                                    className="w-full py-3 rounded-2xl border-2 border-red-50 text-red-500 text-xs font-black hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    Cancelar Turno
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Paginación Premium */}
                                                {totalPages > 1 && (
                                                    <div className="mt-12 flex justify-between items-center bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                                                        <p className="text-xs text-gray-400 font-bold px-4">
                                                            Mostrando <span className="text-gray-900">{paginatedItems.length}</span> de <span className="text-gray-900">{totalItems}</span> citas
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                                disabled={currentPage === 1}
                                                                className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                                            >
                                                                <ChevronLeft size={20} />
                                                            </button>

                                                            <div className="flex gap-1 items-center px-2">
                                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                                    <button
                                                                        key={page}
                                                                        onClick={() => setCurrentPage(page)}
                                                                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all
                                                                        ${currentPage === page
                                                                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                                                                                : 'text-gray-400 hover:bg-white hover:text-gray-900'}
                                                                    `}
                                                                    >
                                                                        {page}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            <button
                                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                                disabled={currentPage === totalPages}
                                                                className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                                                            >
                                                                <ChevronRight size={20} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom duration-500 pb-20">
                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                            <button
                                onClick={() => setView('dashboard')}
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:shadow-lg transition-all border border-gray-100 flex-shrink-0"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <div>
                                <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">Nueva Consulta</h2>
                                <p className="text-gray-500 font-medium italic text-sm sm:text-base">Sigue los pasos para confirmar tu espacio.</p>
                            </div>
                        </div>

                        <div className="space-y-4 sm:space-y-8">
                            {/* Paso 1: Especialidad */}
                            <section className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 mb-5 sm:mb-8">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm sm:text-base">1</div>
                                    <h3 className="text-base sm:text-xl font-black text-gray-800 tracking-tight">¿Qué especialidad buscas?</h3>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                                    {especialidades.map(esp => (
                                        <button
                                            key={esp.id}
                                            onClick={() => setSelectedEspecialidad(esp.id)}
                                            className={`p-3 sm:p-4 rounded-2xl text-xs font-black text-center transition-all border-2
                                                ${selectedEspecialidad === esp.id
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200'
                                                    : 'bg-white text-gray-500 border-gray-50 hover:border-blue-200 hover:text-blue-600'}
                                            `}
                                        >
                                            {esp.nombre}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Paso 2: Médico */}
                            <section className={`bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-gray-100 transition-all duration-500 ${!selectedEspecialidad ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                                <div className="flex items-center gap-3 mb-5 sm:mb-8">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm sm:text-base">2</div>
                                    <h3 className="text-base sm:text-xl font-black text-gray-800 tracking-tight">Elige tu especialista</h3>
                                </div>

                                {loadingMedicos ? (
                                    <div className="py-10 text-center text-blue-600 font-bold animate-pulse">Buscando profesionales...</div>
                                ) : medicos.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {medicos.map(med => (
                                            <button
                                                key={med.id}
                                                onClick={() => setSelectedMedico(med.id)}
                                                className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-4
                                                    ${selectedMedico === med.id
                                                        ? 'border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-600'
                                                        : 'border-gray-50 hover:border-blue-200 hover:bg-gray-50'}
                                                `}
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black
                                                    ${selectedMedico === med.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-300'}
                                                `}>
                                                    {med.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-gray-900 leading-none mb-1">{med.nombre}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{med.especialidad}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-10 text-gray-400 font-medium">No hay médicos activos para esta especialidad.</p>
                                )}
                            </section>

                            {/* Paso 3: Calendario */}
                            <section className={`bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-gray-100 transition-all duration-500 ${!selectedMedico ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                                <div className="flex items-center gap-3 mb-5 sm:mb-8">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm sm:text-base">3</div>
                                    <h3 className="text-base sm:text-xl font-black text-gray-800 tracking-tight">¿Cuándo quieres venir?</h3>
                                </div>

                                <div className="bg-gray-50 p-3 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem]">
                                    <div className="flex justify-between items-center mb-6 sm:mb-10 px-2 sm:px-4">
                                        <button className="text-gray-400 hover:text-blue-600 font-black text-sm sm:text-base" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>ANT.</button>
                                        <span className="font-black text-base sm:text-xl text-gray-900 uppercase tracking-tighter">
                                            {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button className="text-gray-400 hover:text-blue-600 font-black text-sm sm:text-base" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>SIG.</button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 sm:gap-4">
                                        {['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'].map(d => (
                                            <div key={d} className="text-center text-[10px] font-black text-gray-300 tracking-widest mb-4">{d}</div>
                                        ))}
                                        {generateCalendarDays()}
                                    </div>
                                </div>
                            </section>

                            {/* Paso 4: Disponibilidad */}
                            {selectedDate && selectedMedico && (
                                <section className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-gray-100 animate-in slide-in-from-bottom duration-700">
                                    <div className="flex items-center gap-3 mb-6 sm:mb-10">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm sm:text-base">4</div>
                                        <h3 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">Horarios Disponibles</h3>
                                    </div>

                                    {loading ? (
                                        <div className="py-20 flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-gray-500 font-bold">Consultando agenda...</p>
                                        </div>
                                    ) : disponibilidad.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                            {disponibilidad[0].slots.map(slot => {
                                                const now = new Date();
                                                const pad = (n: number) => n.toString().padStart(2, '0');
                                                const slotDateStr = `${selectedDate?.getFullYear()}-${pad(selectedDate!.getMonth() + 1)}-${pad(selectedDate!.getDate())}`;
                                                const isToday = selectedDate?.getDate() === now.getDate() && selectedDate?.getMonth() === now.getMonth() && selectedDate?.getFullYear() === now.getFullYear();

                                                // Checar si es hora pasada (si es hoy)
                                                let isPastTime = false;
                                                if (isToday) {
                                                    const timeMatch = slot.horaInicio.match(/(\d+):(\d+)(?:\s*(am|pm|p\.\s*m\.|a\.\s*m\.))?/i);
                                                    if (timeMatch) {
                                                        let h = parseInt(timeMatch[1]);
                                                        const m = parseInt(timeMatch[2]);
                                                        const period = (timeMatch[3] || '').toLowerCase();

                                                        if ((period.includes('p') || period.includes('pm')) && h < 12) h += 12;
                                                        if ((period.includes('a') || period.includes('am')) && h === 12) h = 0;

                                                        const slotTime = new Date(now);
                                                        slotTime.setHours(h, m, 0, 0);
                                                        isPastTime = slotTime < now;
                                                    }
                                                }

                                                // Checar si el paciente ya tiene cita a esta hora o cerca (1 hora de diferencia)
                                                const conflictInfo = misTurnos.find(t => {
                                                    if (t.fecha !== slotDateStr || t.estado !== 'activo') return false;

                                                    // Parse t.hora (puede venir de toLocaleTimeString es-AR)
                                                    const tMatch = t.hora.match(/(\d+):(\d+)(?:\s*(am|pm|p\.\s*m\.|a\.\s*m\.))?/i);
                                                    const sMatch = slot.horaInicio.match(/(\d+):(\d+)(?:\s*(am|pm|p\.\s*m\.|a\.\s*m\.))?/i);

                                                    if (!tMatch || !sMatch) return false;

                                                    let [tH, tM] = [parseInt(tMatch[1]), parseInt(tMatch[2])];
                                                    let [sH, sM] = [parseInt(sMatch[1]), parseInt(sMatch[2])];
                                                    const tampm = (tMatch[3] || '').toLowerCase();
                                                    const sampm = (sMatch[3] || '').toLowerCase();

                                                    if ((tampm.includes('p') || tampm.includes('pm')) && tH < 12) tH += 12;
                                                    if ((tampm.includes('a') || tampm.includes('am')) && tH === 12) tH = 0;

                                                    if ((sampm.includes('p') || sampm.includes('pm')) && sH < 12) sH += 12;
                                                    if ((sampm.includes('a') || sampm.includes('am')) && sH === 12) sH = 0;

                                                    const tTotal = tH * 60 + tM;
                                                    const sTotal = sH * 60 + sM;

                                                    // Menos de 1 hora (60 mins) de diferencia
                                                    return Math.abs(tTotal - sTotal) < 60;
                                                });

                                                const hasConflict = !!conflictInfo;
                                                const isDisabled = isPastTime || hasConflict;

                                                return (
                                                    <button
                                                        key={slot.id}
                                                        disabled={isDisabled}
                                                        onClick={() => handleReservar(disponibilidad[0].medico.id, slot.id, slot.horaInicio)}
                                                        className={`py-4 rounded-2xl font-black text-sm border transition-all active:scale-95 flex flex-col items-center justify-center gap-1
                                                                ${isDisabled
                                                                ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-60'
                                                                : 'bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border-blue-100 hover:border-blue-200 shadow-sm'}
                                                            `}
                                                    >
                                                        <span>{slot.horaInicio}</span>
                                                        {hasConflict && (
                                                            <span className="text-[7px] uppercase tracking-tighter opacity-100 bg-red-100 text-red-600 px-2 py-0.5 rounded-full ring-1 ring-red-200 mt-1">
                                                                {conflictInfo.hora.includes(slot.horaInicio.split(' ')[0]) ? 'Ya tienes cita' : 'Margen Insuficiente'}
                                                            </span>
                                                        )}
                                                        {isPastTime && !hasConflict && (
                                                            <span className="text-[7px] uppercase tracking-tighter opacity-100 bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full ring-1 ring-gray-300 mt-1">
                                                                No disponible
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 border border-gray-100 p-10 rounded-2xl text-center text-gray-500 font-medium">No hay turnos para esta fecha.</div>
                                    )}
                                </section>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal de Confirmación Custom Premium */}
            {showConfirmModal && pendingBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowConfirmModal(false)}
                    />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-gray-100">
                        {/* Header Decorativo */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-10 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl" />

                            <div className="relative inline-flex bg-white/20 p-4 rounded-[1.5rem] backdrop-blur-md mb-4 border border-white/30">
                                <Plus className="text-white" size={32} />
                            </div>
                            <h2 className="relative text-2xl font-black text-white tracking-tight">Confirmar Cita Médica</h2>
                            <p className="relative text-blue-100 text-sm font-medium mt-1">Verifica los detalles de tu consulta antes de agendar</p>
                        </div>

                        <div className="p-10 space-y-8">
                            {/* Card del Médico */}
                            <div className="flex items-center gap-5 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                <div className="w-16 h-16 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-200">
                                    {(medicos.find(m => m.id === pendingBooking.medicoId)?.nombre || 'M').charAt(0)}
                                </div>
                                <div>
                                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] mb-1">Especialista Asignado</p>
                                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                                        {medicos.find(m => m.id === pendingBooking.medicoId)?.nombre}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-bold italic">
                                        {medicos.find(m => m.id === pendingBooking.medicoId)?.especialidad}
                                    </p>
                                </div>
                            </div>

                            {/* Detalles de Fecha y Hora */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                        <CalendarIcon size={14} className="text-blue-500" />
                                        <span>Fecha</span>
                                    </div>
                                    <p className="text-gray-900 font-black capitalize">
                                        {selectedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                                <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                        <Clock size={14} className="text-blue-500" />
                                        <span>Horario</span>
                                    </div>
                                    <p className="text-gray-900 font-black">{pendingBooking.hora}</p>
                                </div>
                            </div>

                            {/* Alerta de Recordatorio */}
                            <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <div className="text-amber-500 mt-0.5"><Activity size={16} /></div>
                                <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                                    Recuerda llegar 15 minutos antes de tu cita. Las cancelaciones deben hacerse con 24h de anticipación.
                                </p>
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={loading}
                                    className="flex-1 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executeReservar}
                                    disabled={loading}
                                    className="flex-[1.5] px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Confirmar Agendado'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
