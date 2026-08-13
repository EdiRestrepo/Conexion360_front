/**
 * Auth0 Post Login Action — "Account Linking Conexion360"
 *
 * Copia de control de versiones del Action que vive en el Dashboard de Auth0
 * (Actions -> Library -> Account Linking Conexion360). El editor de Auth0 no
 * guarda historial, así que cualquier cambio allí debe reflejarse aquí.
 *
 * Vincula automáticamente las identidades que comparten un correo verificado,
 * de modo que un mismo usuario que entra por `Username-Password-Authentication`
 * o por `google-oauth2` conserve siempre el mismo `sub`. El backend busca al
 * usuario en PostgreSQL por ese `sub`, así que sin esto se crearían registros
 * duplicados sin rol ni empresa.
 *
 * Debe ser el PRIMER Action del flujo Post Login: los que van después (roles,
 * completar perfil) tienen que operar ya sobre la identidad primaria.
 *
 * SIN dependencias: llama a la Management API por HTTP con el `fetch` global de
 * Node 22. El SDK `auth0` cambia de superficie entre versiones mayores (la v6
 * eliminó `management.usersByEmail`) y este Action está en el camino crítico de
 * todos los logins; no conviene atarlo a eso.
 *
 * Secretos del Action: AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
 * (de una app M2M autorizada en Auth0 Management API con `read:users` y `update:users`).
 */

/**
 * Los tokens M2M están limitados por plan (1000/mes en el plan actual), así que
 * se reutilizan mientras sigan vivos. El sandbox de Actions puede reciclar el
 * proceso entre ejecuciones; cuando no lo hace, simplemente se pide otro.
 */
let cachedToken = null;

const getManagementToken = async (secrets) => {
  // Margen de 60 s para no usar un token que caduque a mitad de la petición.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(`https://${secrets.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: secrets.AUTH0_CLIENT_ID,
      client_secret: secrets.AUTH0_CLIENT_SECRET,
      audience: `https://${secrets.AUTH0_DOMAIN}/api/v2/`,
    }),
  });

  if (!response.ok) {
    throw new Error(`token ${response.status}: ${await response.text()}`);
  }

  const { access_token: accessToken, expires_in: expiresIn } = await response.json();
  cachedToken = { value: accessToken, expiresAt: Date.now() + expiresIn * 1000 };

  return accessToken;
};

exports.onExecutePostLogin = async (event, api) => {
  // 1. Sin correo verificado no se vincula nada. Sin esta comprobación
  // cualquiera podría registrarse con el correo ajeno y heredar la cuenta.
  if (!event.user.email || event.user.email_verified !== true) {
    return;
  }

  // 2. Si ya tiene más de una identidad, está vinculado: no hay nada que hacer.
  // Este corte evita la llamada a la Management API en la inmensa mayoría de
  // los logins, que es lo que mantiene el consumo de tokens M2M bajo control.
  if ((event.user.identities?.length ?? 1) > 1) {
    return;
  }

  // Un fallo vinculando no debe impedir entrar: en el peor caso el usuario
  // sigue con dos cuentas, que es molesto pero recuperable. Dejar a alguien
  // fuera de la plataforma por un 403 de la Management API no lo es.
  try {
    const domain = event.secrets.AUTH0_DOMAIN;
    const token = await getManagementToken(event.secrets);
    const authorization = { authorization: `Bearer ${token}` };

    // 3. Buscamos otras identidades con el mismo correo verificado.
    const search = await fetch(
      `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(event.user.email)}`,
      { headers: authorization },
    );

    if (!search.ok) {
      throw new Error(`users-by-email ${search.status}: ${await search.text()}`);
    }

    const sameEmail = await search.json();
    const candidates = sameEmail.filter(
      (user) => user.user_id !== event.user.user_id && user.email_verified === true,
    );

    // Sin coincidencias, o con más de una, no tocamos nada: ante la duda es
    // preferible dejar cuentas separadas que fusionar las equivocadas.
    if (candidates.length !== 1) {
      return;
    }

    // 4. La identidad de base de datos manda: es la que el backend ya conoce.
    const other = candidates[0];
    const currentIsDatabase = event.user.user_id.startsWith('auth0|');
    const primary = currentIsDatabase ? event.user : other;
    const secondary = currentIsDatabase ? other : event.user;

    // `user_id` viene como `proveedor|id`. El id puede contener `|`, así que
    // partimos solo por el primer separador.
    const separator = secondary.user_id.indexOf('|');
    const provider = secondary.user_id.slice(0, separator);
    const secondaryId = secondary.user_id.slice(separator + 1);

    const link = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(primary.user_id)}/identities`,
      {
        method: 'POST',
        headers: { ...authorization, 'content-type': 'application/json' },
        body: JSON.stringify({ provider, user_id: secondaryId }),
      },
    );

    if (!link.ok) {
      throw new Error(`link ${link.status}: ${await link.text()}`);
    }

    // 5. Si el login entró por la identidad secundaria, el resto del flujo y el
    // token deben emitirse como la primaria.
    if (!currentIsDatabase) {
      api.authentication.setPrimaryUser(primary.user_id);
    }
  } catch (error) {
    // Visible en Auth0 -> Monitoring -> Logs.
    console.log('[account-linking] fallo vinculando identidades:', error.message);
  }
};
