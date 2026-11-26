# ✨ SkyProject

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Offline First](https://img.shields.io/badge/Architecture-Offline--First-10B981?style=for-the-badge)](#arquitectura-y-decisiones-técnicas)

Aplicación web **offline-first** (`v1.0.0`) de astronomía observacional para planificar salidas nocturnas y explorar la bóveda celeste en tiempo real. Calcula efemérides planetarias, posiciones estelares, objetos del catálogo Messier, próximos eventos astronómicos y previsión meteorológica por capas de nubosidad para cualquier ubicación y fecha.

---

## 🚀 Funcionalidades principales

- **Navbar responsive y navegación unificada (`Navbar`):** barra superior adaptable con acceso directo al Observatorio, Guía de uso, Brújula 3D, selector rápido de ubicación/GPS y cambio de tema visual.
- **Mapa celeste interactivo (`<canvas>`) con doble vista y control por teclado:**
  - **2D Planisferio:** proyección polar del cielo con rejilla de altitud (30° y 60°), puntos cardinales e inspección de astros por puntero o toque.
  - **3D Bóveda:** proyección hemisférica interactiva con rotación libre mediante arrastre (ratón/táctil) y teclado (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `R`/`Home`).
  - Renderizado de **33 estrellas brillantes** con colores espectrales, líneas de constelaciones (Orión, Osa Mayor, Casiopea), **12 objetos Messier**, Luna y planetas (incluidos los anillos de Saturno), además de trayectorias ±6h y retícula de selección.
- **Buscador global de astros con autoenfoque 3D:** búsqueda instantánea por nombre, constelación o código Messier con navegación por teclado (`combobox`/`listbox`), activación automática de la capa Messier y centrado suave en la bóveda 3D.
- **Reproductor Time-Lapse y control temporal:** atajos rápidos (`Ahora`, `Esta noche 23:30`, `+1h`), selector manual y simulación animada del movimiento celeste a `+15 min/s` o `+1 h/s`.
- **Brújula Astronómica 3D (`Compass3DModal`):** herramienta de apuntado celeste en tiempo real con soporte para sensores reales del dispositivo (`DeviceOrientationEvent`) y modo simulación interactivo para escritorio o pruebas en interior.
- **Guía del Observatorio (`AstronomyGuide`):** documentación integrada paso a paso con diagramas SVG interactivos sobre coordenadas horizontales (altitud y acimut), fases crepusculares y planificación de sesiones.
- **Motor astronómico local (`astronomy-engine`):**
  - Altitud, acimut, orientación cardinal, magnitud aparente, visibilidad sobre el horizonte y efemérides de tránsito (salida, culminación y puesta).
  - Precesión de coordenadas desde época **J2000** a la fecha exacta de observación.
  - Cálculo del estado solar y fase del crepúsculo (*Día*, *Civil*, *Náutico*, *Astronómico* y *Noche astronómica*).
- **Esfera lunar dinámica (`MoonPhase3D`):** representación SVG vectorial de la fase lunar real a partir del ángulo de fase, con sombreado de limbo y mares lunares adaptados al tema activo.
- **Meteorología astronómica y Ventana Óptima de 12 h (Open-Meteo API):**
  - Consulta sincronizada en **UTC** hasta 14 días vista con desglose de nubosidad baja (< 3 km), media (3–8 km) y alta (> 8 km), viento, humedad, temperatura y veredicto automático (*Excelente*, *Aceptable* o *Desfavorable*).
  - **Ventana de las próximas 12 h:** barra interactiva de claridad hora a hora con indicador día/noche y salto directo al cielo de esa franja en un clic.
  - Caché en `localStorage` (TTL de 1 hora) con *fallback* automático sin conexión.
- **Calendario de próximos eventos celestes:** próximas lluvias de estrellas (THZ y radiante) y eclipses lunares y solares calculados para las coordenadas del observador, con salto directo en un clic al mapa en la fecha del pico.
- **Gestor de observatorios favoritos y GPS:** geolocalización del dispositivo con mensajes de error específicos, edición manual validada y guardado persistente de hasta 8 ubicaciones favoritas en `localStorage`.
- **Tres temas visuales, accesibilidad WCAG 2.1 AA y soporte móvil (Capacitor):** `Oscuro`, `Claro` y **Filtro Rojo** para preservar la adaptación ocular nocturna, respeto a `prefers-reduced-motion`, áreas seguras (`safe-area-inset`) y sincronización dinámica de `<meta name="theme-color">`.

---

## 📸 Capturas recomendadas

> Sustituye las rutas siguientes por tus capturas reales dentro de `docs/screenshots/` (recomendado: ancho de `1280px` en formato `.webp` o `.png`).

| Vista | Descripción recomendada para la captura |
| :--- | :--- |
| ![Vista principal en modo oscuro](docs/screenshots/vista-principal-oscuro.png) | **Vista principal (Tema Oscuro):** mapa celeste en 2D/3D, panel meteorológico con ventana de 12 h y tarjetas del Sistema Solar con la esfera lunar `MoonPhase3D`. |
| ![Bóveda 3D interactiva](docs/screenshots/boveda-3d.png) | **Modo 3D Bóveda:** cúpula rotada mostrando constelaciones, objetos Messier, trayectoria ±6h y barra de inspección fija. |
| ![Modo Filtro Rojo](docs/screenshots/filtro-rojo-nocturno.png) | **Tema Filtro Rojo:** interfaz completa en modo de visión nocturna junto a la Brújula 3D y el panel de próximos eventos celestes. |

---

## 🛠️ Stack tecnológico

| Categoría | Tecnología | Uso en el proyecto |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript (modo estricto) | UI reactiva y tipado exhaustivo sin `any` |
| **Build & Estilos** | Vite 8 + Tailwind CSS v4 | Bundling ultrarrápido y diseño *responsive* |
| **Astronomía** | `astronomy-engine` | Efemérides, precesión J2000 y eclipses 100% en local |
| **Meteorología** | Open-Meteo API | Previsión horaria en UTC con caché en `localStorage` |
| **Iconografía** | `lucide-react` | Iconos vectoriales ligeros |
| **Testing** | Vitest | Tests unitarios del motor astronómico, eventos y caché meteo |
| **Móvil (preparado)** | Capacitor 8 | Empaquetado nativo futuro (Android / iOS) |
| **Calidad de código** | ESLint 10 + `typescript-eslint` | Reglas de React Hooks y análisis estático |

---

## 📜 Scripts disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local con Vite |
| `npm run build` | Comprueba tipos con TypeScript (`tsc -b`) y genera el bundle de producción |
| `npm run preview` | Previsualiza localmente el build de producción |
| `npm run lint` | Ejecuta ESLint sobre todo el proyecto |
| `npm test` | Ejecuta la batería de tests unitarios con Vitest (`vitest run`) |

---

## 🏗️ Arquitectura y decisiones técnicas

```text
sky_project/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx                # Barra de navegación responsive, GPS, tema y acceso a Brújula 3D
│   │   ├── SkyMap.tsx                # Canvas interactivo 2D Planisferio y 3D Bóveda (Pointer + Teclado)
│   │   ├── Compass3DModal.tsx        # Brújula Astronómica 3D con DeviceOrientationEvent y modo simulación
│   │   ├── AstronomyGuide.tsx        # Guía del Observatorio con diagramas SVG interactivos
│   │   ├── MoonPhase3D.tsx           # Esfera lunar SVG basada en el ángulo de fase real
│   │   ├── StarfieldBackground.tsx   # Fondo estelar en canvas con soporte prefers-reduced-motion
│   │   ├── WeatherPanel.tsx          # Panel meteorológico, nubosidad por capas y Ventana Óptima de 12 h
│   │   └── EventsPanel.tsx           # Próximas lluvias de estrellas y eclipses locales
│   ├── core/
│   │   ├── __tests__/
│   │   │   └── astronomy.test.ts     # Batería de tests unitarios con Vitest
│   │   ├── skyCalculator.ts          # Cálculos astronómicos, precesión J2000, tránsitos y validación
│   │   ├── eventsCalculator.ts       # Búsqueda de eclipses visibles y cálculo de lluvias anuales
│   │   └── weatherService.ts         # Cliente Open-Meteo en UTC, caché local y fallback offline
│   ├── data/
│   │   ├── brightStars.ts            # Catálogo de 33 estrellas brillantes y trazos de constelaciones
│   │   ├── messierCatalog.ts         # Catálogo de 12 objetos de cielo profundo (nebulosas, cúmulos, galaxias)
│   │   └── meteorShowers.ts          # Calendario de 9 lluvias de estrellas anuales
│   ├── types/
│   │   └── astronomy.ts              # Contratos e interfaces TypeScript centralizadas
│   ├── App.tsx                       # Estado principal, buscador, Time-Lapse, favoritos, GPS y temas
│   └── main.tsx                      # Punto de entrada de React
├── capacitor.config.ts               # Configuración base de Capacitor para empaquetado móvil
├── GEMINI.md                         # Reglas de arquitectura y estándares del proyecto
└── AGENTS.md                         # Guía de convenciones, verificación y commits
```
