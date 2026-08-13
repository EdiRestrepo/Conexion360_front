# Auth0 autentica identidad, pero Conexion360 debe autorizar y administrar usuarios de negocio.

1. Angular redirige a Auth0.
2. Auth0 valida correo/contraseña.
3. Auth0 devuelve sesión al frontend.
4. Angular obtiene un access_token para tu API.
5. Angular llama al backend con:
   
Authorization: Bearer <access_token>

6. El backend C# valida ese token: firma, issuer, audience, expiración.
7. Luego busca el usuario en la base de datos de Conexion360 usando normalmente el sub de Auth0, por ejemplo:
auth0|69a908d8e468fc38695ebf78

Ese sub debe guardarse en tu tabla Users.

El backend no necesita responder otro JWT propio, salvo que tengas una razón muy específica. Lo más limpio es que responda algo como:

{
  "id": "user-123",
  "auth0Id": "auth0|69a908d8e468fc38695ebf78",
  "name": "Edison Estival",
  "email": "edisonestival@gmail.com",
  "company": "TCC S.A.S.",
  "role": "CLIENT",
  "isActive": true,
  "permissions": ["shipments:read", "notifications:read"]
}

Si el usuario existe en Auth0 pero no existe en Conexion360, el backend debería responder 403 Forbidden o un estado tipo:

{
  "code": "USER_NOT_REGISTERED_IN_NEXCARGO",
  "message": "El usuario no está registrado en Conexion360."
}

En tu implementación actual no ves claramente un JWT porque todavía no configuramos un audience para una API propia. Auth0 emite Access Tokens para APIs registradas. Auth0 documenta que las aplicaciones usan Access Tokens para llamar APIs protegidas, y que esos tokens llevan autorización como scopes/permisos. También indica que para APIs propias registradas se emiten JWT Access Tokens y que debes validar el token antes de confiar en él. Fuentes: Auth0 APIs y Access Tokens.

https://auth0.com/docs/get-started/apis
https://auth0.com/docs/secure/tokens/access-tokens

2. Registro con nombre, empresa, correo y teléfono
Tienes varias opciones. La más ordenada para Conexion360 sería separar datos de identidad y datos de negocio:

Auth0 guarda: correo, contraseña, identidad, proveedor, verificación de email.

Backend Conexion360 guarda: empresa, teléfono, rol, estado del usuario, permisos, relación con clientes/envíos.

# Para capturar más datos puedes hacerlo de tres formas:

1. Pantalla propia de Conexion360 antes o después de Auth0
Tu formulario captura nombre, empresa, teléfono y correo. Luego el backend crea un “usuario pendiente” o completa el perfil después del primer login. Esta opción respeta mejor tus mockups.

2. Auth0 Universal Login con campos adicionales
Auth0 permite guardar datos extra en user_metadata; por ejemplo nombre, teléfono o preferencias. Auth0 explica que user_metadata sirve para datos editables del usuario, y app_metadata para información de acceso que el usuario no debería modificar, como roles o permisos.
Fuente: https://auth0.com/docs/manage-users/user-accounts/metadata

3. Backend crea usuarios en Auth0 usando Management API
Si Conexion360 quiere controlar el registro completo, el frontend manda los datos al backend, y el backend crea el usuario en Auth0 y en PostgreSQL. Importante: la Management API no debe llamarse directamente desde Angular porque expondrías credenciales sensibles.

Mi recomendación para tu proyecto:
Usa Auth0 para correo/contraseña y usa tu backend para completar/perfilar el usuario. En PostgreSQL tendrías algo como:

Users
- id
- auth0UserId
- name
- email
- phone
- companyId
- role
- status
- createdAt
- 
Y en Auth0 solo guardarías lo mínimo necesario para identidad. Los roles reales de Conexion360 deberían vivir en tu backend, o en app_metadata si quieres sincronizarlos con Auth0.

3. Modificar la interfaz de Auth0
Desde Auth0 puedes personalizar varias cosas:
- Logo
- Colores
- Nombre de la aplicación
- Texto básico
- Idioma
- Algunas opciones de Universal Login

Ruta típica en Auth0 Dashboard:
Branding -> Universal Login

