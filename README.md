# SkyProject

Aplicación web *offline-first* de astronomía observacional que permite consultar la bóveda celeste en tiempo real, efemérides planetarias, próximos eventos astronómicos y condiciones meteorológicas para cualquier ubicación y fecha.

## Funcionalidades principales

- **Mapa celeste interactivo (`<canvas>`):** proyección polar del cielo con estrellas brillantes, líneas de constelaciones, catálogo Messier, Luna y planetas del Sistema Solar, con precesión desde época J2000 a la fecha de observación y soporte para ratón y pantalla táctil.
- **Efemérides y estado solar:** cálculo local con `astronomy-engine` de altitud, acimut, magnitud, fase lunar, iluminación y fase del crepúsculo (día, civil, náutico, astronómico o noche astronómica).
- **Próximos eventos celestes:** calendario dinámico de lluvias de estrellas y próximos eclipses lunares (con comprobación de visibilidad local) y solares.
- **Condiciones meteorológicas astronómicas:** integración con la API de Open-Meteo sincronizada en UTC (nubosidad por capas, viento, humedad, temperatura y veredicto de observación) con caché local en `localStorage` para uso sin conexión.
- **Tres temas visuales:** `Oscuro`, `Claro` y `Filtro Rojo` diseñado para preservar la adaptación ocular nocturna en el campo.
- **Geolocalización y ubicaciones personalizadas:** detección mediante GPS del navegador o edición manual de latitud, longitud y altitud con validación defensiva.

## Stack tecnológico

- **Frontend:** React 19 + TypeScript (modo estricto) + Vite 8 + Tailwind CSS v4
- **Cálculo astronómico:** `astronomy-engine` (100% local y *offline-first*)
- **Meteorología:** Open-Meteo API + caché en `localStorage`
- **Iconografía:** `lucide-react`
- **Preparado para móvil:** Capacitor (`@capacitor/core`, `@capacitor/cli`)

## Instalación y puesta en marcha

Requisitos: Node.js 20 o superior y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Arrancar servidor de desarrollo
npm run dev
```

## Scripts disponibles

- `npm run dev` — Inicia el servidor de desarrollo con Vite.
- `npm run lint` — Ejecuta ESLint sobre todo el proyecto.
- `npm run build` — Comprueba tipos con TypeScript (`tsc -b`) y genera el build de producción en `dist/`.
- `npm run preview` — Previsualiza localmente el build de producción.

## Estructura del proyecto

```text
src/
├── components/   # SkyMap, WeatherPanel, EventsPanel
├── core/         # skyCalculator, eventsCalculator, weatherService
├── data/         # brightStars, messierCatalog, meteorShowers
└── types/        # Interfaces y tipos centralizados (astronomy.ts)
```
