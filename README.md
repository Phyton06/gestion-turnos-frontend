# Gestión de Turnos - Frontend - v1.0.0

## Descripción y Estado
Aplicación cliente para la gestión de turnos médicos, diseñada para ofrecer una interfaz clara y eficiente a pacientes, médicos y administradores. Esta versión v1.0.0 representa la primera versión estable de la interfaz de usuario, completamente integrada con los servicios de la API backend.

**Acceso Demo:** [https://gestion-turnos-frontend.vercel.app/](https://gestion-turnos-frontend.vercel.app/)

Agradezco cualquier feedback técnico o funcional para continuar mejorando el sistema.

## Acceso de Prueba
Para explorar las funcionalidades de cada rol, puede utilizar las siguientes credenciales (Contraseña: `123456` para todas):
- **Administrador:** `admin@test.com`
- **Médico:** `medico@test.com`
- **Paciente:** `paciente@test.com`

## Características de la v1
- Dashboards diferenciados con vistas específicas para los roles de Paciente, Médico y Administrador.
- Sistema de protección de rutas y monitoreo de sesión activa con alertas de expiración automática.
- Flujo interactivo de reserva de citas mediante calendario de disponibilidad dinámica en tiempo real.
- Panel de administración centralizado para la gestión de usuarios y perfiles médicos.
- Interfaz de recuperación de credenciales integrada con validación de códigos de un solo uso.

## Arquitectura y Tecnologías
- React: Biblioteca principal para la construcción de interfaces de usuario modulares.
- Vite: Herramienta de compilación y servidor de desarrollo de alta velocidad.
- Axios: Cliente HTTP para la comunicación persistente con la API del servidor.
- Lucide React: Librería de iconos vectoriales para elementos de navegación y UI.
- Tailwind CSS: Framework de utilidad para la implementación del diseño visual y responsividad.
- Vercel: Plataforma de despliegue y hosting para la aplicación frontend.

## Requisitos Previos
- Node.js (v18.0.0 o superior) o Bun.
- Navegador moderno con soporte para estándares ES6+.

## Instalación y Configuración
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Phyton06/gestion-turnos-frontend.git
   cd gestion-turnos-frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   # o
   bun install
   ```
3. Configuración de API:
   Configurar la variable de entorno `VITE_API_BASE_URL` apuntando a la instancia de producción en Render o a la dirección local.
4. Iniciar la aplicación:
   ```bash
   npm run dev
   # o
   bun run dev
   ```

## Uso
La aplicación se encuentra desplegada y disponible para su uso en producción. El acceso a los distintos módulos depende estrictamente del rol asignado al usuario durante el inicio de sesión. La aplicación gestiona automáticamente la limpieza de estados locales tras la expiración de la sesión.

## Contacto
- Desarrollador: Luis Angel Cardona Becerra
- Rol: Software Engineer Jr
- GitHub: [Phyton06](https://github.com/Phyton06)
- LinkedIn: [https://www.linkedin.com/in/luis-angel-cardona-becerra-5b5b1718b/](https://www.linkedin.com/in/luis-angel-cardona-becerra-5b5b1718b/)