También revisa:
Applications -> Applications -> tu aplicación -> Settings

Ahí puedes cambiar el nombre que hoy aparece como Auth0Angular.

Pero ojo: si quieres que Auth0 se vea exactamente como tus mockups de Base44, con layout de dos columnas, naranja, tarjetas, tabs “Iniciar sesión / Crear cuenta”, etc., Universal Login estándar puede quedarse corto. Para algo idéntico tienes dos caminos:

* Personalizar Universal Login avanzado desde Auth0, si tu plan/configuración lo permite.
* Mantener tu pantalla Angular como UI principal, y que el botón redirija a Auth0 solo para credenciales. Es lo más simple, pero la pantalla de contraseña seguirá siendo la de Auth0.
* 
Para tu trabajo de grado, yo documentaría esta decisión así:

Conexion360 delega autenticación segura en Auth0 mediante OAuth 2.0/OIDC. El frontend obtiene tokens desde Auth0 y consume el backend C# enviando el Access Token en el encabezado Authorization. El backend valida el token y complementa la autorización con la base de datos propia de Conexion360, donde se almacenan roles, empresa, teléfono, estado del usuario y permisos funcionales.



# Cómo tomar ese token para enviarlo al backend

- Desde Angular no deberías copiar el token del alert. Lo correcto es pedirlo cuando vayas a llamar el backend:
this.auth0.getAccessTokenSilently().subscribe((token) => {
  this.http.get('https://localhost:7001/api/shipments', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
});

- Pero la mejor práctica es usar un HTTP interceptor, para que todas las llamadas al backend salgan automáticamente con:
Authorization: Bearer <access_token>
Cómo sería la comunicación real
El flujo quedaría así:
Angular -> Auth0:
Login del usuario

Auth0 -> Angular:
Devuelve sesión y tokens

Angular -> Backend C#:
GET /api/shipments
Authorization: Bearer <access_token>

Backend C# -> Auth0:
Valida firma pública / issuer / audience

Backend C#:
Busca el usuario por sub:
auth0|69a908d8e468fc38695ebf78

Backend C# -> Angular:
Devuelve datos de Conexion360
Qué debes revisar ahora
Tu token actual tiene:
"aud": "<AUTH0_CLIENT_ID>"

Eso apunta a la app SPA.
Para backend necesitas que el token tenga como aud el identifier de tu API Conexion360. Si todavía no existe esa API en Auth0, créala. Luego configuras Angular para pedir tokens con ese audience.
En resumen:
Sí, es JWT.
Cambia cada login porque debe cambiar.
Expira en 10 horas según tu captura.
Para backend C# no uses el token cuyo aud es el Client ID.
Crea una API en Auth0 para Conexion360 y pide el token con ese audience.
El backend valida ese JWT y luego busca el usuario en PostgreSQL por sub.


[Conexion360] Petición que el frontend enviaría al backend:
{
  method: "GET",
  url: "https://localhost:7001/api/auth/me",
  headers: {
    Authorization: "Bearer <mock-jwt>"
  },
  expectedValidation: {
    issuer: "https://dev-5lxfpxxjzz7ikezw.us.auth0.com/",
    audience: "https://api.conexion360.com"
  }
}
Y luego:
[Conexion360] Respuesta simulada del backend:
{
  status: 200,
  body: {
    id: "user-client",
    auth0UserId: "auth0|mock-correo@demo.com",
    name: "...",
    email: "...",
    company: "...",
    role: "CLIENT",
    isActive: true,
    permissions: [...]
  }
}


## Conexión social Google (evitar "Dev Keys")

Al abrir el Universal Login, el Dashboard de Auth0 muestra la alerta:

> **Dev Keys** — One or more of your connections are currently using Auth0 development keys and should not be used in production.

La causa es la conexión social **Google (`google-oauth2`)**, la que pinta el botón *Continue with Google*. Por defecto usa el `client_id`/`client_secret` de Google que Auth0 presta a todos los tenants para pruebas, en lugar de credenciales propias de Conexion360.

No es un problema del frontend: `provideAuth0()` en `src/app/app.config.ts` y los valores de `src/environments/environment.ts` son correctos. Se arregla en el Dashboard.

### Por qué hay que arreglarlo

- Rate limit compartido con todos los tenants de Auth0 → fallos intermitentes de login.
- La pantalla de consentimiento de Google muestra la marca de Auth0, no "Conexion360".
- No se emiten refresh tokens en la conexión social.
- No se pueden solicitar scopes adicionales de Google.
- Auth0 no soporta las dev keys en producción; pueden dejar de funcionar sin aviso.

### 1. Crear credenciales OAuth en Google Cloud Console

En https://console.cloud.google.com, dentro del proyecto de Conexion360:

**APIs & Services → OAuth consent screen**
- Tipo: **External** (o **Internal** si se usa Google Workspace corporativo).
- App name: `Conexion360`. Support email y developer contact email.
- Scopes: `openid`, `email`, `profile` (los mismos de `environment.auth0.scope`).

**APIs & Services → Credentials → Create Credentials → OAuth client ID**
- Application type: **Web application**. Name: `Auth0 - Conexion360`.
- Authorized JavaScript origins:
  ```
  https://dev-5lxfpxxjzz7ikezw.us.auth0.com
  ```
- Authorized redirect URIs:
  ```
  https://dev-5lxfpxxjzz7ikezw.us.auth0.com/login/callback
  ```

Si más adelante se configura un **custom domain** en Auth0 (ej. `auth.conexion360.com`), hay que añadir también ese origen y su `/login/callback`.

Guardar el **Client ID** y el **Client Secret** generados.

### 2. Pegar las credenciales en Auth0

En https://manage.auth0.com → **Authentication → Social → Google (`google-oauth2`)**:

1. Rellenar **Client ID** y **Client Secret**. Al hacerlo Auth0 deja de usar las dev keys automáticamente.
2. En **Permissions**, dejar solo `email` y `profile`.
3. En la pestaña **Applications**, verificar que la conexión sigue habilitada para la SPA de Conexion360 (la del `environment.auth0.clientId`).
4. **Save**.

> Las credenciales de Google se guardan **solo en el Dashboard de Auth0**. Nunca van a `.env` ni a `src/environments/environment.ts`: el frontend jamás debe ver el client secret.

### 3. Publicar la app de Google

Mientras la OAuth consent screen esté en modo **Testing**, solo entran los usuarios listados como test users y el consentimiento caduca cada 7 días. Para producción, pulsar **Publish app**. Con scopes básicos (`openid`, `email`, `profile`) Google no exige proceso de verificación.

### Verificación

1. La alerta **Dev Keys** desaparece al recargar el Dashboard de Auth0.
2. El login completa y redirige a `appUrl`; roles y perfil siguen resolviéndose vía `src/app/core/services/auth0-facade.service.ts`.
3. En **Auth0 → Monitoring → Logs** aparece un `Success Login` sin warnings de dev keys.
4. En https://myaccount.google.com/connections aparece la app con el nombre `Conexion360`.

### Account Linking: un usuario, no dos

Auth0 trata cada connection como un proveedor independiente, así que el mismo correo entrando por `Username-Password-Authentication` y por `google-oauth2` produce **dos usuarios con `sub` distinto**. Como `src/app/core/services/auth0-facade.service.ts` mapea `auth0UserId: auth0User.sub` y el backend busca en PostgreSQL por ese `sub`, sin vinculación se crean registros duplicados sin rol ni empresa.

La solución es el Action **"Account Linking Conexion360"**, cuyo código fuente está versionado en `auth0/actions/account-linking.js`. Vincula las identidades que comparten un correo **verificado**, dejando siempre como primaria la de base de datos (`auth0|...`), que es la que el backend ya conoce.

Requisitos en el Dashboard:

1. Una app **Machine to Machine** autorizada en *Auth0 Management API* con los scopes `read:users` y `update:users`.
2. En el Action, dependencia `auth0` (v4.x) y secretos `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`.
3. El Action debe ir **primero** en el flujo Post Login, antes de `roles` y de `Mostrar completar perfil Conexion360`.

Orden del flujo Post Login:

```
Start → Account Linking Conexion360 → Requiere correo verificado
      → Mostrar completar perfil Conexion360 → roles → Complete
```

El account linking va primero a propósito: si el usuario ya tiene una cuenta verificada con ese correo, primero se fusionan y entonces `email_verified` ya es `true`, así que no se le interrumpe.

> El editor de Actions de Auth0 no guarda historial. Cualquier cambio hecho allí debe reflejarse en `auth0/actions/`.

**Cuota de tokens M2M.** El plan actual incluye **1000 tokens Machine-to-Machine al mes** (aviso visible en *Applications → Account Linking M2M → Settings*). Cada token pedido a la Management API consume uno, así que el Action no puede pedirlo en cada login. Se controla con dos medidas:

1. Corte temprano si `event.user.identities.length > 1` — el usuario ya está vinculado y no hace falta ninguna llamada. Cubre la mayoría de los logins.
2. Caché del token en memoria del sandbox mientras siga vivo.

Si la cuota se agotara, el `try/catch` del Action se traga el fallo y **las cuentas dejarían de vincularse en silencio**. Conviene vigilar el consumo en producción y revisar los logs buscando `[account-linking]`.

### Verificación de correo: redirigir, no denegar

El Action `auth0/actions/require-verified-email.js` manda a `/verificar-correo` (en la propia app) a quien no haya confirmado el correo, usando `api.redirect.sendUserTo()` y pasando el correo como query param. La pantalla es `src/app/core/components/verify-email/`, con ruta declarada en `src/app/app.routes.ts` **fuera de `authGuard`** —el usuario llega sin sesión— y **antes de la ruta comodín `**`**, que si no la captura y redirige a `dashboard`.

La URL de retorno **no está fija en un secreto**: se toma de `event.transaction.redirect_uri`. La app corre en tres entornos contra un mismo tenant (local, GitHub Pages con base-href `/<repo>/`, y Nginx con base-href `/`), y `app.config.ts` envía `redirect_uri: appUrl`, que ya vale lo correcto en cada uno. Auth0 valida ese `redirect_uri` contra las *Allowed Callback URLs* antes de ejecutar el Action, así que el valor es de confianza.

Para que funcione, los tres entornos deben estar registrados en *Applications → Conexion360 → Settings*, en **Allowed Callback URLs**, **Allowed Logout URLs** y **Allowed Web Origins**. Auth0 compara por igualdad exacta y **no tolera diferencias en la barra final**, así que conviene registrar la URL de Pages en ambas variantes (con y sin `/`).

**No usar `api.access.deny(...)` para esto.** Se probó y rompió el auto-registro: la cuenta se creaba (`Success Signup`), el login siguiente se denegaba con un mensaje genérico, y al reintentar el registro Auth0 respondía *"The user already exists"*. Callejón sin salida. Redirigir informa en vez de bloquear a ciegas.

Las identidades sociales llegan siempre con `email_verified: true`, así que en la práctica esto solo afecta a los registros con contraseña.

Correo de verificación: Auth0 lo envía **automáticamente** al registrarse, siempre que *Branding → Email Templates → Verification Email (Link)* esté habilitado. El botón *Send Verification Email* del Dashboard es solo para reenviar. Conviene rellenar el campo **Redirect To** de esa plantilla con la URL de la app, para que el usuario aterrice en Conexion360 tras confirmar.

> Pendiente de producción: el tenant usa el proveedor de correo de Auth0, limitado a desarrollo y con entrega poco fiable (los correos caen en spam desde `auth0user.net`). Hay que configurar *Branding → Email Provider* con SendGrid, Mailgun, SES o SMTP propio. Todo el flujo de verificación —y el de recuperar contraseña— depende de que ese correo llegue.

### Textos del login: ojo con el idioma

El **Default Language** del tenant es **English**, pero la interfaz se ve en español porque los textos castellanos están escritos dentro del bloque de custom text del idioma `en` (*Branding → Universal Login → Advanced Options → Custom Text*).

Consecuencia: **toda clave que no se haya personalizado a mano cae al valor por defecto de Auth0, en inglés**. Así apareció "Something went wrong, please try again later" en mitad de una pantalla en español. Editar el bloque `es` no sirve de nada: nunca se usa.

Al tocar textos del login, seleccionar siempre **Language: English (en)**.

Pendiente: poner **Default Language: Spanish** en *Settings → General* y trasladar los textos al bloque `es`, para que los valores por defecto también salgan en español. La pestaña **Raw JSON** del editor permite copiar el bloque completo de un idioma a otro.

Claves relevantes del prompt `signup`, pantalla `signup`:

- `auth0-users-validation` — error genérico de registro fallido. Es el que se muestra cuando el correo ya existe y *"Use a generic response in public signup API error message"* (Settings → Advanced) está activado.
- `email-taken` — solo se muestra si se desactiva esa respuesta genérica, lo que revela qué correos están registrados y habilita la enumeración de usuarios. Se mantiene activada a propósito.

### Página de error del tenant: descartada

Universal Login usa transacciones de un solo uso. Pulsar «atrás» en el navegador durante el registro —por ejemplo en el formulario de completar perfil— la invalida, y Auth0 muestra su pantalla genérica *"Oops!, something went wrong"*. No se puede hacer que el botón «atrás» funcione.

Se puede sustituir esa pantalla por una propia, pero **se descartó**:

- El ajuste ya **no está en el Dashboard**; solo se configura por Management API (`error_page` en `PATCH /api/v2/tenants/settings`), lo que consume cuota M2M y exige el scope `update:tenant_settings`.
- La URL sería **única por tenant**, así que no puede adaptarse a los tres entornos como sí hace `require-verified-email.js` con `redirect_uri`. Desde local también redirigiría al entorno principal.
- El beneficio es puramente estético, sobre un error poco frecuente.

Si algún día se retoma, hacerlo con una app M2M aparte y de un solo uso, no con la del account linking.

### Foto de perfil: estado y diseño pendiente

**Mostrar una foto ya funciona.** La cadena está completa y no hay nada que construir para ello:

```
auth0User.picture  →  Auth0Identity.picture   (auth0-facade.service.ts)
                   →  AuthSession.user.picture (auth-session.service.ts)
                   →  <img class="user-menu__avatar">  (user-menu.html)
```

Las iniciales son solo el respaldo cuando `picture` viene vacío. Hoy viene vacío porque, tras el account linking, la identidad primaria es la de base de datos (`auth0|...`), que no trae foto; la de Google, que sí la tiene, quedó como secundaria.

**Resuelto con un Action:** `auth0/actions/profile-picture.js` publica la foto en el claim `https://conexion360.space/picture`, leyéndola de `event.user.identities[].profileData`. No llama a la Management API, así que no consume tokens M2M. El frontend le da prioridad sobre `auth0User.picture` en `auth0-facade.service.ts`.

Descarta las URLs de `s.gravatar.com` y `cdn.auth0.com/avatars`: Auth0 rellena con ellas el `picture` de las cuentas de base de datos, pero devuelven un avatar de iniciales. Si se dieran por buenas, nunca se llegaría a la foto real de Google.

La foto se muestra **independientemente de por dónde haya entrado el usuario**: con el account linking, ambas identidades son la misma persona, y un avatar que cambiara según el método de acceso resultaría desconcertante.

`user-menu.ts` cae a las iniciales si la imagen no carga (evento `error` del `<img>`), porque una URL remota siempre puede caducar o dejar de servirse. Guarda la URL fallida en lugar de un booleano, de modo que una foto nueva se reintente en vez de quedar descartada para siempre.

El `<img>` lleva `referrerpolicy="no-referrer"`. Sin él, `lh3.googleusercontent.com` responde **429 Too Many Requests**: Google limita con dureza las fotos de perfil pedidas desde otro origen cuando la petición envía referrer. El síntoma era un avatar que caía a iniciales sin motivo aparente.

> Depender de una URL de Google es frágil por diseño: puede caducar, limitarse o cambiar de formato. Cuando exista la subida propia contra el backend, la foto se servirá desde infraestructura propia y este problema desaparece.

**Subida de foto propia: decisión tomada, implementación pendiente.** Se guardará en el backend (`C:\TCCWebApiCore\Apis`), no en `user_metadata` de Auth0. Motivo: escribir metadata exige la Management API en cada cambio, y el plan solo incluye 1000 tokens M2M al mes.

Cuando llegue, **el Action no se retira**: la foto subida tendrá prioridad y la social quedará como respaldo, de modo que quien nunca suba una siga teniendo avatar en lugar de iniciales.

Lo que hace falta antes de empezar:

- **Endpoint de subida** en el backend (multipart), con validación del tipo real del archivo —no de la extensión— y límite de tamaño.
- **Almacenamiento** de la imagen y una URL servible; columna para ella en PostgreSQL.
- **Fetch de perfil en el frontend.** Es el cambio de fondo: hoy la sesión se construye **solo** con datos de Auth0 y la app no consulta al backend para el perfil. Habrá que introducir esa llamada y decidir la precedencia (foto propia por encima de la de Auth0).
- Decidir recorte/redimensionado (en cliente o servidor), caché de la URL y qué ocurre al eliminar la foto.

### Checklist para el despliegue a producción

El tenant actual (`dev-5lxfpxxjzz7ikezw`) es de desarrollo. Lo correcto es crear un tenant de producción aparte y replicar allí la configuración; así se puede romper dev sin afectar a los usuarios reales. Al hacerlo hay que revisar, en este orden:

**En Auth0 (tenant de producción)**

1. Crear la Application SPA y anotar su `clientId`.
2. **Allowed Callback URLs**, **Allowed Logout URLs** y **Allowed Web Origins** con el dominio real.
3. Conexión social **Google**: pegar Client ID y Secret (los del proyecto `conexion360-505322` sirven; hay que añadir las nuevas URIs en Google Cloud, ver más abajo).
4. Recrear los Actions de `auth0/actions/` y el flujo Post Login en el mismo orden.
5. Secreto `APP_URL` del Action *Requiere correo verificado* → URL real, sin barra final.
6. Secretos `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` del Action *Account Linking* → nueva app M2M de ese tenant, con `read:users` y `update:users`.
7. **Branding → Email Provider**: proveedor real (SendGrid, Mailgun, SES o SMTP). Sin esto, verificación y recuperación de contraseña son poco fiables.
8. **Email Templates → Verification Email → Redirect To**: URL de la app.
9. Custom Text del Universal Login: idioma por defecto y textos (ver la sección de idioma más arriba).

**En Google Cloud** (proyecto `conexion360-505322`)

10. *Clients → Auth0 - Conexion360*: añadir el origin y el redirect del nuevo tenant o custom domain, conservando los de dev.

**En el repositorio**

11. `src/environments/environment.ts`: `auth0.domain`, `auth0.clientId`, `appUrl`, `api.baseUrl`.
12. Secretos del pipeline en `.github/workflows/deploy.yml`.

> Alternativa si se mantiene un único tenant: guardar la URL en *Applications → Settings → Application Metadata* como `app_url` y leerla desde el Action con `event.client.metadata.app_url`, en lugar de usar el secreto `APP_URL`. Evita duplicar Actions, pero comparte usuarios y logs entre entornos.

### Por qué la pantalla de Google sigue diciendo "auth0.com"

Tras el cambio, el consentimiento de Google muestra **"Sign in to auth0.com"** y no "Conexion360". Es el comportamiento esperado y **no** indica que las dev keys sigan activas.

En el flujo simplificado de *Sign in with Google*, Google no muestra el `App name` configurado, sino el **dominio raíz del redirect URI**. Como el callback vive en `dev-5lxfpxxjzz7ikezw.us.auth0.com`, el dominio raíz es `auth0.com`. No puede mostrarse "Conexion360" porque ese dominio no nos pertenece y no puede verificarse como propio.

Para que el consentimiento muestre la marca propia hace falta un **custom domain en Auth0** (función de pago):

1. **Auth0 → Branding → Custom Domains** → configurar `auth.conexion360.com` y sus registros DNS.
2. **Google Cloud → Google Auth Platform → Branding → Authorized domains** → añadir `conexion360.com`, previa verificación de propiedad en Google Search Console.
3. **Google Cloud → Clients → Auth0 - Conexion360** → añadir el nuevo origin `https://auth.conexion360.com` y el redirect `https://auth.conexion360.com/login/callback` (conservando los antiguos hasta completar la migración).
4. Actualizar `environment.auth0.domain` en `src/environments/environment.ts` y los secretos del pipeline en `.github/workflows/deploy.yml`.
