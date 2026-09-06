import { TestBed } from '@angular/core/testing';

import { CatalogOption, LocaleCatalogService } from './locale-catalog.service';

describe('LocaleCatalogService', () => {
  let service: LocaleCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocaleCatalogService);
  });

  it('arma las zonas horarias con su desfase actual', () => {
    const zones = service.timeZones();
    const bogota = zones.find((zone) => zone.value === 'America/Bogota');

    // Sin `Intl.supportedValuesOf` quedaría la lista de respaldo, que también la
    // incluye: la prueba vale en cualquiera de los dos caminos.
    expect(bogota).toBeDefined();
    expect(bogota?.label).toBe('America/Bogota (UTC-5)');

    // El desfase se calcula, no se escribe: por eso no puede afirmarse un valor
    // fijo para una zona con horario de verano, solo su forma.
    const madrid = zones.find((zone) => zone.value === 'Europe/Madrid');

    expect(madrid?.label).toMatch(/^Europe\/Madrid \(UTC[+-]\d+\)$/);
  });

  it('traduce los nombres de moneda al español', () => {
    const currencies = service.currencies();

    expect(currencies.find((currency) => currency.value === 'USD')?.label).toBe('USD - Dólar estadounidense');
    expect(currencies.find((currency) => currency.value === 'COP')?.label).toBe('COP - Peso colombiano');
  });

  it('ofrece los idiomas de la operación, no todos los que sabe nombrar Intl', () => {
    // La lista es corta a propósito: cada idioma añadido es una promesa de
    // traducción, así que se amplía cuando exista, no antes.
    expect(service.languages()).toEqual([
      { value: 'es', label: 'Español' },
      { value: 'en', label: 'Inglés' },
      { value: 'pt', label: 'Portugués' },
    ]);
  });

  it('reconoce las etiquetas que guarda hoy el backend', () => {
    expect(service.match(service.timeZones(), 'America/Bogota(UTC-5)')?.value).toBe('America/Bogota');
    expect(service.match(service.currencies(), 'USD - Dólar')?.value).toBe('USD');
    expect(service.match(service.languages(), 'Español')?.value).toBe('es');
  });

  it('reconoce el código directo, que es como debería guardarse', () => {
    expect(service.match(service.timeZones(), 'America/Bogota')?.value).toBe('America/Bogota');
    expect(service.match(service.currencies(), 'COP')?.value).toBe('COP');
  });

  it('devuelve null antes que adivinar', () => {
    const options: CatalogOption[] = [{ value: 'USD', label: 'USD - Dólar estadounidense' }];

    expect(service.match(options, 'Bitcoin')).toBeNull();
    expect(service.match(options, '')).toBeNull();
  });
});
