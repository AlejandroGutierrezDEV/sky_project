# Instrucciones para Agentes (Jules) - SkyProject

## Entorno y comandos de verificación
Proyecto frontend desarrollado con **React + TypeScript (estricto) + Vite + Tailwind CSS v4**, enfocado en astronomía *offline-first* (`astronomy-engine`, Open-Meteo API y futuro soporte móvil con Capacitor).

Antes de finalizar cualquier tarea, ejecuta y verifica que pasan sin errores:
- Instalación de dependencias: `npm install`
- Linter: `npm run lint`
- Comprobación de tipos y build de producción: `npm run build`

## Estructura del proyecto
- `src/types/`: Tipos e interfaces TypeScript.
- `src/core/`: Cálculos astronómicos, eventos y servicio meteorológico.
- `src/data/`: Catálogos estáticos de estrellas y objetos Messier.
- `src/components/`: Componentes de interfaz y mapa celeste en `<canvas>`.

## Reglas de implementación
- **Idioma:** Redacta el código (comentarios, variables de dominio, textos de UI), los mensajes de commit y el resumen de la Pull Request siempre en **español**.
- **Tipado estricto:** No utilices `any`. Mantén las interfaces centralizadas en `src/types/astronomy.ts`.
- **Seguridad y validación de datos:**
  - Protege todas las lecturas de `localStorage` con `try/catch` y valida la estructura resultante.
  - Valida rangos de coordenadas (`latitud` entre `-90` y `90`, `longitud` entre `-180` y `180`) y fechas (`!Number.isNaN(date.getTime())`) antes de invocar `astronomy-engine`.
  - Mantén las consultas y cruces horarios de Open-Meteo en **UTC**.
- **Calidad de UI/UX:**
  - No uses `alert()`, `prompt()` ni `confirm()`. Gestiona los errores con estado en React.
  - Respeta los tres temas visuales (`oscuro`, `claro`, `rojo`) y prioriza eventos compatibles con pantallas táctiles (`onPointerDown` / `onPointerMove`).
- **Alcance estricto:** No modifiques, formatees ni elimines archivos que no estén directamente relacionados con la tarea solicitada.

## Reglas de Git, commits y autoría
- **Autoría de commits:** Antes de realizar cualquier commit en Git, configura el autor local para que figure exclusivamente a nombre del propietario del repositorio:
  ```bash
  git config user.name "alejandrogutierrezdev"
  git config user.email "gutierrezvillalba.dev@gmail.com"
  ```
- **Cero atribución al agente:**
  - **No** añadas líneas `Co-authored-by:` ni firmas automáticas en los mensajes de commit.
  - **No** menciones a Jules, bots ni asistentes de IA en mensajes de commit, comentarios del código ni descripciones de Pull Request.
- **Formato de commits:** Usa *Conventional Commits* en español, claros y concisos (por ejemplo: `fix: validar rangos de coordenadas y localStorage`, `feat: soporte tactil en el mapa celeste`).