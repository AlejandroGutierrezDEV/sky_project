Actúa como desarrollador senior de React, TypeScript, accesibilidad (WCAG 2.1 AA) y optimización móvil para Capacitor. Aplica en una sola pasada limpia todas las mejoras de producción detectadas en la auditoría técnica de `sky_project`, ordenadas por impacto.

### Reglas estrictas del proyecto (obligatorias)
- Todo el código, comentarios, etiquetas ARIA y textos de interfaz deben estar en **español**.
- **TypeScript en modo estricto:** prohibido usar `any`. Mantén las interfaces centralizadas en `src/types/astronomy.ts`.
- **Cero dependencias nuevas:** resuelve todo con APIs nativas de React, Canvas, DOM y Tailwind CSS v4.
- **Tres temas intactos (`oscuro`, `claro`, `rojo`):** en modo **Filtro Rojo** no puede aparecer ningún color azul, blanco, verde ni amarillo (incluidos anillos de foco `focus-visible` y mensajes de error).
- **Sin `eslint-disable`:** cumple todas las reglas de `eslint-plugin-react-hooks` y `typescript-eslint`.
- Prohibido usar `alert()`, `confirm()` o `prompt()`.

---

### Prioridad 1 — Rendimiento crítico de `<canvas>`, WebView y React

1. **Optimización de renderizado y *tap vs drag* en `src/components/SkyMap.tsx`:**
   - Acota el DPR a `const dpr = Math.min(window.devicePixelRatio || 1, 2);`.
   - Evita realocar el *backing store* del `<canvas>` en cada frame de arrastre 3D: solo actualiza `canvas.width` y `canvas.height` cuando difieran del tamaño objetivo (`size * dpr`), y en cada redibujado usa `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` + `ctx.clearRect(0, 0, size, size)`.
   - Sincroniza las actualizaciones de cámara durante el arrastre (`manejarPointerMove`) con `requestAnimationFrame` (acumulando deltas `dx`/`dy` en un ref y aplicando un único `setCamara` por frame, limpiando cualquier `rAF` pendiente en el unmount).
   - Corrige el bug de *tap vs drag* en modo `3d`: no llames a `inspeccionarPuntero(e)` dentro de `manejarPointerDown` cuando `modoVista === '3d'`. En su lugar, utiliza la bandera `arrastre.movido` (umbral de movimiento > 4 px) en `manejarPointerUp` para disparar la inspección únicamente cuando haya sido un toque/clic limpio sin arrastre.
   - Evita saltos de diseño (CLS) al mostrar/ocultar `hoverInfo`: reserva un contenedor de altura mínima estable (`min-h-11` o barra fija de estado del astro debajo del lienzo) con botón discreto para cerrar en móvil o mensaje guía cuando no haya astro seleccionado.
   - Aumenta la legibilidad de etiquetas en pantallas pequeñas (360px–430px): sube ligeramente las fuentes del canvas (`12px` para estrellas/Messier, `13px` para planetas/cardinales) para que sigan siendo legibles al escalar el lienzo.
   - Envuelve `SkyMap` en `React.memo`.

2. **Caché *offscreen*, pausa en segundo plano y `prefers-reduced-motion` dinámico en `src/components/StarfieldBackground.tsx`:**
   - Pre-renderiza el fondo estático de `oscuro` (gradiente del cielo + las 2 nebulosas radiales) en un `<canvas>` *offscreen* creado/actualizado solo dentro de `ajustarTamano()`, y en `dibujarOscuro()` dibújalo con un único `ctx.drawImage()` antes de pintar las estrellas y la estrella fugaz.
   - Añade un listener de `document.addEventListener('visibilitychange', ...)` que cancele `requestAnimationFrame` cuando `document.hidden === true` y reanude el bucle limpiamente (reseteando `ultimoTiempo`) al volver a primer plano.
   - Suscríbete a `mediaReduced.addEventListener('change', ...)` para detener o reanudar la animación si el usuario cambia la preferencia del sistema en caliente, limpiando ambos listeners y el `rAF` en el `return` del `useEffect`.
   - Agrupa el evento `resize` mediante `requestAnimationFrame` para evitar redibujados redundantes durante el scroll móvil.
   - Envuelve `StarfieldBackground` en `React.memo`.

