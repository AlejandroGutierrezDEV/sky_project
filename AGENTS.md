# Instrucciones para Agentes Autónomos — SkyProject

Este archivo define las reglas obligatorias de trabajo, arquitectura y autoría Git para cualquier agente de IA que opere sobre el repositorio `sky_project`. Antes de planificar o editar código, lee también `GEMINI.md`.

## 1. Autoría y Convenciones de Git (Obligatorio)

Todos los commits realizados en este repositorio deben quedar firmados exclusivamente a nombre del autor humano del proyecto, sin menciones a bots ni coautorías automáticas:

1. Antes de realizar cualquier commit, configura la identidad local de Git:
   ```bash
   git config user.name "Alejandro Gutierrez"
   git config user.email "gutierrezvillalba.dev@gmail.com"
   ```
2. **Prohibido** añadir líneas `Co-authored-by:`, firmas de agentes o referencias a herramientas de IA en los mensajes de commit o en el código.
3. Usa mensajes en **español** siguiendo *Conventional Commits*:
   - `feat: ...` para nuevas funcionalidades integradas.
   - `fix: ...` para corrección de errores o cálculos.
   - `refactor: ...` para consolidación de arquitectura y limpieza de deuda técnica.
   - `docs: ...` / `test: ...` / `chore: ...` para documentación, pruebas o mantenimiento.
4. Redacta el título y la descripción de cualquier Pull Request en **español**, resumiendo archivos tocados y resultados de verificación.

## 2. Entorno y Verificación Obligatoria

- **Gestor y scripts (`package.json`):**
  - Instalación: `npm install`
  - Linter: `npm run lint`
  - Comprobación de tipos: `npx tsc --noEmit`
  - Tests unitarios: `npm test`
  - Build de producción: `npm run build`
- **Criterio de aceptación:** Ninguna tarea se considera terminada si alguno de los 4 comandos anteriores (`lint`, `tsc`, `test`, `build`) falla o introduce advertencias nuevas. **Prohibido** usar `eslint-disable` o `@ts-ignore` para ocultar errores.

## 3. Contrato de Arquitectura y Única Fuente de Verdad (SSOT)

SkyProject es una aplicación astronómica *offline-first* (React 19, TypeScript estricto, Vite, Tailwind CSS v4, `astronomy-engine` y Capacitor). **Está prohibido crear módulos aislados o duplicar infraestructura existente:**

- **Tipos de dominio:** Centralizados en `src/types/astronomy.ts` (y contratos específicos en `src/types/`). Prohibido usar `any`.
- **Catálogos astronómicos únicos:** Reutiliza `src/data/estrellasMag4.ts`, `src/data/messier110.ts`, `src/data/constelacionesIAU.ts` y `src/data/meteorShowers.ts`. No crees catálogos paralelos.
- **Motor astronómico único:** Todo cálculo de posición, precesión J2000, tránsitos, fases lunares y eclipses debe pasar por `astronomy-engine` desde `src/core/skyCalculator.ts`, `src/core/eventsCalculator.ts` y `src/utils/lunarCalculations.ts`.
- **Servicio meteorológico único:** Centraliza las consultas a Open-Meteo y la caché LRU en `src/core/weatherService.ts`. No crees clientes HTTP duplicados.
- **Ubicación y zonas horarias (IANA):** Usa siempre el estado de ubicación global (`useLocation` / `coordinates.timezone`). Formatea todas las horas con `formatearHoraEnZona(..., timezone)`. Prohibido usar `new Date().getHours()` o `toLocaleTimeString()` sin zona horaria explícita.
- **Rendimiento en *Time-Lapse*:** Los cálculos que dependen del día civil (eclipses, tránsitos, culminaciones del planificador, efemérides diarias) deben memoizarse por clave de día civil (`YYYY-MM-DD` en la zona IANA), nunca por el timestamp por segundo del reloj.

## 4. Estándares de Código, UI, Seguridad y Accesibilidad

- **Idioma:** Todo el código nuevo (nombres de componentes, hooks, funciones, variables, tipos, comentarios y textos de UI) debe escribirse en **español**.
- **Fronteras externas:** Protege toda lectura/escritura de `localStorage` y respuesta HTTP con `try/catch` y *type guards* estrictos, acotando longitudes de strings y rangos numéricos.
- **Cero diálogos nativos:** Prohibido usar `window.alert()`, `window.confirm()` o `window.prompt()`. Muestra avisos y confirmaciones inline en la interfaz.
- **Tres temas visuales (`oscuro`, `claro`, `rojo`):**
  - Todo componente nuevo debe adaptarse a los tres temas.
  - En modo **Filtro Rojo** (`tema === 'rojo'`), queda estrictamente prohibido renderizar píxeles blancos, azules, cian, verdes o amarillos (incluidos SVG, `<canvas>`, bordes y `focus-visible`); solo espectro rojo sobre negro puro.
- **Accesibilidad y móvil:**
  - Respeta `prefers-reduced-motion: reduce`.
  - Mantén áreas táctiles mínimas de `44×44 px` (`min-h-11`) en pantallas móviles y usa `useId()` para vincular `label` / `aria-labelledby` en componentes reutilizables.
  - Limpia siempre `requestAnimationFrame`, `setInterval`, `AbortController` y listeners de sensores al desmontar componentes.

## 5. Alcance de Modificaciones

- Modifica únicamente los archivos necesarios para la tarea solicitada.
- Si eliminas o consolidas un módulo antiguo, actualiza todas sus importaciones y tests asociados para no dejar código muerto en `src/`.