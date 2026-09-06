import { clearLastActivity, readLastActivity, writeLastActivity } from './idle-activity';

const lastActivityKey = 'c360.last-activity';

describe('idle-activity', () => {
  beforeEach(() => {
    localStorage.removeItem(lastActivityKey);
    clearLastActivity();
  });

  afterEach(() => {
    localStorage.removeItem(lastActivityKey);
    clearLastActivity();
  });

  it('escribe y lee la marca en localStorage', () => {
    writeLastActivity(1_700_000_000_000);

    expect(localStorage.getItem(lastActivityKey)).toBe('1700000000000');
    expect(readLastActivity()).toBe(1_700_000_000_000);
  });

  it('devuelve null cuando no hay marca', () => {
    expect(readLastActivity()).toBeNull();
  });

  it('trata una marca corrupta como ausente en vez de expulsar al usuario', () => {
    localStorage.setItem(lastActivityKey, 'no-es-un-numero');

    expect(readLastActivity()).toBeNull();
  });

  it('devuelve una marca futura tal cual: el servicio decide qué hacer con ella', () => {
    const future = Date.now() + 60_000;
    writeLastActivity(future);

    expect(readLastActivity()).toBe(future);
  });

  it('borra la marca', () => {
    writeLastActivity(Date.now());
    clearLastActivity();

    expect(localStorage.getItem(lastActivityKey)).toBeNull();
    expect(readLastActivity()).toBeNull();
  });

  it('no lanza cuando el almacenamiento está bloqueado y cae al respaldo en memoria', () => {
    writeLastActivity(1_700_000_000_000);
    spyOn(Storage.prototype, 'getItem').and.throwError('SecurityError');
    spyOn(Storage.prototype, 'setItem').and.throwError('QuotaExceededError');

    expect(() => writeLastActivity(1_700_000_001_000)).not.toThrow();
    expect(readLastActivity()).toBe(1_700_000_001_000);
  });
});
