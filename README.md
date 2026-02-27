# Frontend UI - Sistema de Gestión de Turnos Clínicos

Esta es la aplicación **Frontend (Interfaz de Cliente)** de nuestro ecosistema integral de turnos médicos en línea. Es un portal reactivo y dinámico diseñado con arquitectura modular moderna (`React` + `Vite`) y renderizado por estricta autenticación de Roles.

## Características Base

*   **Portal Administrativo (`Admin Dashboard`):** Control integral de usuarios (Doctores, Pacientes). Funciones de búsqueda completa, filtros por especialidad y fechas, y CRUD integrado para registrar o activar/desactivar credenciales de forma blanda (Soft Delete).
*   **Portal de Médicos (`Doctor Dashboard`):** Agenda de citas asignadas para el día, visualización de fichas tabulares de pacientes con opción de realizar acciones para completar consultas médicas ('Completado' o 'No show').
*   **Portal de Pacientes:** Flujo asíncrono dinámico para selección de especialidades, Doctores, visualización en Grid de horas disponibles, y agendamiento inteligente. Integración estética premium.
*   **Rieles de Seguridad Extrema (AuthGuards):** Sistema impenetrable en cliente que expulsa a los intrusos evaluando los interceptores globalizados (`JWT` local); apoyado además por ofuscación en memoria interna (`MemoryRouter` de React) para mantener tu navegación en incognito ante intentos de secuestro (URLs internas ocultas).

## Tecnologías Utilizadas

*   **Núcleo:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) (Rendimiento ultra ligero)
*   **Estilos y Componentes:** [Tailwind CSS v4](https://tailwindcss.com/) (diseñado artesanalmente con variantes de modo oscuro, UI premium de colores `indigo` y fuentes).
*   **Conexiones HTTP:** Integración de [Axios](https://axios-http.com/) global con cabeceras blindadas `Bearer Auth` automáticas.
*   **Gestión de Estados e Iconos:** Manejos limpios en React Context con apoyo cosmético de paquetes livianos (`Lucide React` y `SweetAlert2` para modales).

## ⚙️ Requisitos Previos

Necesitarás el siguiente entorno pre-instalado en tu computadora o Docker personal antes de ejecutar el panel por primera vez:

1.  [**Node.js LTS**](https://nodejs.org/) (incluyendo NPM o PNPM): Exclusivamente necesario para manejar, instalar dependencias frontend, y levantar la aplicación SPA localmente.
2.  **API Backend Local En Ejecución:** Esta arquitectura Front *debe consumir datos lógicos del back* que tú tienes hospedado en base local PostgreSQL. 
    > **IMPORTANTE:** Descarga o activa paralelamente el proyecto backend alojado en `gschz/gestion-turnos-api-rest.git` en Localhost o Nube antes de continuar.

## Instalación y Rendimiento Local

1. **Clona tu repositorio Frontend**
   ```bash
   git clone https://github.com/Phyton06/gestion-turnos-frontend.git
   cd gestion-turnos-frontend
   ```

2. **Instala las dependencias UI de React**
   ```bash
   npm install
   ```

3. **Inicia el servidor SPA en Desarrollo**
   ```bash
   npm run dev
   ```
   *La app se autolevanta por lo general en `http://localhost:5173/` y conectará automáticamente a la capa de servicios de Bun API.*

   **(Opcional) Cambio de Ruta en variables de entorno:**
   Crea y define un archivo `.env` en la estructura raíz en caso de trasladar el Backend hacia algún servidor Nube/Producción:
   ```env
   # Enrutado Principal
   VITE_API_URL=https://tu-api_backend_despliegue.com/api/v1
   ```

## Usuarios para Pruebas Internas

La base de datos original tiene semillas de inicio (Seeds) que permitirán a cualquier persona evaluar activamente el control de roles: 

*   **Administrador (`Rol 3`):** `admin@test.com` | Clave interna: `123456`
*   **Médico Profesional (`Rol 1`):** `medico@test.com` | Clave interna: `123456`
*   **Paciente (`Rol 2`):** `paciente@test.com` | Clave interna: `123456`

---
*Diseño y creación optimizada de extremo a extremo para su exhibición directa en portafolio de profesional de desarrollo.*
