# Contrato de Arquitectura y Gobernanza — SkyProject

Este archivo define las reglas obligatorias de arquitectura, calidad de código y flujo de trabajo para `sky_project`. Léelo completo antes de planificar o modificar cualquier archivo.

---

## 1. Stack Tecnológico y Entorno
- **Stack:** React 19, TypeScript (`strict: true`), Vite, Tailwind CSS v4, `astronomy-engine`, `lucide-react`, `vite-plugin-pwa`, Vitest y Capacitor (`com.skyproject.app`).
- **Enfoque:** Aplicación astronómica *offline-first* preparada para web, PWA instalable (con iconos rasterizados en `public/icon-192.png` y `public/icon-512.png`) y empaquetado nativo en Android.

---

## 2. Reglas de Código, Idioma y Seguridad
- **Idioma español estricto:** Todo el código nuevo o refactorizado (nombres de componentes, hooks, servicios, funciones, variables, tipos, comentarios y textos de interfaz) debe escribirse en **español**.
- **TypeScript estricto:** Prohibido usar `any`, `@ts-ignore` o `eslint-disable`. Importa siempre tipos explícitos (`import type { ... }`).
- **Fronteras externas:** Valida toda lectura/escritura de `localStorage`, entradas de usuario y respuestas JSON de APIs mediante `try/catch` y *type guards* estrictos, acotando longitudes de cadenas, longitud de arrays y rangos numéricos.
- **Control de red y ciclo de vida:** Usa `AbortController` y *timeouts* en peticiones HTTP, y limpia siempre `requestAnimationFrame`, `setInterval` y listeners de sensores (`DeviceOrientationEvent`) al desmontar componentes.
- **Cero diálogos nativos:** Prohibido usar `window.alert()`, `window.confirm()` o `window.prompt()`. Muestra avisos y confirmaciones inline en la interfaz.

---

## 3. Temas Visuales, Accesibilidad y Móvil
- **Tres temas (`oscuro`, `claro`, `rojo`):** Todo componente nuevo debe adaptarse a los tres temas visuales.
- **Blindaje del Modo Filtro Rojo (`tema === 'rojo'`):** Queda estrictamente prohibido renderizar píxeles blancos (`#fff` / `#ffffff`), azules, cianes, verdes o amarillos (incluyendo `<canvas>`, SVG, sombras, bordes y estados `focus-visible`); usar exclusivamente espectro rojo sobre negro puro.
- **Accesibilidad (WCAG 2.1 AA) y campo nocturno:**
  - Respeta `prefers-reduced-motion: reduce` en animaciones y desplazamientos (`scrollIntoView`).
  - Usa `useId()` para vincular atributos `htmlFor`, `id` y `aria-labelledby` en widgets reutilizables, y *roving tabindex* en grupos de filtros (`radiogroup`).
  - Mantén áreas táctiles mínimas de `44×44 px` (`min-h-11`) en pantallas móviles.
  - Conserva las reglas `@media print` en `src/index.css` (`overflow: visible !important; height: auto !important;`) para que la exportación PDF del planificador pagine sin recortes.

---

## 4. Única Fuente de Verdad (SSOT — Prohibido Duplicar)
Antes de crear un archivo nuevo en `src/`, reutiliza obligatoriamente los módulos activos del proyecto. **Está prohibido crear silos aislados o infraestructura paralela:**

- **Tipos de dominio:** Centralizados en `src/types/astronomy.ts` (y contratos específicos en `src/types/`).
- **Catálogos astronómicos únicos (`src/data/`):**
  - `src/data/estrellasMag4.ts`: catálogo único de estrellas (saneado, sin duplicados ni magnitudes truncadas).
  - `src/data/messier110.ts`: catálogo completo de los 110 objetos Messier.
  - `src/data/constelacionesIAU.ts`: trazos de las 88 constelaciones IAU.
  - `src/data/meteorShowers.ts`: lluvias de estrellas anuales.
  - `src/data/celestialDetails.ts`: fichas técnicas con generación perezosa (*lazy*) bajo demanda mediante `obtenerFichaTecnica(id)` y proyección tangente 3D para asterismos polares (`UMI`, `OCT`). **Prohibido** ejecutar cálculos masivos en el nivel superior del módulo al importarlo.
  - *(Catálogos legacy eliminados — NO recrear: `brightStars.ts`, `messierCatalog.ts`, `starCatalog.ts`)*.
