# Contrato de Arquitectura — SkyProject

## Stack y reglas base
- **Stack:** React 19, TypeScript (`strict: true`, prohibido `any`), Vite, Tailwind CSS v4, `astronomy-engine`, `lucide-react` y Vitest.
- **Idioma:** Todo el código nuevo (tipos, hooks, servicios, componentes, comentarios y UI) debe escribirse en **español** para mantener coherencia con el dominio del proyecto.
- **Seguridad y fronteras:** Validar siempre `localStorage`, inputs y respuestas HTTP con *type guards* y `try/catch`. Prohibido usar `alert()`, `confirm()` o `prompt()`.
- **Temas visuales:** Cualquier componente nuevo debe soportar `oscuro`, `claro` y `rojo` (en `rojo`, cero píxeles blancos, azules o amarillos; solo espectro rojo sobre negro).

## Única Fuente de Verdad (NO duplicar)
Antes de crear un archivo nuevo en `src/`, reutiliza obligatoriamente los existentes:
- **Tipos de dominio:** `src/types/astronomy.ts`
- **Catálogos astronómicos:** `src/data/estrellasMag4.ts`, `src/data/messier110.ts`, `src/data/constelacionesIAU.ts` y `src/data/meteorShowers.ts` *(prohibido crear catálogos paralelos)*.
- **Motor astronómico:** `src/core/skyCalculator.ts`, `src/core/eventsCalculator.ts` y `src/utils/lunarCalculations.ts` *(usar siempre `astronomy-engine`, nunca aproximaciones manuales paralelas)*.
- **Meteorología (Open-Meteo):** `src/core/weatherService.ts` *(centralizar aquí las peticiones y la caché LRU; no crear clientes HTTP duplicados)*.
- **Ubicación y tiempo:** Usar siempre `useLocation` (`coordinates` con zona IANA) y formatear horas con `formatearHoraEnZona(..., timezone)`. Prohibido usar `new Date().getHours()` o `toLocaleTimeString()` sin zona horaria explícita.

## Verificación obligatoria antes de terminar
Ejecutar siempre `npm run lint`, `npx tsc --noEmit`, `npm test` y `npm run build`.