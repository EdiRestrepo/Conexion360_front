---
name: responsive-design
description: Reglas y verificación de responsive (móvil, tablet y escritorio) para Conexion360. Usar SIEMPRE que se cree o modifique una pantalla, un componente visual, un layout, una tabla, un diálogo o cualquier CSS, y cuando se pida revisar si algo "se ve bien" en móvil, tablet o escritorio.
---

# Responsive en Conexion360

Toda pantalla debe funcionar en **móvil (375 px), tablet (768 y 1024 px) y
escritorio (1366 y 1920 px)** sin cortar contenido y sin ocultar datos. Si una
tabla o un bloque no cabe, se adapta la presentación (tarjetas, desplazamiento,
columna fija), **no se quitan columnas ni campos**.

## Cómo está armado el layout (no romperlo)

| Pieza | Comportamiento |
|---|---|
| `layout/main-layout` | ≥ 900 px: sidebar fijo de 240 px (76 px colapsado) y `.shell__body` con `margin-left`. ≤ 899 px: sin sidebar, barra inferior fija de 64 px y `padding-bottom: 96px` en el contenido. |
| `layout/header` | ≤ 720 px: botón de menú y sin campana ni avatar (están en el panel de `mobile-navigation`). 721–899 px: menú y acciones. |
| `.shell__body` / `.shell__content` | **`overflow-x: hidden`**. Un desborde NO produce barra de scroll: el contenido **se corta sin avisar**. Por eso no basta con "no veo scroll": hay que medir (ver «Verificar»). |

Ancho real disponible para una página: `viewport − 240 − 56` (padding) en
escritorio; en 1024 px eso son solo **728 px**, menos que una tablet vertical.

### Puntos de quiebre en uso

Reutilizar estos antes de inventar otros:

| Ancho | Uso |
|---|---|
| `max-width: 480px` | Ajustes finos de móvil pequeño (paddings, gaps) |
| `max-width: 640px` | Tarjetas del Inicio a una columna |
| `max-width: 720px` | Encabezado móvil |
| `max-width: 760px` | **Tablas → tarjetas** (`*-mobile-list`), grids a una columna |
| `max-width: 899px` / `min-width: 900px` | **Cambio de layout** (sidebar ↔ barra inferior) |
| `max-width: 900px` / `980px` / `1100px` / `1180px` | Grids de formularios, reportes y filtros a menos columnas |

## Reglas

### Grids y flex
- Columnas con `minmax(0, 1fr)`, nunca `1fr` a secas: `1fr` no encoge por debajo
  del contenido y empuja la página hacia fuera.
- Hijos de grid/flex con texto: `min-width: 0`.
- Identificadores largos (HBL, correos, razones sociales): `overflow-wrap: anywhere`,
  o `text-overflow: ellipsis` + `white-space: nowrap` + `overflow: hidden` con el
  valor completo en `title`.
- Nada de anchos fijos en px para bloques de página; sí para columnas de tabla.

### Tablas (patrón obligatorio)
1. Contenedor con `overflow-x: auto` + clase **`table-sticky-action`**
   (`src/styles.css`). Estructura exigida:
   `div.table-sticky-action > [role="table"] > [role="row"] > celdas`, con la
   **acción (Ver / Acciones) como última celda**. Queda fija a la derecha: sin
   ella, en 768–1366 px la única forma de abrir el detalle quedaba fuera de vista.
2. Tabla con `width: max-content; min-width: 100%` (o `width: 100%` + `min-width`
   igual a la suma de columnas, huecos y padding, como `users-table`).
3. ≤ 760 px: ocultar la tabla y mostrar una lista de tarjetas con **los mismos
   datos** y la misma acción.

### Zonas con desplazamiento horizontal (pestañas, chips)
- Clase global **`scroll-hint-x`**: sombra en el borde con más contenido, sin JS.
- El componente declara su color con `--scroll-hint-bg: var(--color-…)` y **no**
  `background` (lo pisaría por especificidad del CSS encapsulado).

### Áreas táctiles
- `mat-icon-button` ya trae un área invisible de 48 px
  (`.mat-mdc-button-touch-target`): aunque el botón se vea de 26 px, está bien.
- Enlaces y botones propios: mínimo 40 px en pantallas táctiles sin mover el
  diseño:
  `@media (pointer: coarse) { .x { padding-block: 11px; margin-block: -11px; } }`.

