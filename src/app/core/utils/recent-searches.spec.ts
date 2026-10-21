import { MAX_RECENT_SEARCHES, clearRecentSearches, readRecentSearches, saveRecentSearches } from './recent-searches';

describe('recent-searches', () => {
  afterEach(() => {
    clearRecentSearches();
  });

  it('should read back what was saved', () => {
    saveRecentSearches(['MBL-F3ADTPRT', 'HBL-5U50FH61']);

    expect(readRecentSearches()).toEqual(['MBL-F3ADTPRT', 'HBL-5U50FH61']);
  });

  it('should keep at most the configured number of searches', () => {
    saveRecentSearches(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']);

    expect(readRecentSearches().length).toBe(MAX_RECENT_SEARCHES);
  });

  it('should return an empty list after clearing', () => {
    saveRecentSearches(['MBL-F3ADTPRT']);
    clearRecentSearches();

    expect(readRecentSearches()).toEqual([]);
  });

  // El almacén se puede editar desde las herramientas del navegador.
  it('should drop tampered or malformed values', () => {
    sessionStorage.setItem('c360.recent-searches', JSON.stringify(['MBL-OK', '<script>alert(1)</script>', 42, 'MBL-OK']));

    expect(readRecentSearches()).toEqual(['MBL-OK']);

    sessionStorage.setItem('c360.recent-searches', '{no es json');

    expect(readRecentSearches()).toEqual([]);
  });
});
