# AGENTS.md

## 1. Contexto del proyecto

Este repositorio contiene el frontend de un trabajo de grado de la
Especialización en Ingeniería de Software.

El producto es una plataforma tecnológica para centralizar información de
envíos internacionales de importación y exportación, con el propósito de
mejorar la trazabilidad, reducir los tiempos de respuesta y mejorar la
satisfacción de los clientes.

Nombre provisional del producto:

Conexion360

La aplicación debe permitir consultar y visualizar información logística de
envíos internacionales aéreos y marítimos.

## 2. Stack tecnológico

Frontend:

- Angular
- TypeScript estricto
- Componentes standalone
- Angular Router
- Reactive Forms
- RxJS
- Angular Material o componentes nativos reutilizables
- Chart.js únicamente para gráficos
- Leaflet y OpenStreetMap únicamente para mapas
- CSS o SCSS responsive

Backend:

- C# .NET
- API REST
- Repositorio en `C:\TCCWebApiCore\Apis`

El backend ya existe y ya está parcialmente integrado. No toda la aplicación
funciona con datos simulados.

Integrado con el backend real:

- Dashboard / Inicio (`ApiHomeService`, endpoints `/home/totals` y
  `/home/filters`).
- Mis envíos (`ApiMyShipmentsService`, endpoints `/myshipments/allshipments`
  y `/myshipments/filterShipments`).
- Historial (`ApiHistoryService`, endpoints `/myshipments/allhistory` y
  `/myshipments/filterhistory`).
- Detalle del envío (`ApiShipmentDetailService`, endpoint
  `/myshipments/detailsshipments`). Un único endpoint alimenta las seis
  pestañas: Resumen, Seguimiento, Fechas logísticas, Contenedor, Financiero e
  Historial.

Todavía con datos simulados, sin endpoints de backend confirmados:

- Reportes
- Notificaciones
- Ajustes

Las pantallas que aún no tienen backend deben seguir funcionando con
servicios mock, pero preparadas para reemplazar esos mocks por servicios HTTP
sin modificar los componentes visuales.

## 3. Fuentes funcionales y visuales

Antes de implementar una funcionalidad, revisar:

1. Product Backlog.xlsx C:\especializacion_ing_software\trabajo_de_grado
2. Sabana de datos.xlsx C:\especializacion_ing_software\trabajo_de_grado
3. Trabajo_de_grado_centralización_plataforma_envios.docx C:\especializacion_ing_software\trabajo_de_grado
4. Mockups de Base44 suministrados por el equipo
5. Código existente en el repositorio

Los mockups son la referencia visual principal.

No se deben inventar funcionalidades que contradigan el backlog, la sábana de
datos o los mockups.

## 4. Pantallas de referencia

La aplicación debe incluir progresivamente:

### Acceso

- Inicio de sesión
- Registro de usuario
- Recuperación de contraseña simulada
- Validación de formularios
- Autenticación mock
- Roles simulados

### Layout principal

- Menú lateral
- Encabezado
- Identidad del usuario
- Navegación responsive
- Estado de opción activa
- Cierre de sesión

### Inicio o dashboard

- Saludo al usuario
- Buscador de envíos
- Total de envíos
- Total de importaciones
- Total de exportaciones
- Total de envíos aéreos
- Total de envíos marítimos
- Total de envíos con novedad
- Envíos recientes
- Indicadores resumidos

### Mis envíos

- Tabla paginada
- Búsqueda por HBL, AWB, cliente, origen o destino
- Filtro por importación o exportación
- Filtro por modalidad AIR o SEA
- Filtro por estado
- Navegación al detalle
- Estado vacío
- Estado de carga
- Manejo de errores simulados

### Detalle del envío

El detalle debe incluir pestañas:

- Resumen
- Seguimiento
- Fechas logísticas
- Contenedor
- Financiero
- Historial

La pestaña Documentos fue descartada: no se implementará y el backend no
entrega esa información.

### Seguimiento

- Mapa
- Origen
- Destino
- Ruta
- Estado actual
- Próxima parada
- Progreso porcentual
- Etapas logísticas

### Fechas logísticas

- Bodega de origen
- ETD
- ATD
- ETA
- ATA
- Bodega destino
- Nacionalización
- Despacho
- Planilla
- Entrega
- Indicadores de retraso

### Contenedor

