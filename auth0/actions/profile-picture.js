/**
 * Auth0 Post Login Action — "Foto de perfil Conexion360"
 *
 * Copia de control de versiones del Action que vive en el Dashboard de Auth0
 * (Actions -> Library -> Foto de perfil Conexion360). El editor de Auth0 no
 * guarda historial, así que cualquier cambio allí debe reflejarse aquí.
 *
 * Publica la foto de perfil como custom claim. Sin esto, en cuanto el account
 * linking hace primaria la identidad de base de datos, `picture` pasa a ser la
 * de esa cuenta —vacía o un gravatar genérico— y el avatar cae a las iniciales,
 * aunque el usuario tenga foto en su identidad de Google.
 *
 * Lee `event.user.identities[].profileData`, que Auth0 entrega ya resuelto en
 * el evento. NO llama a la Management API: no consume cuota de tokens M2M.
 *
 * Debe ir DESPUÉS de "Account Linking Conexion360", para que el array de
 * identidades incluya ya las que se acaben de vincular.
 *
 * Sin dependencias ni secretos.
 */

const PICTURE_CLAIM = 'https://conexion360.space/picture';

/**
 * Auth0 rellena `picture` de las cuentas de base de datos con un gravatar que
 * en realidad devuelve un avatar de iniciales. Es una foto solo de nombre: si
 * la damos por buena, nunca llegaríamos a la de Google, que sí es real.
 */
const isRealPicture = (url) =>
  typeof url === 'string' &&
  url.startsWith('https://') &&
  !url.includes('s.gravatar.com') &&
  !url.includes('cdn.auth0.com/avatars');

exports.onExecutePostLogin = async (event, api) => {
  const candidates = [
    event.user.picture,
    ...(event.user.identities ?? []).map((identity) => identity.profileData?.picture),
  ];

  const picture = candidates.find(isRealPicture);

  // Sin foto real no se emite el claim: el frontend ya cae a las iniciales.
  if (!picture) {
    return;
  }

  api.idToken.setCustomClaim(PICTURE_CLAIM, picture);
};
