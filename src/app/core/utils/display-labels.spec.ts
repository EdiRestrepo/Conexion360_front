import {
  getOperationTypeLabel,
  getShipmentStatusLabel,
  getTransportModeLabel,
  getUserRoleLabel,
} from './display-labels';

describe('display labels', () => {
  it('should format operation, mode, status and role labels in Spanish', () => {
    expect(getOperationTypeLabel('IMPO')).toBe('Importación');
    expect(getTransportModeLabel('SEA')).toBe('Marítimo');
    expect(getShipmentStatusLabel('DESTINATION_CUSTOMS')).toBe('En Aduana destino');
    expect(getUserRoleLabel('ADMIN')).toBe('Administrador');
  });
});