- Tipo de contenedor
- Cantidad
- Número
- Días libres
- Días restantes
- Fecha de devolución
- Días de demora
- Valor por día
- Total de demoras
- Depósito

### Financiero

- Solicitud de anticipo
- Pago del anticipo
- Valor del anticipo
- Factura del proveedor
- Factura TCC
- Número de factura
- Fecha
- Descripción del gasto
- Subtotal
- IVA
- Total

### Historial

Bitácora de cambios del envío (`historyShipments.detailsHistoryShipments`):

- Estado anterior y estado nuevo del cambio
- Mensaje o descripción del cambio
- Usuario que lo registró
- Fecha y hora

### Notificaciones

- Listado de notificaciones
- Leídas y no leídas
- Notificación de demora
- Cambio de estado
- En tránsito
- En aduana
- Entregado
- Preferencias simuladas

### Reportes

- Total de envíos
- Entregados
- Con novedad
- Total facturado
- Total de anticipos
- Total de demoras
- Distribución por operación
- Distribución por modalidad
- Distribución por estado
- Top de clientes
- Exportación simulada

### Ajustes

- Preferencias de notificación
- Gestión de usuarios
- Gestión de roles
- Parámetros maestros

## 5. Arquitectura del frontend

Usar una arquitectura por funcionalidades:

src/app/
  core/
    contracts/
    guards/
    interceptors/
    mappers/
    models/
    services/
    tokens/
    utils/

  shared/
    components/
    directives/
    pipes/
    ui/
    utils/

  layout/
    main-layout/
    sidebar/
    header/
    user-menu/

  features/
    auth/
    dashboard/
    shipments/
    shipment-detail/
    history/
    notifications/
    reports/
    settings/

  mocks/
    data/
    services/
    factories/

No crear un único componente grande.

Cada página debe dividirse en componentes reutilizables cuando sea razonable.

## 6. Modelos de dominio

Definir interfaces y tipos explícitos para al menos:

- User
- UserRole
- AuthSession
- Shipment
- ShipmentStatus
- ShipmentEvent
- LogisticDates
- Container
- ShipmentFinancialInfo
- Invoice
- AdvancePayment
- Notification
- NotificationPreference
- DashboardMetrics
- ReportMetrics
- PaginatedResult
- SearchFilters

No utilizar `any`.

Los valores ausentes deben representarse con propiedades opcionales o `null`
cuando sea necesario.

## 7. Estados principales

Tipos de operación:

- IMPO
- EXPO

Modalidades:

- AIR
- SEA

Estados logísticos iniciales:

- PENDING
- ORIGIN_WAREHOUSE
- ORIGIN_CUSTOMS
- IN_TRANSIT
- DESTINATION_CUSTOMS
- NATIONALIZED
- DESTINATION_WAREHOUSE
- DISPATCHED
- DELIVERED
- WITH_ISSUE
- CANCELLED

Crear funciones centralizadas para convertir estados técnicos en textos
visibles en español.

## 8. Acceso a datos

Los componentes no deben importar directamente archivos mock.

Todo acceso a datos debe realizarse mediante servicios.

Estado real de los servicios (verificar contra el código antes de asumir que
algo sigue mockeado):

- `Auth0FacadeService`: identidad y sesión de Auth0. Real, no simulado.
- `AuthSessionService`: expone la sesión (`AuthSession`) derivada
  directamente de `Auth0Identity`, incluyendo el rol real asignado en Auth0.
  No existe `MockUserProfileService` ni `UserProfileDataSource`: el perfil
  complementario ya no se simula, viene de Auth0.
- `ApiHomeService`: real, consume el backend (`/home/totals`,
  `/home/filters`) usando `idClient` (documento) obtenido de la identidad de
  Auth0 como parámetro. El rol ya no se envía por parámetro: el backend lo
  obtiene del token JWT (`Authorization: Bearer`).
- `ApiMyShipmentsService`: real, consume el backend
  (`/myshipments/allshipments`, `/myshipments/filterShipments`) con el mismo
  patrón: `idClient` como parámetro, rol tomado del token por el backend.
- `ApiHistoryService`: real, consume el backend (`/myshipments/allhistory`,
  `/myshipments/filterhistory`) con el mismo patrón. A diferencia de
  `ApiMyShipmentsService`, no admite filtro por estado (`State`); solo
  `ValueFilter`, `OperationType` y `ShipmentMode` como opcionales.