3. **Evitar recálculos innecesarios y parpadeos en `src/App.tsx`:**
   - Separa las coordenadas numéricas (`latitud`, `longitud`, `altitud`) del `nombre` de la ubicación usando un objeto memoizado `coordenadasCalculo` dependiente solo de `[ubicacion.latitud, ubicacion.longitud, ubicacion.altitud]` (o pasa esas coordenadas estables a `calcularEstadoSolar`, `calcularCielo`, `calcularEstrellas`, `calcularMessier`, `calcularProximosEventos` y al `useEffect` de Open-Meteo). Así, escribir en «Nombre del lugar» no recalculará el cielo ni abortará peticiones meteorológicas.
   - Calcula `claveConsultaMeteo` usando la hora UTC (`YYYY-MM-DDTHH`) de `fechaSeleccionada` junto con `latitud.toFixed(2)` y `longitud.toFixed(2)` para que cambiar minutos dentro de la misma hora no dispare un falso estado de carga ni parpadee el panel meteorológico.
   - Envuelve el handler `onSeleccionarFecha` pasado a `EventsPanel` con `useCallback`.
   - Envuelve `WeatherPanel`, `EventsPanel` y `MoonPhase3D` en `React.memo`.

---

### Prioridad 2 — Adaptación Móvil (360px–430px) y Capacitor (`com.skyproject.app`)

1. **Viewport, Safe Areas y `theme-color` (`index.html`, `src/index.css`, `src/App.tsx`):**
   - En `index.html`, actualiza el viewport a `width=device-width, initial-scale=1.0, viewport-fit=cover` y añade `<meta name="theme-color" content="#020617" />`.
   - En `App.tsx`, sincroniza dinámicamente `<meta name="theme-color">` en un `useEffect` según `tema` (`#020617` en `oscuro`, `#dbeafe` en `claro`, `#000000` en `rojo`).
   - En `src/index.css`:
     - Encapsula `.tarjeta-3d:hover` dentro de `@media (hover: hover) and (pointer: fine)` para evitar estados `:hover` pegajosos en pantallas táctiles.
     - Añade utilidades o estilos base seguros para Capacitor: padding de áreas seguras (`pt-[max(1rem,env(safe-area-inset-top))]`, `pb-[max(1.5rem,env(safe-area-inset-bottom))]`, `pl-[max(1rem,env(safe-area-inset-left))]`, `pr-[max(1rem,env(safe-area-inset-right))]`) aplicadas en el contenedor principal de `App.tsx`, y `-webkit-tap-highlight-color: transparent` en elementos interactivos.

2. **Áreas táctiles mínimas ($\ge 44\text{px}$) y corrección de layout en 360px–430px:**
   - **`src/App.tsx`:**
     - En el botón de ubicación de la cabecera, añade `type="button"`, `text-left`, `min-h-11` y `break-words` para que no se centre ni se corte en 360 px.
     - Aumenta el área táctil de los botones de tema (`Oscuro`, `Claro`, `Filtro Rojo`), atajos de tiempo (`Ahora`, `Esta noche 23:30`, `+1h`) y botón GPS a mínimo `min-h-10 sm:min-h-9` (idealmente `min-h-11` en móvil) con `gap-2`.
     - Convierte los 3 controles de capas (`Constelaciones`, `Estrellas`, `Messier`) en etiquetas con borde/pill interactivas (`min-h-10 px-3 py-1.5 rounded-lg border`) fáciles de pulsar con el pulgar.
     - En los inputs numéricos del panel de ubicación, añade `inputMode="decimal"`, `min-h-11` y `text-base sm:text-sm`. En `<input type="datetime-local">`, aplica `w-full sm:w-auto min-h-11 text-base sm:text-sm`.
     - Diferencia el mensaje de `errorGPS` según `err.code` (`1` permiso denegado, `2` posición no disponible, `3` tiempo de espera agotado).
   - **`src/components/WeatherPanel.tsx`:**
     - Cambia la cuadrícula de los 4 indicadores principales de `grid-cols-4` a `grid-cols-2 sm:grid-cols-4` para que respire en 360 px sin truncar etiquetas ni valores.
   - **`src/components/SkyMap.tsx`:**
     - Aumenta los botones `2D Planisferio`, `3D Bóveda` y `Centrar` a `min-h-10 px-3 py-2` para uso cómodo en pantalla táctil.
   - **`src/components/EventsPanel.tsx`:**
     - Convierte el botón `"Ver en mapa"` en un botón táctil cómodo (`min-h-9 px-2.5 py-1.5 rounded-lg border border-current/20 hover:bg-current/10`).

