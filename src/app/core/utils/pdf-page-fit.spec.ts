import { a4PageMm, fitImageToA4 } from './pdf-page-fit';

describe('fitImageToA4', () => {
  it('should use portrait for tall images and fill the available height', () => {
    const fit = fitImageToA4(1000, 2000, 10);

    expect(fit.orientation).toBe('portrait');
    expect(fit.height).toBeCloseTo(a4PageMm.long - 20);
    expect(fit.width).toBeCloseTo((a4PageMm.long - 20) / 2);
    expect(fit.y).toBeCloseTo(10);
  });

  it('should use landscape for wide images and center them vertically', () => {
    const fit = fitImageToA4(3000, 1000, 10);

    expect(fit.orientation).toBe('landscape');
    expect(fit.width).toBeCloseTo(a4PageMm.long - 20);
    expect(fit.y).toBeCloseTo((a4PageMm.short - fit.height) / 2);
  });

  it('should keep the aspect ratio of the image', () => {
    const fit = fitImageToA4(1140, 1420);

    expect(fit.width / fit.height).toBeCloseTo(1140 / 1420);
  });

  it('should keep the image inside the page margins', () => {
    const fit = fitImageToA4(1200, 1300, 10);

    expect(fit.x).toBeGreaterThanOrEqual(10 - 1e-9);
    expect(fit.y).toBeGreaterThanOrEqual(10 - 1e-9);
    expect(fit.x + fit.width).toBeLessThanOrEqual(a4PageMm.short - 10 + 1e-9);
    expect(fit.y + fit.height).toBeLessThanOrEqual(a4PageMm.long - 10 + 1e-9);
  });
});