- `mapShipmentsPageResponse` (`core/mappers/shipments-page.mapper.ts`):
  función compartida que traduce la respuesta del backend
  (`dataResponse`/`meta`) al modelo `MyShipmentsPage`. La usan tanto
  `ApiMyShipmentsService` como `ApiHistoryService` porque ambos endpoints
  devuelven la misma forma de respuesta; no duplicar este mapeo al conectar
  un endpoint nuevo con la misma forma de respuesta. Los mappers de
  funciones puras (sin `@Injectable`) viven en `core/mappers/`, separados de
  los servicios inyectables.
- `ApiShipmentDetailService`: real, consume el backend
  (`/myshipments/detailsshipments`) con `idClient` y `documentNumber` como
  parámetros. Un solo endpoint alimenta las seis pestañas del detalle, así
  que la consulta se hace **una vez por envío**: la pestaña activa es estado
  de interfaz y no debe disparar una petición nueva (ver
  `detailRequest$` / `detailData$` en `shipment-detail.ts`).
- `mapShipmentDetailResponse` (`core/mappers/shipment-detail.mapper.ts`):
  traduce las secciones `resumenShipments`, `trackingShipments`,
  `logisticsDatesShipments`, `containerShipments`, `financialInfoShipments` e
  `historyShipments` al modelo `Shipment`. Tolera que los números lleguen
  como texto y que las fechas vengan en ISO o en formato estadounidense
  (`MM/DD/YYYY`, caso de `invoiceDate`).
- `MockShipmentService` (implementa `ShipmentDataSource`, definida en
  `core/contracts/shipment-data-source.ts`): sigue en uso únicamente para
  reportes, mientras no exista integración con el backend para esa pantalla.
  Su superficie pública se redujo a `getReportMetrics()` más la configuración
  de simulación (`configureSimulation` / `resetSimulation`) usada para
  ejercitar los estados vacío y de error. Las operaciones de listado,
  búsqueda, paginación, detalle y métricas de dashboard se eliminaron al
  conectar esas pantallas al backend real; no volver a agregarlas.
- `mocks/data/mock-shipments.ts` y `mocks/factories/mock-shipment.factory.ts`
  siguen siendo necesarios: alimentan tanto a `MockShipmentService`
  (reportes) como a `MockNotificationService` (notificaciones), que deriva
  las notificaciones simuladas de esos envíos. No eliminarlos mientras
  cualquiera de esas dos pantallas siga sin backend.
- `MockNotificationService` (implementa `NotificationDataSource`, definida
  en `core/contracts/notification-data-source.ts`): sigue en uso para
  notificaciones.

Las interfaces/contratos de acceso a datos (`ShipmentDataSource`,
`NotificationDataSource`) viven en `core/contracts/`, separadas de las
implementaciones (`core/services/` para las reales, `mocks/services/` para
las simuladas).

Simular latencia usando RxJS en los servicios que sigan siendo mock.

Los servicios deben devolver `Observable`.

Al conectar una pantalla nueva al backend real, seguir el patrón ya
establecido por `ApiHomeService`, `ApiMyShipmentsService` y
`ApiHistoryService`: inyectar
`Auth0FacadeService` para obtener `idClient`, llamar al endpoint con
`HttpClient` (el token de Auth0 va en la cabecera `Authorization` y el
backend deriva el rol de ahí, no se envía como parámetro), y mapear la
respuesta a los modelos de dominio existentes sin cambiar los componentes
visuales.

## 9. Datos simulados

Esta sección aplica únicamente a las pantallas que todavía usan servicios
mock (ver sección 8). El dashboard y "Mis envíos" ya consumen datos reales
del backend y no deben tratarse como simulados.

Construir los datos simulados a partir de la sábana de datos.

No duplicar manualmente datos dentro de múltiples componentes.

Mantener una única fuente central de datos.

Los datos deben incluir casos variados:

- Importaciones
- Exportaciones
- Envíos aéreos
- Envíos marítimos
- Envíos entregados
- En tránsito
- En aduana origen
- En aduana destino
- Con novedad
- Con retraso
- Con y sin contenedor
- Con información financiera
- Con documentos
- Con eventos históricos

Los indicadores del dashboard y reportes deben calcularse desde los datos mock,
no escribirse como valores fijos en el HTML.

## 10. Autenticación y perfil con Auth0