---

### Prioridad 3 — Accesibilidad (WCAG 2.1 AA) y Navegación por Teclado

1. **Semántica de botones, formularios y estados (`src/App.tsx`):**
   - Añade `type="button"` a todos los botones que no envían formularios.
   - Añade `aria-controls="panel-ubicacion"` al botón de ubicación y `id="panel-ubicacion"` a su `<section>`.
   - Envuelve el selector de temas en un contenedor con `role="group" aria-label="Selector de tema visual"` y añade `aria-pressed={tema === ...}` a cada botón.
   - Añade `aria-label="Fecha y hora de observación"` al `<input type="datetime-local">`.
   - Vincula los errores de validación de latitud, longitud y altitud con `aria-invalid={Boolean(erroresUbicacion.xxx)}` y `aria-describedby` apuntando al `id` de cada `<span>` de error, aplicándoles estilo visible de error adaptado a los 3 temas.
   - Añade estilos claros de `focus-visible:outline-2 focus-visible:outline-offset-2` coherentes con cada tema (`sky` en oscuro/claro, `red-500` en rojo).
   - Añade `aria-hidden="true"` a todos los iconos decorativos de `lucide-react`.

2. **Teclado y lector de pantalla en `src/components/SkyMap.tsx`:**
   - Añade `role="group" aria-label="Modo de proyección del mapa"` y `aria-pressed` a los botones `2D Planisferio` y `3D Bóveda`.
   - Añade `tabIndex={0}` al `<canvas>` y manejador `onKeyDown` cuando `modoVista === '3d'`: `ArrowLeft`/`ArrowRight` rotan `rotAz` (±10°), `ArrowUp`/`ArrowDown` ajustan `tilt` (±5°), y `r`/`R`/`Home` restauran `CAMARA_INICIAL` (llamando `e.preventDefault()` en las flechas para no hacer scroll).
   - Envuelve la zona de `hoverInfo` en un contenedor con `aria-live="polite" aria-atomic="true"`.

3. **Semántica en `src/components/WeatherPanel.tsx` y `src/components/EventsPanel.tsx`:**
   - En `WeatherPanel.tsx`, añade `role="status" aria-live="polite"` a los mensajes de carga/aviso y añade `role="progressbar"`, `aria-label={capa.etiqueta}`, `aria-valuemin={0}`, `aria-valuemax={100}` y `aria-valuenow={capa.valor}` a las 3 barras de nubosidad.
   - En `EventsPanel.tsx`, añade `type="button"` y `aria-label={`Ver ${ev.titulo} en el mapa celeste`}` a cada botón `"Ver en mapa"`, y `aria-hidden="true"` a los iconos decorativos.

---

### Verificación final
Aplica todos los cambios directamente en el workspace y ejecuta en la terminal para confirmar que pasan con **0 errores**:
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Al finalizar, muéstrame un resumen conciso agrupado por prioridad con los archivos modificados y el resultado de las 3 comprobaciones.