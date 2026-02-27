import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, Mail, Phone } from 'lucide-react';
import Swal from 'sweetalert2';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        confirmPassword: '',
        telefono: ''
    });

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Error de validación',
                text: 'Las contraseñas no coinciden.'
            });
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('/auth/register', {
                nombre: formData.nombre,
                apellido: formData.apellido,
                email: formData.email,
                password: formData.password,
                telefono: formData.telefono
            });

            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Registro exitoso!',
                    text: 'Serás redirigido al inicio de sesión.',
                    timer: 2000,
                    showConfirmButton: false
                });
                // Redirigir a login
                navigate('/login');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de registro',
                    text: response.data.message || 'Error al registrarse'
                });
            }

        } catch (err: any) {
            console.error('Error en registro:', err);
            let message = 'Error de conexión con el servidor.';
            if (err.response) {
                message = err.response.data.message || 'Error al procesar el registro.';
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
        <div className="min-h-screen w-full flex bg-gray-50 items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white p-10 rounded-[2rem] shadow-xl border border-gray-100">

                <div className="text-center mb-10">
                    <div className="inline-flex justify-center items-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-inner border border-indigo-100">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Crear una cuenta</h2>
                    <p className="mt-2 font-medium text-gray-500">Regístrate para gestionar tus citas médicas.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="nombre"
                                    required
                                    className="block w-full pl-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="Juan"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Apellido */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="apellido"
                                    required
                                    className="block w-full pl-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="Pérez"
                                    value={formData.apellido}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="block w-full pl-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="juan.perez@ejemplo.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Teléfono */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Phone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    name="telefono"
                                    className="block w-full pl-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="+54 11 1234 5678"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={6}
                                    className="block w-full pl-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="******"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    minLength={6}
                                    className={`block w-full pl-10 py-2.5 border rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors
                                ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-300'}
                            `}
                                    placeholder="******"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
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

                    <div className="mt-8 text-center bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-gray-500 mb-1">
                            ¿Ya tienes una cuenta o eres administrador/médico?
                        </p>
                        <Link to="/login" className="inline-flex items-center gap-2 font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-6 py-2 rounded-xl transition-colors border border-indigo-100 bg-white shadow-sm">
                            Volver al inicio de sesión
                        </Link>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Register;