La aplicación utiliza Auth0 como proveedor externo de identidad.

Auth0 gestiona actualmente:

- Inicio de sesión
- Registro de credenciales
- Correo electrónico
- Contraseña
- Recuperación de contraseña
- Verificación de correo
- Sesión de autenticación
- Cierre de sesión
- Identidad del usuario, incluyendo el perfil complementario y el rol

El perfil complementario de Conexion360 (rol, documento, empresa, nombre) ya
no se simula en el frontend. Se obtiene directamente de la identidad
autenticada de Auth0 (`Auth0Identity`) a través de `Auth0FacadeService` y se
expone mediante `AuthSessionService`. No existe `MockUserProfileService` ni
`UserProfileDataSource` en el código.

### Identidad, autenticación y perfil

Son administrados por Auth0.

Angular no debe:

- Almacenar contraseñas
- Validar contraseñas localmente
- Crear una sesión paralela
- Crear tokens propios
- Persistir secretos
- Reemplazar Auth0 con autenticación mock
- Simular el perfil o el rol del usuario cuando ya están disponibles en la
  identidad de Auth0

Roles reales (configurados en el tenant de Auth0, no son valores simulados):

- ADMIN — admin
- ANALISTAOPE — analista operativo
- ANALISTASAC — analista de servicio al cliente
- CLIENT — cliente

Estos roles reemplazan cualquier referencia previa a `CLIENT / OPERATOR /
ADMIN` como roles simulados. Los guards de rol (`roleGuard`) deben validar
contra estos valores reales.

No debe incluirse en almacenamiento local ni en logs:

- Contraseñas
- Tokens de Auth0
- Refresh tokens
- Client secret
- Información sensible innecesaria

## Servicios de autenticación y perfil

La arquitectura separa las responsabilidades:

- `Auth0FacadeService`: encapsula el inicio de sesión, registro, logout,
  estado de autenticación y lectura de la identidad completa (incluyendo rol,
  documento y empresa) proporcionada por Auth0.
- `AuthSessionService`: deriva la sesión (`AuthSession`) de esa identidad
  para consumo del resto de la aplicación.

Los componentes no deben depender directamente de localStorage ni del SDK de
Auth0. Deben consumir `AuthSessionService` o `Auth0FacadeService`.

## Flujo temporal de registro

1. El usuario completa en Angular:
   - nombre completo
   - empresa
   - correo electrónico
   - teléfono
   - aceptación de tratamiento de datos

2. Angular valida únicamente los datos complementarios.

3. La aplicación redirige al registro de Auth0.

4. Auth0 solicita y administra:
   - correo
   - contraseña
   - verificación
   - recuperación de acceso

5. Al regresar a Angular, la aplicación obtiene la identidad autenticada,
   incluyendo el perfil complementario y el rol reales gestionados en Auth0.

6. El usuario accede al dashboard, que consulta datos reales del backend
   (`ApiHomeService`) usando esa identidad.

## Rutas y protección

Requisitos:

- Rutas privadas protegidas mediante el estado de autenticación de Auth0
- Control de acceso por rol basado en el rol real asignado en Auth0
- Cierre de sesión mediante Auth0
- Redirección segura después del login
- Manejo de callback
- Manejo de errores
- Ruta para perfil incompleto
- No confiar únicamente en ocultar elementos visuales para controlar permisos

## Usuarios y roles

No crear usuarios con contraseña dentro de Angular.

Los roles se asignan en Auth0 (tenant del proyecto, User Management → Roles)
y se validan en Angular a partir de la identidad autenticada:

- ADMIN
- ANALISTAOPE
- ANALISTASAC
- CLIENT

Angular no gestiona ni simula la asignación de roles; solo los consume desde
la identidad de Auth0.

## Seguridad

No se debe:

- Almacenar contraseñas
- Guardar tokens manualmente
- Imprimir tokens en consola
- Exponer secretos
- Crear autenticación paralela
- Conectar Angular directamente a PostgreSQL
- Confiar en localStorage como mecanismo definitivo de seguridad

La autorización real deberá validarse posteriormente también en el backend.

## 11. Rutas iniciales

Configurar lazy loading:

- /login
- /register
- /dashboard
- /shipments
- /shipments/:id
- /history
- /notifications
- /reports
- /settings
- /settings/notifications
- /settings/users
- /settings/master-data