### Diálogos
- `dialog.open(…, { width: 'Npx', maxWidth: '92vw' | '95vw' })`. Nunca sin
  `maxWidth`.
- Formularios de diálogo a una columna ≤ 600 px.

### Estilos
- Colores y tipografía solo con las variables de `src/styles.css` (AGENTS §12).
- **Presupuesto de CSS por componente: aviso a 4 kB, error de build a 8 kB.**
  Si un patrón se repite o el archivo se acerca al límite, va como utilidad en
  `src/styles.css` (así nacieron `table-sticky-action` y `scroll-hint-x`). No subir
  el presupuesto en `angular.json` sin aprobación.
- Mapas (Leaflet) y gráficos (Chart.js): contenedor con `width: 100%`; en
  Chart.js, `responsive: true` (como en `reports.ts`).

## Verificar (obligatorio al tocar una pantalla)

Las pruebas unitarias no ven el layout. El login de Auth0 impide abrir la app en
un navegador automatizado, así que la auditoría monta el layout real con
servicios doblados. Herramientas en `audit/`:

| Archivo | Rol |
|---|---|
| `audit/responsive-audit.spec.ts` | Renderiza cada ruta dentro de `MainLayout` con datos largos y mide. **Agregar aquí las rutas nuevas** (`pages`) y sus servicios. |
| `audit/karma-serve.cjs` | Karma sin navegador en `:9876` |
| `audit/cdp-audit.mjs` | Emula los 5 dispositivos por DevTools, guarda `audit-log.txt` y capturas |

Pasos (desde la raíz, con `$OUT` en el scratchpad):

```bash
cp .claude/skills/responsive-design/audit/responsive-audit.spec.ts src/app/
npx ng test --watch=true --include=src/app/responsive-audit.spec.ts \
  --karma-config=.claude/skills/responsive-design/audit/karma-serve.cjs   # en segundo plano
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --remote-debugging-port=9333 --user-data-dir="$OUT/chrome-profile" \
  --no-first-run --hide-scrollbars about:blank                            # en segundo plano
# esperar "server started" en la salida de Karma
cd .claude/skills/responsive-design/audit && node cdp-audit.mjs "$OUT"   # o: node cdp-audit.mjs "$OUT" m375,d1366
```

Leer `$OUT/audit-log.txt`. Cada línea: dispositivo, ruta y:
- `out=[…]` — elementos fuera del viewport → **defecto** (se cortan en silencio).
- `hiddenAction=[…]` — la acción de una tabla queda fuera de vista → **defecto**.
- `clipped=[…]` — texto cortado sin puntos suspensivos → **defecto**.
- `scroll=[…]` — contenedores con desplazamiento: esperado en tablas.

Luego **mirar las capturas** de `$OUT/shots/` (al menos m375, t768 y d1366 de la
pantalla tocada): las medidas no detectan jerarquía rota ni solapes.

Al terminar, **siempre**:
1. Borrar `src/app/responsive-audit.spec.ts` (no debe entrar a la suite ni al repo).
2. Cerrar procesos **por puerto**: en Windows, detener la tarea de fondo mata el
   shell pero deja vivo el `node` de Karma, y la siguiente corrida serviría el
   bundle viejo sin avisar.
   ```powershell
   foreach ($p in 9876, 9333) { Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force } }
   ```
3. `npm test` completo y `npx ng build` (vigilar el presupuesto de CSS).

### Trampas conocidas de la auditoría
- En las capturas los iconos salen como texto ("inv", "sea"): la fuente de
  Material Symbols no carga en Karma. No es un defecto.
- ChromeHeadless con `--window-size` no baja de 500 px, y
  `--force-device-scale-factor` no cambia el viewport CSS: por eso se usa
  `Emulation.setDeviceMetricsOverride`.
- `captureBeyondViewport` descoloca el layout con sidebar fijo (el contenido sale
  debajo del menú): se usa un viewport alto y captura normal.
- Windows no distingue mayúsculas en nombres de archivo: no nombrar dispositivos
  que solo difieran en mayúsculas (`m375` y `M375` se pisan).
- Verificar que las líneas del log tienen el formato actual (campo
  `hiddenAction`); si no, hay un Karma viejo sirviendo en `:9876`.
