/**
 * Auth0 Post Login Action — "Requiere correo verificado"
 *
 * Copia de control de versiones del Action que vive en el Dashboard de Auth0
 * (Actions -> Library -> Requiere correo verificado). El editor de Auth0 no
 * guarda historial, así que cualquier cambio allí debe reflejarse aquí.
 *
 * Impide entrar a la plataforma sin haber confirmado el correo, pero SIN
 * denegar el acceso: manda al usuario a `/verificar-correo` en la propia app,
 * donde se le explica qué hacer. Una versión anterior usaba `api.access.deny`
 * y convertía el registro en un callejón sin salida (la cuenta se creaba, el
 * login se denegaba con un mensaje genérico y reintentar el registro devolvía
 * "The user already exists"). Redirigir informa en vez de bloquear a ciegas.
 *
 * Las identidades sociales llegan con `email_verified: true`, así que este
 * Action solo afecta en la práctica a los registros con contraseña.
 *
 * Debe ir DESPUÉS de "Account Linking Conexion360": si el usuario ya tiene una
 * cuenta verificada con ese correo, primero conviene fusionarlas.
 *
 * Sin dependencias.
 * Secreto opcional: APP_URL, solo como respaldo (ver `resolveAppUrl`).
 */

/**
 * La app corre en tres sitios (local, GitHub Pages y Nginx) contra un único
 * tenant, así que la URL de retorno no puede estar fija en un secreto. Se toma
 * de la propia transacción: `app.config.ts` envía `redirect_uri: appUrl`, que
 * ya vale lo correcto en cada entorno.
 *
 * Es de confianza: Auth0 valida `redirect_uri` contra las Allowed Callback URLs
 * de la aplicación antes de ejecutar el Action.
 */
const resolveAppUrl = (event) => {
  const url = event.transaction?.redirect_uri || event.secrets.APP_URL;
  return url ? url.replace(/\/+$/, '') : null;
};

exports.onExecutePostLogin = async (event, api) => {
  if (event.user.email_verified === true) {
    return;
  }

  const appUrl = resolveAppUrl(event);

  // Sin URL de retorno no interrumpimos el login: dejar entrar a alguien sin
  // verificar es preferible a mandarlo a una página que no existe.
  if (!appUrl) {
    return;
  }

  api.redirect.sendUserTo(`${appUrl}/verificar-correo`, {
    query: { email: event.user.email },
  });
};