Agregar ruta 404 o redirección segura.

## 12. Diseño visual

Tomar los mockups de Base44 como referencia de estructura, jerarquía,
distribución de información, componentes, flujos y comportamiento visual.

Aunque los mockups tengan otra paleta de colores, de ahora en adelante debe
respetarse la identidad visual vigente de Conexion360 implementada en
`src/styles.css`. La paleta vigente prevalece sobre los colores originales de
los mockups.

Paleta oficial de Conexion360:

- Azul Petróleo `#12355B`: color principal, encabezados destacados, sidebar y
  elementos de marca.
- Turquesa `#00B8A9`: color secundario, acciones activas, enlaces, acentos y
  estados de progreso.
- Naranja `#F97316`: alertas, novedades, advertencias y llamados de atención.
- Verde `#22C55E`: estados correctos, entregados, completados o exitosos.
- Gris Claro `#F8FAFC`: fondo general de la aplicación.
- Gris Oscuro `#334155`: texto secundario, etiquetas y descripciones.
- Negro `#0F172A`: texto principal.

La paleta debe mantenerse centralizada mediante variables CSS en
`src/styles.css`. No codificar colores hexadecimales repetidos en CSS de
componentes salvo que exista una justificación puntual.

Tipografía oficial:

- Familia: IBM Plex Sans.
- H1: 40 px.
- H2: 30 px.
- H3: 24 px.
- Texto: 16 px.
- Etiquetas: 14 px.
- Botones: 15 px.

La tipografía también debe mantenerse centralizada mediante variables CSS en
`src/styles.css`.

Lineamientos visuales:

- Fondo principal claro.
- Menú lateral con identidad azul petróleo y estados activos turquesa.
- Texto principal en negro `#0F172A`.
- Texto secundario en gris oscuro `#334155`.
- Estados y alertas mediante chips.
- Tarjetas blancas.
- Bordes suaves.
- Sombras discretas.
- Espaciado consistente.
- Tablas legibles.
- Diseño empresarial.
- Diseño responsive.

No copiar textos como “Mockup Auth” en la versión final.

Unificar el nombre del producto en toda la aplicación.

Antes de hacerlo, reportar si actualmente aparecen varios nombres como
otros nombres anteriores y dejarlo en Conexion360.

## 13. Responsive y accesibilidad

La aplicación debe funcionar en:

- Escritorio
- Tablet
- Móvil

Requisitos:

- Menú lateral colapsable
- Tablas adaptables o con desplazamiento horizontal
- Formularios con etiquetas
- Navegación por teclado
- Contraste legible
- Botones con texto o etiquetas accesibles
- `aria-label` donde corresponda
- Mensajes de validación claros

## 14. Calidad

Aplicar:

- TypeScript estricto
- Componentes standalone
- ChangeDetectionStrategy.OnPush cuando sea viable
- `trackBy` o `track` en listas
- Señales de Angular cuando sean apropiadas
- RxJS para operaciones asíncronas
- Reactive Forms
- No suscribirse manualmente sin gestionar la destrucción
- No dejar código muerto
- No dejar `console.log`
- No duplicar lógica
- No codificar textos de estado repetidos
- No mezclar lógica de negocio con HTML
- No modificar configuración crítica sin justificarlo

## 15. Estados de interfaz

Toda pantalla que consulte datos debe contemplar:

- Loading
- Empty
- Success
- Error

Los errores simulados deben mostrar mensajes comprensibles y permitir
reintentar.

## 16. Pruebas mínimas

Crear pruebas para:

- Servicios mock
- Login
- Guards
- Filtros de envíos
- Paginación
- Cálculo de indicadores
- Navegación al detalle
- Formateo de estados
- Validaciones de formularios

No eliminar pruebas existentes para conseguir que el build pase.

## 17. Forma obligatoria de trabajo

Para cada tarea:

1. Analizar el código existente.
2. Identificar la funcionalidad del backlog relacionada.
3. Presentar un plan breve.
4. Indicar archivos que se crearán o modificarán.
5. Esperar aprobación cuando la tarea pueda cambiar arquitectura o instalar
   dependencias.
6. Implementar cambios pequeños.
7. Ejecutar formateo, pruebas y build.
8. Corregir errores producidos por la implementación.
9. Mostrar un resumen de cambios.
10. Informar riesgos, supuestos y pendientes.

## 18. Restricciones

