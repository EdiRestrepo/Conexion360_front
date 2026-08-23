# Atributos de calidad (ISO/IEC 25010) — Conexión360

Conexión360 es un portal de seguimiento de envíos (dashboard, mis envíos, historial, reportes) con autenticación/roles vía Auth0 (ADMIN, ANALISTAOPE, ANALISTASAC, CLIENT), frontend Angular consumiendo un backend real en .NET (`C:\TCCWebApiCore`). Priorizar así:

## 1. Seguridad
La más crítica. Se manejan datos de clientes, envíos y roles diferenciados por tipo de usuario. Auth0 gestiona identidad y JWT; el backend debe validar el token y aplicar autorización por rol en cada endpoint (no solo en el frontend). Riesgo alto si un CLIENT accede a datos de otro `idClient` o a funciones de ANALISTA/ADMIN.

## 2. Fiabilidad (Reliability)
El backend expone datos operativos (totales, filtros, envíos) que alimentan decisiones de negocio. Debe garantizar disponibilidad y respuestas consistentes; el frontend debe tolerar fallos de red/API sin romper la experiencia (hoy varias secciones —detalle de envío, reportes, notificaciones— aún dependen de mocks, lo que oculta esta necesidad).

## 3. Usabilidad
Es un portal orientado a usuarios de negocio (clientes y analistas), no técnicos. La navegación por filtros (envíos, historial) y la claridad del estado de cada envío son el valor central del producto.

## 4. Eficiencia de desempeño
Los endpoints de filtrado (`myshipments`, `history`, `home/totals`) pueden manejar volúmenes grandes de registros; tiempos de respuesta y paginación/filtrado eficiente en backend, y renderizado ágil de listas en el frontend, son relevantes.

## 5. Mantenibilidad
El proyecto está en transición de mocks a servicios reales (mapper compartido `shipments-page.mapper.ts`, servicios API separados por feature). Mantener esa modularidad es clave porque el backend sigue creciendo endpoint por endpoint.

## 6. Compatibilidad / Interoperabilidad
El frontend depende de que los contratos de API (forma de respuesta, JWT, filtros) se mantengan sincronizados con el backend .NET; cambios en uno impactan directamente al otro (ya ocurrió con la eliminación de `role` como query param).

## Menor prioridad (por ahora)
**Portabilidad** y **Compatibilidad ambiental** no son foco actual: es una app web interna sin evidencia de requisitos multi-dispositivo/offline más allá de responsive estándar.
