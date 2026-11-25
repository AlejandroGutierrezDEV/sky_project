# Reglas del Proyecto - SkyProject

## Idioma y comunicación
- Responde siempre en **español** (explicaciones, comentarios en el código, mensajes de error e interfaz de usuario).
- Mantén respuestas directas, técnicas y orientadas a la acción.

## Stack y arquitectura
- **Frontend:** React, TypeScript (modo estricto), Vite y Tailwind CSS v4.
- **Motor astronómico:** `astronomy-engine` (cálculo local y *offline-first*).
- **Meteorología:** API de Open-Meteo con caché en `localStorage`.
- **Objetivo móvil:** Compatibilidad con diseño táctil y futuro empaquetado con Capacitor (Android).
- **Estructura principal:**
  - `src/types/`: Interfaces y tipos compartidos (`astronomy.ts`).
  - `src/core/`: Lógica de negocio y servicios (`skyCalculator.ts`, `eventsCalculator.ts`, `weatherService.ts`).
  - `src/data/`: Catálogos estáticos (`brightStars.ts`, `messierCatalog.ts`).
  - `src/components/`: Componentes visuales (`SkyMap.tsx`, `WeatherPanel.tsx`, `EventsPanel.tsx`).

## Estándares de código y robustez
- **TypeScript estricto:** Prohibido usar `any`. Tipar siempre props, estados y respuestas de APIs.
- **Validación defensiva:**
  - Envolver siempre `JSON.parse` / lecturas de `localStorage` en bloques `try/catch` con *fallback* seguro.
  - Sanitizar entradas de usuario antes de pasarlas a `astronomy-engine` (latitud en `[-90, 90]`, longitud en `[-180, 180]`, altitud finita y fechas válidas evitando `Invalid Date`).
- **Zonas horarias:** Usar **UTC** para sincronizar las consultas y búsquedas horarias de Open-Meteo.
- **React y ESLint:** Respetar todas las reglas de React Hooks (evitar `setState` síncrono dentro de `useEffect`).
- **UX y temas:**
  - Prohibido usar `window.alert()` o `confirm()`; mostrar errores de forma integrada en la UI.
  - Mantener compatibilidad con los tres temas visuales (`oscuro`, `claro` y `rojo` para visión nocturna).

## Ahorro de cuota y flujo de trabajo
- **Solo lectura cuando se pida análisis:** No ejecutes comandos en la terminal ni modifiques archivos si únicamente se solicita revisar, auditar o explicar código.
- **Cambios incrementales:** Evita reescribir archivos completos si solo cambian líneas concretas; entrega únicamente los bloques a modificar salvo que se pida explícitamente el archivo entero.
- **Sin dependencias innecesarias:** Prioriza soluciones nativas o librerías gratuitas ya instaladas en el proyecto.

## Reglas transversales obligatorias
- TypeScript en modo estricto (prohibido `any`).
- Compatibilidad total con los 3 temas (`oscuro`, `claro`, `rojo`) y `prefers-reduced-motion`.
- Prohibido usar `alert()`, `confirm()` o `prompt()`.
- Validar siempre `localStorage`, APIs y entradas de usuario con *type guards* y `try/catch`.
- Ejecutar `npm run lint` y `npm run build` al finalizar cada tarea.