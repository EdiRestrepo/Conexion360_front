import { UserNotificationPreferences, defaultNotificationPreferences } from '../models/notification.model';
import { MasterSettings } from '../models/settings.model';
import { JsonRecord, asRecord, getValue, readNumber, readOptionalBoolean, readString } from './json-record.util';

/**
 * Traduce `GET /settings/viewnotifications`.
 *
 * Los nombres del backend describen el canal o el evento (`application`,
 * `changeState`); los del formulario describen lo que el usuario ve
 * (`inApp`, `shipmentStatusChanges`). Un campo que no venga cae en el valor por
 * defecto en vez de en `false`, para no apagar un aviso por una omisión.
 */
export function mapNotificationSettingsResponse(response: unknown): UserNotificationPreferences {
  const payload = readPayload(response);
  const channels = asRecord(getValue(payload, ['notificationChannels']));
  const events = asRecord(getValue(payload, ['notificationEvents']));

  return {
    inApp: readOptionalBoolean(channels, ['application', 'inApp']) ?? defaultNotificationPreferences.inApp,
    email: readOptionalBoolean(channels, ['email']) ?? defaultNotificationPreferences.email,
    sms: readOptionalBoolean(channels, ['textMessages', 'sms']) ?? defaultNotificationPreferences.sms,
    shipmentStatusChanges:
      readOptionalBoolean(events, ['changeState']) ?? defaultNotificationPreferences.shipmentStatusChanges,
    delivery: readOptionalBoolean(events, ['successfulDelivery']) ?? defaultNotificationPreferences.delivery,
    delays: readOptionalBoolean(events, ['withIssues']) ?? defaultNotificationPreferences.delays,
    shipmentEnRoute: readOptionalBoolean(events, ['shipmentTransit']) ?? defaultNotificationPreferences.shipmentEnRoute,
    deliveryReminders:
      readOptionalBoolean(events, ['deliveryReminder']) ?? defaultNotificationPreferences.deliveryReminders,
  };
}

/** Traduce `GET /settings/viewmaster` aplanando los tres grupos del backend. */
export function mapMasterSettingsResponse(response: unknown): MasterSettings {
  const payload = readPayload(response);
  const general = asRecord(getValue(payload, ['generalParameters']));
  const location = asRecord(getValue(payload, ['location']));
  const system = asRecord(getValue(payload, ['system']));

  return {
    automaticTrackingUpdate: readOptionalBoolean(general, ['automaticTrackingUpdate']) ?? false,
    requireDocumentUpload: readOptionalBoolean(general, ['requireDocumentUpload']) ?? false,
    publicMonitoring: readOptionalBoolean(general, ['publicMonitoring']) ?? false,
    currency: readString(location, ['currencyType', 'currency']),
    language: readString(location, ['language']),
    timeZone: readString(system, ['timeZone']),
    dataRetentionDays: readNumber(system, ['dataRetentionDays'], 0),
  };
}

/** Ambos endpoints responden con la envoltura estándar `{ dataResponse: {...} }`. */
function readPayload(response: unknown): JsonRecord {
  const root = asRecord(response);
  const payload = getValue(root, ['dataResponse', 'DataResponse']) ?? root;

  return asRecord(Array.isArray(payload) ? payload[0] : payload);
}
