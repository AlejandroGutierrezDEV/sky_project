# ✨ SkyProject

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Offline First](https://img.shields.io/badge/Architecture-Offline--First-10B981?style=for-the-badge)](#arquitectura-y-decisiones-técnicas)

Aplicación web **offline-first** de astronomía observacional para planificar salidas nocturnas y explorar la bóveda celeste en tiempo real. Calcula efemérides planetarias, posiciones estelares, objetos del catálogo Messier, próximos eventos astronómicos y previsión meteorológica por capas de nubosidad para cualquier ubicación y fecha.

---

## 🚀 Funcionalidades principales

- **Mapa celeste interactivo (`<canvas>`) con doble vista:**
  - **2D Planisferio:** proyección polar del cielo con rejilla de altitud (30° y 60°), puntos cardinales e inspección de astros por puntero o toque.
  - **3D Bóveda:** proyección hemisférica interactiva con rotación libre mediante arrastre (ratón y pantalla táctil).
  - Renderizado de **33 estrellas brillantes** con colores espectrales, líneas de constelaciones (Orión, Osa Mayor, Casiopea), **12 objetos Messier**, Luna y planetas (incluidos los anillos de Saturno).
- **Motor astronómico local (`astronomy-engine`):**
  - Altitud, acimut, orientación cardinal, magnitud aparente y visibilidad sobre el horizonte.
  - Precesión de coordenadas desde época **J2000** a la fecha exacta de observación.
  - Cálculo del estado solar y fase del crepúsculo (*Día*, *Civil*, *Náutico*, *Astronómico* y *Noche astronómica*).
- **Esfera lunar dinámica (`MoonPhase3D`):** representación SVG vectorial de la fase lunar real a partir del ángulo de fase, con sombreado de limbo y mares lunares adaptados al tema activo.
- **Meteorología astronómica (Open-Meteo API):**
  - Consulta sincronizada en **UTC** hasta 14 días vista con desglose de nubosidad baja (< 3 km), media (3–8 km) y alta (> 8 km), viento, humedad, temperatura y veredicto automático (*Excelente*, *Aceptable* o *Desfavorable*).
  - Caché en `localStorage` (TTL de 1 hora) con *fallback* automático sin conexión.
- **Calendario de próximos eventos celestes:** próximas lluvias de estrellas (THZ y radiante) y eclipses lunares y solares calculados para las coordenadas del observador, con salto directo en un clic al mapa en la fecha del pico.
- **Tres temas visuales y modo campo:** `Oscuro`, `Claro` y **Filtro Rojo** para preservar la adaptación ocular nocturna, acompañados de un fondo estelar animado que respeta `prefers-reduced-motion`.
- **Ubicación flexible:** geolocalización GPS del navegador o edición manual de latitud, longitud y altitud con validación defensiva y persistencia local.

---

## 📸 Capturas recomendadas

> Sustituye las rutas siguientes por tus capturas reales dentro de `docs/screenshots/` (recomendado: ancho de `1280px` en formato `.webp` o `.png`).

| Vista | Descripción recomendada para la captura |
| :--- | :--- |
| ![Vista principal en modo oscuro](docs/screenshots/vista-principal-oscuro.png) | **Vista principal (Tema Oscuro):** mapa celeste en 2D/3D, panel meteorológico y tarjetas del Sistema Solar con la esfera lunar `MoonPhase3D`. |
| ![Bóveda 3D interactiva](docs/screenshots/boveda-3d.png) | **Modo 3D Bóveda:** cúpula rotada mostrando constelaciones, objetos Messier y el *tooltip* de inspección de un planeta o estrella. |
| ![Modo Filtro Rojo](docs/screenshots/filtro-rojo-nocturno.png) | **Tema Filtro Rojo:** interfaz completa en modo de visión nocturna junto al panel de próximos eventos celestes. |

---

## 🛠️ Stack tecnológico

| Categoría | Tecnología | Uso en el proyecto |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript (modo estricto) | UI reactiva y tipado exhaustivo sin `any` |
| **Build & Estilos** | Vite 8 + Tailwind CSS v4 | Bundling ultrarrápido y diseño *responsive* |
| **Astronomía** | `astronomy-engine` | Efemérides, precesión J2000 y eclipses 100% en local |
| **Meteorología** | Open-Meteo API | Previsión horaria en UTC con caché en `localStorage` |
| **Iconografía** | `lucide-react` | Iconos vectoriales ligeros |
| **Móvil (preparado)** | Capacitor 8 | Empaquetado nativo futuro (Android / iOS) |
| **Calidad de código** | ESLint 10 + `typescript-eslint` | Reglas de React Hooks y análisis estático |

---

## 🏗️ Arquitectura y decisiones técnicas

```text
src/
├── components/
│   ├── SkyMap.tsx                # Canvas interactivo 2D Planisferio y 3D Bóveda (Pointer Events)
│   ├── MoonPhase3D.tsx           # Esfera lunar SVG basada en el ángulo de fase real
│   ├── StarfieldBackground.tsx   # Fondo estelar en canvas con soporte prefers-reduced-motion
│   ├── WeatherPanel.tsx          # Panel meteorológico y desglose de nubosidad por capas
│   └── EventsPanel.tsx           # Próximas lluvias de estrellas y eclipses locales
├── core/
│   ├── skyCalculator.ts          # Cálculos astronómicos, precesión J2000 y validación de entrada
│   ├── eventsCalculator.ts       # Búsqueda de eclipses visibles y cálculo de lluvias anuales
│   └── weatherService.ts         # Cliente Open-Meteo en UTC, caché local y fallback offline
├── data/
│   ├── brightStars.ts            # Catálogo de 33 estrellas brillantes y trazos de constelaciones
│   ├── messierCatalog.ts         # Catálogo de 12 objetos de cielo profundo (nebulosas, cúmulos, galaxias)
│   └── meteorShowers.ts          # Calendario de 9 lluvias de estrellas anuales
├── types/
│   └── astronomy.ts              # Contratos e interfaces TypeScript centralizadas
├── App.tsx                       # Estado principal, temas, GPS y control temporal
└── main.tsx                      # Punto de entrada de React