- **Motor astronómico único (`src/core/` y `src/utils/`):**
  - `src/core/skyCalculator.ts`, `src/core/eventsCalculator.ts`, `src/utils/lunarCalculations.ts` y `src/utils/astronomia/culminacion.ts`.
  - Todo cálculo de posición, precesión desde época J2000 a fecha, tránsitos (`ms >= inicioMs && ms < finMs`), fases lunares y eclipses debe pasar por `astronomy-engine`. Prohibido escribir fórmulas trigonométricas aproximadas paralelas.
- **Meteorología unificada (Open-Meteo):**
  - `src/core/weatherService.ts`: cliente único con petición combinada, validación estricta de arrays (`<= 400`), *timeout* y caché LRU *offline* compartida entre `WeatherPanel` y `WeatherAlertsPanel`. Prohibido crear clientes HTTP duplicados.
- **Mapas celestes y Brújula 3D:**
  - `src/components/SkyMap.tsx`: mapa celeste 2D/3D principal (con arrastre agrupado mediante `requestAnimationFrame` y recorte de segmentos al horizonte `alt = 0`).
  - `src/components/star-chart/StarChartTab.tsx` y `StarChartCanvas.tsx`: carta astronómica sincronizada con la ubicación y fecha globales del observatorio, consumiendo los catálogos únicos de `src/data/`.
  - `src/components/Compass3DModal.tsx`: brújula 3D única con compensación de declinación magnética (WMM2025), matriz sin *gimbal lock* y prioridad visual para `objetivoSeleccionado` aunque haya filtros de planetas activos *(legacy `CompassWidget.tsx` eliminado — NO recrear)*.
  - `src/components/MoonPhase3D.tsx`: fase lunar con soporte de orientación hemisférica (`latitud < 0` en Hemisferio Sur) y ángulo esférico $\arccos(1 - 2 \cdot \text{iluminacion})$.

---

## 5. Zonas Horarias IANA y Rendimiento en *Time-Lapse*
- **Zonas horarias IANA obligatorias:** Toda conversión, cálculo de culminación, exportación de sesión (`src/utils/exportarSesion.ts`) o formateo horario debe recibir explícitamente la zona horaria IANA del observatorio (`ubicacion.timezone` / `coordinates.timezone`). **Prohibido** usar `getHours()`, `setHours()` o `toLocaleTimeString()` sin zona explícita.
- **Separación de frecuencia de cálculo:** Los cálculos dependientes del día civil (eventos, tránsitos, culminaciones del planificador y destacados diarios) deben memoizarse mediante la clave de día civil (`YYYY-MM-DD` en la zona IANA del observatorio), nunca por el *timestamp* por segundo del reloj en modo *Time-Lapse*.

---

## 6. Flujo Git y Verificación Obligatoria
- **Regla 2 Construir : 1 Consolidar:** Trabaja con ramas cortas desde `main` (`feat/...`, `fix/...`). Tras mergear **2** ramas de funcionalidad (`feat/...`), abre obligatoriamente **1** rama de consolidación (`refactor/...` o `chore/...`) para auditar archivos muertos, vigilar el tamaño de `App.tsx` y verificar el rendimiento.
- **Autoría limpia:** Redacta mensajes de commit en español (*Conventional Commits*) sin añadir líneas `Co-authored-by:` ni referencias a herramientas de IA.
- **Verificación obligatoria antes de terminar cualquier tarea:**
  1. `npm run lint`
  2. `npx tsc --noEmit`
  3. `npm test`
  4. `npm run build`