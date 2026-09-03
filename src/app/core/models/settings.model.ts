/**
 * Configuración global que devuelve `GET /settings/viewmaster`, aplanada: el
 * backend la agrupa en `generalParameters`, `location` y `system`, pero la
 * pantalla la muestra toda junta y no gana nada conservando la anidación.
 */
export interface MasterSettings {
  automaticTrackingUpdate: boolean;
  requireDocumentUpload: boolean;
  publicMonitoring: boolean;
  currency: string;
  language: string;
  timeZone: string;
  dataRetentionDays: number;
}