No hacer lo siguiente:

- No construir toda la aplicación en una sola tarea.
- No instalar dependencias sin aprobación.
- No modificar archivos de configuración innecesariamente.
- No conectar todavía PostgreSQL desde Angular.
- No implementar lógica de backend dentro del frontend.
- No usar datos reales sensibles.
- No exponer información empresarial confidencial.
- No usar `any`.
- No crear componentes monolíticos.
- No reemplazar estilos globales sin revisar impacto.
- No alterar funcionalidades ya implementadas sin justificarlo.
- No inventar endpoints definitivos.
- No afirmar que una integración existe si está simulada.

## 19. Criterio de finalización

Una tarea solo se considera terminada cuando:

- Compila correctamente
- Las pruebas relacionadas pasan
- Tiene estado de carga
- Tiene estado vacío
- Tiene manejo de error
- Es responsive
- No genera errores en consola
- Mantiene tipado estricto
- Está integrada con las rutas correspondientes
- Se documentan los cambios

## 20. Geolocalización y mapas (nota técnica)

Esta sección documenta cómo se resuelve el mapa de la pestaña Seguimiento y
qué limitaciones tiene la solución actual de cara a un despliegue productivo.

### Qué componente hace qué

Hay tres piezas distintas que suelen confundirse porque en dos de ellas
aparece el nombre "OpenStreetMap":

| Pieza | Dónde vive | Qué hace | ¿Es dependencia npm? |
|---|---|---|---|
| Nominatim (`nominatim.openstreetmap.org`) | Backend .NET | Geocodificación: recibe el nombre del país y devuelve latitud/longitud | No, es una API REST |
| Servidor de tiles de OSM (`tile.openstreetmap.org`) | Consumido por el navegador | Entrega las imágenes del mapa | No, se consume por URL |
| Leaflet | Frontend Angular | Renderiza el mapa, marcadores y línea de ruta | Sí, `leaflet` en `package.json` |

Por eso en `package.json` solo aparece `leaflet`: los dos servicios de
OpenStreetMap se consumen por HTTP, no como librerías. Leaflet es agnóstico
del proveedor de mapas; cambiar de proveedor no implica cambiar el código de
la aplicación, solo la URL de los tiles.

### Flujo de datos

1. El backend consulta Nominatim con el nombre del país y obtiene las
   coordenadas.
2. El endpoint `/myshipments/detailsshipments` las entrega en
   `trackingShipments` (`originLatitudCoordinates`,
   `originLongitudCoordinates` y equivalentes de destino).
3. `shipment-detail.mapper.ts` las guarda en `origin.latitude/longitude` y
   `destination.latitude/longitude` del modelo `Shipment`.
4. El componente `shipment-tracking` dibuja origen, destino y ruta con
   Leaflet sobre los tiles de OpenStreetMap.

Advertencia sobre los nombres de país: Nominatim devuelve el nombre en el
idioma local (`Deutschland` en vez de Alemania, el nombre en chino para
China). Por eso el mapper usa `resumenShipments.origin` y
`resumenShipments.destination` para las **etiquetas visibles**, y de
`trackingShipments` toma **únicamente** latitud y longitud.

### Limitaciones para producción

La solución actual es adecuada para el alcance del trabajo de grado, pero
tiene restricciones que deben resolverse antes de un despliegue con tráfico
real:

- **Tiles**: la política de uso de OpenStreetMap desaconseja explícitamente
  usar `tile.openstreetmap.org` en aplicaciones productivas. Correspondería
  contratar un proveedor con plan (Mapbox, MapTiler, Stadia Maps) y cambiar
  la URL del `tileLayer`.
- **Geocodificación**: Nominatim limita a una petición por segundo y exige un
  `User-Agent` identificable. Con volumen, ese límite se convierte en cuello
  de botella.
- **Geocodificación repetida**: hoy se resuelve el mismo país en cada
  consulta de detalle. Como el conjunto de países es pequeño y estable, lo
  correcto es persistir las coordenadas en base de datos (o una tabla de
  referencia de países) y consultar Nominatim solo ante un país desconocido.
  Esto es una decisión del lado del backend.
- **Precisión**: geocodificar a nivel de país ubica el marcador en el
  centroide del territorio, no en el puerto o aeropuerto real. Si más
  adelante se requiere precisión operativa, habría que geocodificar por
  terminal o ciudad.
