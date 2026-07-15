<a name="readme-top"></a>

<div align="center">

[![Version][version-shield]][version-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![CI][ci-shield]][ci-url]

<a href="https://github.com/JoseSerpaCode/Forge-js" target="_blank" rel="noopener noreferrer">
  <img width="350px" src="./public/screenshot.png" alt="Forge OS Screenshot" style="border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);" />
</a>

<br/>
<br/>

## Forge OS • Enterprise Multi-Tenant Workspace

**Forge OS** es un sistema operativo de trabajo colaborativo multi-inquilino (*multi-tenant*), diseñado con un frontend Vanilla JS superrápido sobre Astro y un backend altamente optimizado en NodeJS con SQLite. Unifica Kanban, Bases de Datos dinámicas y Base de Conocimientos en una sola plataforma.

[Reportar bug](https://github.com/JoseSerpaCode/Forge-js/issues) · [Sugerir funcionalidad](https://github.com/JoseSerpaCode/Forge-js/issues) · [Ver Changelog](./CHANGELOG.md)

</div>

<details>
<summary><b>Tabla de contenidos</b></summary>

- [Forge OS • Enterprise Multi-Tenant Workspace](#forge-os--enterprise-multi-tenant-workspace)
- [Características principales](#características-principales)
- [Para empezar](#para-empezar)
  - [Prerequisitos](#prerequisitos)
  - [Instalación y Configuración](#instalación-y-configuración)
- [Stack Tecnológico](#stack-tecnológico)
- [Seguridad y Buenas Prácticas](#seguridad-y-buenas-prácticas)
- [Roadmap](#roadmap)
- [Contribuir al proyecto](#contribuir-al-proyecto)

</details>

<br/>

## Características principales

Forge OS no es solo un gestor de tareas, es un ecosistema de colaboración completo:

* **Aislamiento Multi-Tenant Total**: Espacios de trabajo (Workspaces) separados lógicamente, garantizando que un usuario no pueda acceder ni modificar datos de otros inquilinos (protección IDOR exhaustiva).
* **Tablero Kanban Avanzado**: Gestión de Sprints, Issues y Épicas. Incluye rediseño de flujos, drag & drop persistente, y control de tiempo (Time Tracking) server-side con auto-pausa.
* **Base de Conocimientos (Knowledge Base)**: Sistema de documentación estilo Notion, con enlaces bidireccionales, organización jerárquica y versionado automático.
* **Bases de Datos Dinámicas (Fase 1)**: Crea tablas dinámicas tipo Airtable directamente desde la interfaz, adaptando el software a tus necesidades de negocio.
* **Sistema de Notificaciones Global**: TTL de invitaciones y alertas en tiempo real a nivel de UI para interacciones importantes.
* **Localización Intuitiva (i18n)**: Soporte nativo para Inglés y Español (detectado automáticamente).

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Para empezar

### Prerequisitos

Te recomendamos encarecidamente utilizar **Node.js (v22+)** para una máxima compatibilidad y rendimiento.

* **NVM** (Recomendado para manejar la versión de Node):
  ```sh
  nvm install 22
  nvm use 22
  ```

* **NPM**:
  ```sh
  npm install npm@latest -g
  ```

### Instalación y Configuración

1. **Clona el repositorio**
   ```sh
   git clone https://github.com/JoseSerpaCode/Forge-js.git
   ```

2. **Accede al directorio del proyecto**
   ```sh
   cd Forge-js
   ```

3. **Instala las dependencias de NPM**
   ```sh
   npm install
   ```

4. **Puebla la base de datos (Opcional pero recomendado)**
   Este script inicializa `better-sqlite3` e inserta los usuarios y roles requeridos para el entorno de desarrollo.
   ```sh
   npm run seed
   ```

5. **Levanta el entorno en local**
   ```sh
   npm run dev
   ```
   > La aplicación estará disponible de inmediato en `http://localhost:4321`.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Stack Tecnológico

[![Astro][astro-badge]][astro-url] [![TypeScript][typescript-badge]][typescript-url] [![Node.js][node-badge]][node-url] [![SQLite][sqlite-badge]][sqlite-url] [![Playwright][playwright-badge]][playwright-url]

- **Frontend**: Astro + Vanilla JS + Vanilla CSS (Enfoque en alta velocidad, sin Virtual DOM y cero JavaScript innecesario para los clientes).
- **Backend**: Astro SSR (Node.js Adapter) actuando como servidor monolítico con Middlewares empresariales.
- **Base de datos**: SQLite utilizando `better-sqlite3` para I/O ultrarrápido y sincronización síncrona en memoria/disco.
- **Testing**: Playwright para pruebas End-to-End exhaustivas, Vitest para pruebas unitarias.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Seguridad y Buenas Prácticas

Forge OS cuenta con auditorías de seguridad incorporadas y Middlewares estrictos:
- **Protección RBAC**: Roles de acceso (Owner, Admin, Editor, Viewer).
- **Prevención de Ataques Web**: Protecciones activas contra SQLi, XSS, SSRF y Path Traversal en el manejo de adjuntos.
- **Validación Estricta**: Tamaños de archivo limitados (10MB max), comprobación de MIME types, e IDs ofuscados o sanitizados con UUIDv4.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Roadmap

Actualmente Forge OS está en un ciclo de desarrollo activo. Aquí está nuestra hoja de ruta principal:

- [x] **Módulo de Identidad y Workspaces**: Sistema de login y aislamiento multi-tenant.
- [x] **Base de Conocimientos (Notion-like)**: Sistema de documentos, parseo seguro Markdown y enlaces bidireccionales.
- [x] **Kanban & Sprints (Bloque 4)**: Tablero drag&drop, métricas avanzadas (Velocity, Distribution, Precision), control de tiempo (Time Tracking) preciso.
- [ ] **Bases de Datos Dinámicas (Fase 1)**: Creación de tablas dinámicas tipo Airtable para flexibilizar la gestión de datos.
- [ ] **Dashboard General**: Panel central para visualizar el resumen de todos los Workspaces y notificaciones globales.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Contribuir al proyecto

¡Forge OS está abierto a mejoras y extensiones! Las contribuciones son lo que hacen a la comunidad _open source_ un lugar increíble. Toda contribución será **muy apreciada**.

1. Haz un [_Fork_](https://github.com/JoseSerpaCode/Forge-js/fork) del proyecto
2. Crea tu rama para la nueva funcionalidad (`git checkout -b feature/CaracteristicaIncreible`)
3. Haz un commit detallado de tus cambios (`git commit -m 'feat(scope): Añadir CaracterísticaIncreible'`)
4. Haz push a tu rama (`git push origin feature/CaracteristicaIncreible`)
5. Abre un [_Pull Request_](https://github.com/JoseSerpaCode/Forge-js/pulls)

> **Importante:** Por favor, asegúrate de revisar nuestras [Normas de Contribución](./CONTRIBUTING.md) antes de enviar código. Todos los Pull Requests deben venir acompañados de tests de Playwright para validar flujos críticos.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[version-shield]: https://img.shields.io/github/package-json/v/JoseSerpaCode/Forge-js?style=for-the-badge&color=2563eb
[version-url]: https://github.com/JoseSerpaCode/Forge-js
[forks-shield]: https://img.shields.io/github/forks/JoseSerpaCode/Forge-js.svg?style=for-the-badge
[forks-url]: https://github.com/JoseSerpaCode/Forge-js/network/members
[stars-shield]: https://img.shields.io/github/stars/JoseSerpaCode/Forge-js.svg?style=for-the-badge
[stars-url]: https://github.com/JoseSerpaCode/Forge-js/stargazers
[issues-shield]: https://img.shields.io/github/issues/JoseSerpaCode/Forge-js.svg?style=for-the-badge
[issues-url]: https://github.com/JoseSerpaCode/Forge-js/issues
[license-shield]: https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge
[license-url]: ./LICENSE
[ci-shield]: https://img.shields.io/github/actions/workflow/status/JoseSerpaCode/Forge-js/ci.yml?style=for-the-badge&label=CI
[ci-url]: https://github.com/JoseSerpaCode/Forge-js/actions/workflows/ci.yml

[astro-badge]: https://img.shields.io/badge/Astro-fff?style=for-the-badge&logo=astro&logoColor=bd303a&color=352563
[astro-url]: https://astro.build/
[typescript-badge]: https://img.shields.io/badge/Typescript-007ACC?style=for-the-badge&logo=typescript&logoColor=white&color=blue
[typescript-url]: https://www.typescriptlang.org/
[node-badge]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[node-url]: https://nodejs.org/
[sqlite-badge]: https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white
[sqlite-url]: https://sqlite.org/
[playwright-badge]: https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white
[playwright-url]: https://playwright.dev/
