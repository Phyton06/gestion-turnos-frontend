import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Activity, User, FileText, CheckCircle, XCircle, Calendar, CalendarX2, ChevronLeft, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';

// Tipos
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface CitaMedica {
    id: number;
    paciente: string;
    fecha: string;
    hora: string;
    motivo: string;
    estado: 'activo' | 'cancelado' | 'completado' | 'pendiente' | 'no_asistio';
}

interface HuecoLibre {
    id: number;
    fecha: string;
    hora: string;
}

const DoctorDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [citas, setCitas] = useState<CitaMedica[]>([]);
    const [huecos, setHuecos] = useState<HuecoLibre[]>([]);
    const [pacientes, setPacientes] = useState<any[]>([]);
    const [medicoIdDB, setMedicoIdDB] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [currentCitasPage, setCurrentCitasPage] = useState(0);
    const slotsPerPage = 6;
    const [loading, setLoading] = useState(false);

    // Estados para el médico y filtros
    const [medicoInfo, setMedicoInfo] = useState({ nombre: 'Cargando...', especialidad: '' });
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Formato YYYY-MM-DD para filtrado
    const formattedSelectedDate = selectedDate.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD local time

    const showNotification = (message: string, type: NotificationType) => {
        const swalType = type === 'info' ? 'info' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success';

        // Calcular tiempo de lectura: minimo 3 segundos, o 60ms por cada caracter
        const readTimeMs = Math.max(3000, message.length * 60);

        Swal.fire({
            title: message,
            icon: swalType,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: readTimeMs,
            timerProgressBar: true
        });
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            navigate('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            fetchAgenda(user.id_usuario);
            fetchPacientes();
        } catch (e) {
            console.error("Error leyendo usuario", e);
        }
    }, [navigate]);

    const fetchPacientes = async () => {
        try {
            const response = await axios.get('/users?roleId=2&limit=500');
            if (response.data.success) {
                setPacientes(response.data.data.users);
            }
        } catch (error) {
            console.error("Error al cargar pacientes:", error);
        }
    };

    const fetchAgenda = async (medicoId: number) => {
        setLoading(true);
        try {
            const response = await axios.get(`/turnos/agenda?medicoId=${medicoId}`);
            if (response.data.success) {
                if (response.data.data.medico) {
                    setMedicoInfo(response.data.data.medico);
                    if (response.data.data.medico.id) {
                        setMedicoIdDB(response.data.data.medico.id);
                    }
                }
                // Mapear citas
                const agenda = response.data.data.citas.map((t: any) => ({
                    id: t.id,
                    paciente: t.paciente,
                    fecha: t.fecha,
                    hora: t.hora,
                    motivo: 'Consulta General',
                    estado: t.estado
                }));
                setCitas(agenda);

                // Mapear huecos libres
                if (response.data.data.huecos) {
                    const disponibles = response.data.data.huecos.map((h: any) => ({
                        id: h.id,
                        fecha: h.fecha,
                        hora: h.hora
                    }));
                    setHuecos(disponibles);
                }
            }
        } catch (error) {
            console.error("Error cargando agenda:", error);
            showNotification('Error al cargar la agenda.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const agendarCita = async (idHorario: number, hora: string, fecha: string) => {
        if (!medicoIdDB) {
            showNotification('Error al identificar el médico.', 'error');
            return;
        }
        if (pacientes.length === 0) {
            showNotification('No hay pacientes registrados.', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: 'Agendar Cita',
            html: `
                <div class="mt-4 mb-2 text-left relative" id="paciente-select-wrapper">
                    <label for="paciente-search" class="block text-sm font-bold text-gray-700 mb-2">Busca y selecciona un paciente:</label>
                    <input 
                        id="paciente-search" 
                        type="text"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none shadow-sm placeholder-gray-400" 
                        placeholder="Empezar a escribir su nombre o apellido..."
                        autocomplete="off"
                    >
                    <input type="hidden" id="paciente-selected-id">
                    <div id="paciente-dropdown" class="hidden absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto text-sm text-left">
                    </div>
                </div>
                <div class="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-4">
                    <div class="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div class="text-left">
                        <p class="text-xs font-bold text-emerald-600 uppercase tracking-widest leading-tight mb-1">Horario Reservado</p>
                        <p class="text-lg font-black text-gray-900 leading-none">${hora} - ${fecha}</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Agendar Cita',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-[2rem] font-sans border border-gray-100 shadow-2xl shadow-emerald-900/10 p-2 md:p-6 overflow-visible',
                confirmButton: 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.2rem] px-6 py-4 font-black shadow-lg shadow-emerald-200 transition-all border-none focus:ring-4 focus:ring-emerald-100 w-full mb-3 text-lg',
                cancelButton: 'bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-[1.2rem] px-6 py-4 font-bold border border-gray-200 transition-all w-full m-0 text-lg',
                title: 'text-3xl font-black text-gray-900 mb-0',
                actions: 'w-full flex-col mt-6',
                htmlContainer: 'm-0 p-0 overflow-visible'
            },
            buttonsStyling: false,
            didOpen: () => {
                const searchInput = document.getElementById('paciente-search') as HTMLInputElement;
                const dropdown = document.getElementById('paciente-dropdown') as HTMLDivElement;
                const hiddenInput = document.getElementById('paciente-selected-id') as HTMLInputElement;

                const renderOptions = (filterText: string) => {
                    dropdown.innerHTML = '';
                    const filtered = pacientes.filter(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(filterText.toLowerCase()));

                    if (filtered.length === 0) {
                        dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-gray-500">No se encontraron pacientes.</div>';
                    } else {
                        filtered.forEach(p => {
                            const div = document.createElement('div');
                            div.className = 'px-4 py-3 cursor-pointer hover:bg-emerald-50 border-b border-gray-50 last:border-none transition-colors';

                            const nameSpan = document.createElement('span');
                            nameSpan.className = 'font-bold text-gray-700 block';
                            nameSpan.innerText = `${p.nombre} ${p.apellido}`;

                            const emailSpan = document.createElement('span');
                            emailSpan.className = 'text-xs text-gray-400 block';
                            emailSpan.innerText = p.email || '';

                            div.appendChild(nameSpan);
                            if (p.email) div.appendChild(emailSpan);

                            div.onclick = () => {
                                searchInput.value = `${p.nombre} ${p.apellido}`;
                                hiddenInput.value = p.id.toString();
                                dropdown.classList.add('hidden');
                            };
                            dropdown.appendChild(div);
                        });
                    }
                };

                searchInput.addEventListener('input', (e) => {
                    dropdown.classList.remove('hidden');
                    renderOptions((e.target as HTMLInputElement).value);
                    hiddenInput.value = ''; // Reset selected ID on manual edit
                });

                searchInput.addEventListener('focus', () => {
                    dropdown.classList.remove('hidden');
                    renderOptions(searchInput.value);
                });

                document.addEventListener('click', (e) => {
                    const wrapper = document.getElementById('paciente-select-wrapper');
                    if (wrapper && !wrapper.contains(e.target as Node)) {
                        dropdown.classList.add('hidden');
                    }
                });
            },
            preConfirm: () => {
                const selectedId = (document.getElementById('paciente-selected-id') as HTMLInputElement).value;
                if (!selectedId) {
                    Swal.showValidationMessage('Por favor busca y selecciona un paciente de la lista desplegable');
                    return false;
                }
                return selectedId;
            }
        });

        if (result.isConfirmed && result.value) {
            const idPaciente = parseInt(result.value, 10);

            try {
                setLoading(true);
                const response = await axios.post(`/turnos`, {
                    id_usuario: idPaciente,
                    id_medico: medicoIdDB,
                    id_horario: idHorario
                });

                if (response.data.success) {
                    showNotification('Cita agendada correctamente', 'success');
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        fetchAgenda(user.id_usuario);
                    }
                } else {
                    showNotification(response.data.message || 'Error al agendar cita', 'error');
                }
            } catch (error: any) {
                console.error("Error agendando cita", error);
                showNotification(error.response?.data?.message || 'Error de conexión', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const completarCita = async (cita: CitaMedica) => {
        const result = await Swal.fire({
            title: '¿Atención completada?',
            html: `
                <p class="mb-4 text-lg">Vas a registrar la finalización de la consulta con:</p>
                <div class="bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 flex items-center gap-4 mb-5">
                    <div class="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner">
                        👤
                    </div>
                    <div>
                        <h4 class="font-black text-gray-900 text-xl">${cita.paciente}</h4>
                        <p class="text-sm font-bold text-gray-500">${cita.hora} - ${cita.motivo}</p>
                    </div>
                </div>
                <p class="text-sm font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">Confirma que ya has atendido a este paciente.</p>
            `,
            customClass: {
                popup: 'rounded-[2.5rem] p-4 md:p-6 shadow-2xl shadow-emerald-900/10 border border-gray-100 bg-white font-sans',
                confirmButton: 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] px-6 py-4 font-black shadow-lg shadow-emerald-200 transition-all border-none focus:ring-4 focus:ring-emerald-100 w-full mb-3 text-lg',
                cancelButton: 'bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-[1.5rem] px-6 py-4 font-bold border border-gray-200 transition-all w-full text-lg m-0',
                title: 'text-3xl font-black text-gray-900',
                htmlContainer: 'text-left mt-6 font-medium text-gray-600',
                actions: 'w-full flex-col mt-6'
            },
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: 'Sí, paciente atendido',
            cancelButtonText: 'Regresar',
            showCloseButton: false
        });

        if (!result.isConfirmed) return;

        try {
            const response = await axios.patch(`/turnos/${cita.id}/complete`);
            if (response.data.success) {
                setCitas(citas.map(c => c.id === cita.id ? { ...c, estado: 'completado' } : c));
                showNotification('Cita marcada como completada', 'success');
            }
        } catch (error) {
            console.error("Error completando cita:", error);
            showNotification('Error al completar la cita.', 'error');
        }
    };

    const marcarInasistencia = async (cita: CitaMedica) => {
        const result = await Swal.fire({
            title: '¿Marcar inasistencia?',
            html: `
                <p class="mb-5 text-lg">Estás a punto de registrar que <strong class="text-gray-900">${cita.paciente}</strong> no se presentó a su consulta.</p>
                <p class="text-sm font-semibold bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                    <span class="text-2xl">⚠️</span> Este bloque de horario volverá a estar disponible para reservarse.
                </p>
            `,
            customClass: {
                popup: 'rounded-[2.5rem] p-4 md:p-6 shadow-2xl shadow-red-900/10 border border-gray-100 bg-white font-sans',
                confirmButton: 'bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] px-6 py-4 font-black shadow-lg shadow-red-200 transition-all border-none focus:ring-4 focus:ring-red-100 w-full mb-3 text-lg',
                cancelButton: 'bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-[1.5rem] px-6 py-4 font-bold border border-gray-200 transition-all w-full text-lg m-0',
                title: 'text-3xl font-black text-gray-900',
                htmlContainer: 'text-left mt-6 font-medium text-gray-600',
                actions: 'w-full flex-col mt-6'
            },
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: 'Confirmar inasistencia',
            cancelButtonText: 'Cancelar',
            showCloseButton: false
        });

        if (!result.isConfirmed) return;

        try {
            const response = await axios.patch(`/turnos/${cita.id}/no-show`);
            if (response.data.success) {
                setCitas(citas.map(c => c.id === cita.id ? { ...c, estado: 'no_asistio' } : c));
                showNotification('Inasistencia registrada', 'info');
                // Al cancelar, el bloque de horario se libera en la base de datos, 
                // así que recargamos la agenda para que aparezca en horas libres al instante
                if (medicoIdDB) {
                    fetchAgenda(medicoIdDB);
                }
            }
        } catch (error) {
            console.error("Error marcando inasistencia:", error);
            showNotification('Error al marcar inasistencia.', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Navbar Médico (Premium) */}
            <nav className="bg-white shadow-md shadow-emerald-900/5 px-8 py-5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-4">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 shadow-inner">
                        <Activity size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">
                            Bienvenido, <span className="text-emerald-600">{medicoInfo.nombre}</span>
                        </h1>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                            {medicoInfo.especialidad || 'Especialista'} | Portal Médico
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all text-sm font-bold border border-gray-100 shadow-sm active:scale-95"
                >
                    <LogOut size={18} />
                    Cerrar Sesión
                </button>
            </nav>

            <div className="flex-1 container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Columna Izquierda: Resumen del Día */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Agenda de Consultas</h2>
                            <p className="text-gray-500 font-medium mt-1">
                                Administra tus pacientes para la fecha seleccionada.
                            </p>
                        </div>
                        <div className="relative group w-full md:w-auto mt-4 md:mt-0">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                <Calendar className="h-5 w-5 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                            </div>
                            <DatePicker
                                selected={selectedDate as Date}
                                onChange={(date: Date | null) => {
                                    if (date) {
                                        setSelectedDate(date);
                                        setCurrentPage(0); // Reset pagination on date change
                                        setCurrentCitasPage(0);
                                    }
                                }}
                                dateFormat="dd/MM/yyyy"
                                locale={es}
                                className="block w-full md:w-auto pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none cursor-pointer hover:bg-white selection:bg-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Lista de Citas */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-700">Pacientes Programados</h3>
                            <button className="text-emerald-600 text-sm font-medium hover:underline" onClick={() => window.location.reload()}>Actualizar</button>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Cargando agenda...</div>
                        ) : citas.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">No hay citas programadas para hoy.</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {(() => {
                                    const filteredCitas = citas.filter(c => c.fecha === formattedSelectedDate);

                                    if (filteredCitas.length === 0) {
                                        return <div className="p-10 text-center text-gray-400 font-bold">No hay pacientes programados para esta fecha.</div>;
                                    }

                                    const totalCitasPages = Math.ceil(filteredCitas.length / slotsPerPage);
                                    const displayedCitas = filteredCitas.slice(
                                        currentCitasPage * slotsPerPage,
                                        (currentCitasPage + 1) * slotsPerPage
                                    );

                                    return (
                                        <>
                                            {displayedCitas.map((cita) => (
                                                <div key={cita.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-full ${cita.estado === 'completado' ? 'bg-gray-100 text-gray-400' :
                                                            cita.estado === 'cancelado' || cita.estado === 'no_asistio' ? 'bg-red-50 text-red-400' :
                                                                'bg-emerald-50 text-emerald-600'
                                                            }`}>
                                                            <User size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className={`font-bold text-lg ${cita.estado === 'completado' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                                                    {cita.paciente}
                                                                </h4>
                                                                {cita.estado === 'completado' && <CheckCircle size={16} className="text-green-500" />}
                                                                {(cita.estado === 'cancelado' || cita.estado === 'no_asistio') && <XCircle size={16} className="text-red-500" />}
                                                            </div>
                                                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                                <span className="flex items-center gap-1 font-bold"><Clock size={14} className="text-emerald-500" /> {cita.hora}</span>
                                                                <span className="flex items-center gap-1"><FileText size={14} /> {cita.motivo}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {cita.estado === 'activo' && (
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => marcarInasistencia(cita)}
                                                                className="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-black hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center border border-red-100"
                                                                title="No asistio"
                                                            >
                                                                <CalendarX2 size={20} />
                                                            </button>
                                                            <button
                                                                onClick={() => completarCita(cita)}
                                                                className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                                                            >
                                                                Paciente Atendido
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {totalCitasPages > 1 && (
                                                <div className="flex justify-between items-center p-6 bg-gray-50/50 border-t border-gray-100">
                                                    <button
                                                        onClick={() => setCurrentCitasPage(p => Math.max(0, p - 1))}
                                                        disabled={currentCitasPage === 0}
                                                        className="p-2 rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:bg-white hover:shadow-sm transition-all hover:text-emerald-600 hover:border-emerald-200"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                                                        Pág. {currentCitasPage + 1} / {totalCitasPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setCurrentCitasPage(p => Math.min(totalCitasPages - 1, p + 1))}
                                                        disabled={currentCitasPage === totalCitasPages - 1}
                                                        className="p-2 rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:bg-white hover:shadow-sm transition-all hover:text-emerald-600 hover:border-emerald-200"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Estadísticas Rápidas */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Activity size={120} />
                        </div>
                        <h3 className="font-black text-emerald-100 mb-1 text-sm uppercase tracking-widest flex items-center gap-2"><Calendar size={14} /> Estadísticas de hoy</h3>
                        <div className="text-6xl font-black mb-6 tracking-tighter">{citas.filter(c => c.fecha === formattedSelectedDate).length}</div>
                        <div className="flex flex-col gap-2 text-sm font-bold">
                            <span className="bg-white/20 px-3 py-2 rounded-xl flex justify-between items-center backdrop-blur-sm">
                                <span>✅ Atendidos</span>
                                <span>{citas.filter(c => c.fecha === formattedSelectedDate && c.estado === 'completado').length}</span>
                            </span>
                            <span className="bg-black/20 px-3 py-2 rounded-xl flex justify-between items-center backdrop-blur-sm">
                                <span>⏳ Pendientes</span>
                                <span>{citas.filter(c => c.fecha === formattedSelectedDate && c.estado === 'activo').length}</span>
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Horas libres para consultas hoy</h3>
                        <div className="space-y-3">
                            {(() => {
                                const now = new Date();
                                // Create today's date string in YYYY-MM-DD format for comparison
                                const todayStr = now.toISOString().split('T')[0];
                                const isSelectedToday = formattedSelectedDate === todayStr;

                                const filteredHuecos = huecos.filter(h => {
                                    if (h.fecha !== formattedSelectedDate) return false;

                                    if (isSelectedToday) {
                                        const [hours, minutes] = h.hora.split(':');
                                        const slotTime = new Date(`${h.fecha}T${hours}:${minutes}:00`);
                                        return slotTime >= now;
                                    }

                                    return true;
                                });

                                if (filteredHuecos.length === 0) {
                                    return <div className="text-center text-gray-400 font-bold py-4 text-sm">No hay horario disponible para consultas en esta fecha.</div>;
                                }

                                const totalPages = Math.ceil(filteredHuecos.length / slotsPerPage);
                                const displayedHuecos = filteredHuecos.slice(
                                    currentPage * slotsPerPage,
                                    (currentPage + 1) * slotsPerPage
                                );

                                return (
                                    <>
                                        <div className="space-y-3">
                                            {displayedHuecos.map(hueco => (
                                                <div key={hueco.id} className="flex justify-between items-center p-3 rounded-lg border bg-gray-50 border-dashed border-gray-300 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                                                    <span className="font-medium text-gray-600">{hueco.hora}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold px-2 py-1 rounded-full text-green-600 bg-green-50 uppercase tracking-tighter hidden sm:inline-block">
                                                            Disponible
                                                        </span>
                                                        <button
                                                            onClick={() => agendarCita(hueco.id, hueco.hora, hueco.fecha)}
                                                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-transform hover:scale-105 shadow-sm shadow-emerald-200"
                                                        >
                                                            Agendar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {totalPages > 1 && (
                                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                                    disabled={currentPage === 0}
                                                    className="p-2 rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition-all hover:text-emerald-600 hover:border-emerald-100"
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                                    Pág. {currentPage + 1} / {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                                    disabled={currentPage === totalPages - 1}
                                                    className="p-2 rounded-xl border border-gray-200 text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition-all hover:text-emerald-600 hover:border-emerald-100"
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DoctorDashboard;
