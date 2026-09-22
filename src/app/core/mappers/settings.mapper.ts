import {
  NotificationSettings,
  UserNotificationPreferences,
  defaultNotificationPreferences,
} from '../models/notification.model';
import { JsonRecord, asRecord, getValue, readNumber, readOptionalBoolean } from './json-record.util';

/**
 * Traduce `GET /settings/viewnotifications`.
 *
 * Los nombres del backend describen el canal o el evento (`application`,
 * `changeState`); los del formulario describen lo que el usuario ve
 * (`inApp`, `shipmentStatusChanges`). Un campo que no venga cae en el valor por
 * defecto en vez de en `false`, para no apagar un aviso por una omisión.
 *
 * Los ids vuelven en el modelo porque son lo único que dice si el cliente ya
 * tiene configuración guardada; sin ellos no se puede elegir entre crear y
 * actualizar.
 */
export function mapNotificationSettingsResponse(response: unknown): NotificationSettings {
  const payload = readPayload(response);
  const channels = asRecord(getValue(payload, ['notificationChannels']));
  const events = asRecord(getValue(payload, ['notificationEvents']));

  return {
    channelId: readNumber(channels, ['notificationChannelId'], 0),
    eventId: readNumber(events, ['notificationEventId'], 0),
    preferences: {
      inApp: readOptionalBoolean(channels, ['application', 'inApp']) ?? defaultNotificationPreferences.inApp,
      email: readOptionalBoolean(channels, ['email']) ?? defaultNotificationPreferences.email,
      sms: readOptionalBoolean(channels, ['textMessages', 'sms']) ?? defaultNotificationPreferences.sms,
      shipmentStatusChanges:
        readOptionalBoolean(events, ['changeState']) ?? defaultNotificationPreferences.shipmentStatusChanges,
      delivery: readOptionalBoolean(events, ['successfulDelivery']) ?? defaultNotificationPreferences.delivery,
      delays: readOptionalBoolean(events, ['withIssues']) ?? defaultNotificationPreferences.delays,
      shipmentEnRoute:
        readOptionalBoolean(events, ['shipmentTransit']) ?? defaultNotificationPreferences.shipmentEnRoute,
      deliveryReminders:
        readOptionalBoolean(events, ['deliveryReminder']) ?? defaultNotificationPreferences.deliveryReminders,
    },
  };
}

/**
 * Arma el cuerpo de `POST /settings/createnotifications` y de
 * `PATCH /settings/updatenotifications`, que comparten el mismo
 * `CustomerNotificationsSettingsResponse`.
 *
 * Al crear los ids van en 0 —el backend los asigna—; al actualizar van los que
 * trajo `viewnotifications`, que es como el backend ubica las dos filas.
 */
export function mapNotificationSettingsRequest(
  preferences: UserNotificationPreferences,
  clientId: string,
  settings: Pick<NotificationSettings, 'channelId' | 'eventId'>,
): JsonRecord {
  return {
    notificationChannels: {
      clientId,
      notificationChannelId: settings.channelId,
      application: preferences.inApp,
      email: preferences.email,
      textMessages: preferences.sms,
    },
    notificationEvents: {
      clientId,
      notificationEventId: settings.eventId,
      changeState: preferences.shipmentStatusChanges,
      successfulDelivery: preferences.delivery,
      withIssues: preferences.delays,
      shipmentTransit: preferences.shipmentEnRoute,
      deliveryReminder: preferences.deliveryReminders,
    },
  };
}

/** El backend responde con la envoltura estándar `{ dataResponse: {...} }`. */
function readPayload(response: unknown): JsonRecord {
  const root = asRecord(response);
  const payload = getValue(root, ['dataResponse', 'DataResponse']) ?? root;

  return asRecord(Array.isArray(payload) ? payload[0] : payload);
}
