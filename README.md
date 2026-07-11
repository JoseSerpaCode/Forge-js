# Forge JS - Enterprise Multi-Tenant OS

**Forge JS** es un sistema operativo de trabajo colaborativo multi-inquilino (multi-tenant), diseñado con un frontend Vanilla JS superrápido sobre Astro y un backend optimizado en NodeJS con SQLite.

![Version](https://img.shields.io/github/package-json/v/JoseSerpaCode/Forge-js?color=blue&label=version)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

![Orion's Forge Screenshot](./public/screenshot.png)

## 🚀 Características Principales

- **Gestión Multi-Tenant:** Aislamiento total por "Workspaces" con guardias de acceso robustos (RBAC).
- **Tablero Kanban (Sprints & Issues):** Sistema de tickets interactivo estilo Jira con soporte para bugs, historias, tareas y épicas.
- **Base de Conocimientos (Knowledge Base):** Editor de documentos estilo Notion con organización jerárquica de páginas.
- **Bases de Datos Dinámicas:** Creación de tablas personalizadas estilo Airtable con múltiples tipos de datos.
- **Sistema de Notificaciones:** Centro de notificaciones en tiempo real en la UI.
- **Soporte Multi-Idioma (i18n):** Traducción automática y completa de la UI (Inglés/Español) basada en las preferencias del navegador.
- **Seguridad Empresarial:** Prevención estricta contra SQLi, XSS, SSRF y Path Traversal en subida de archivos (10MB max, whitelist MIME).

## 🛠 Stack Técnico

Astro (Frontend) + Vanilla JS / CSS nativo + NodeJS / Express (Backend) + better-sqlite3

## 📦 Instalación Local

1. **Clonar el repositorio y entrar:**
   ```bash
   git clone https://github.com/JoseSerpaCode/Forge-js.git
   cd Forge-js
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Poblar la base de datos (Opcional):**
   ```bash
   npm run seed
   ```

4. **Levantar el entorno de desarrollo:**
   ```bash
   npm run dev
   ```
   *La aplicación estará disponible en `http://localhost:4321`.*

## 🤝 Contribuyendo

¡Las contribuciones son bienvenidas! Si deseas ayudar a mejorar Forge JS, por favor revisa nuestra guía en [CONTRIBUTING.md](./CONTRIBUTING.md) para conocer los estándares de código, la convención de ramas y los requisitos para Pull Requests.

## 📄 Licencia

MIT License — ver el archivo [LICENSE](./LICENSE) para más detalles.
