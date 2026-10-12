export type PdfOrientation = 'portrait' | 'landscape';

export interface PdfPageFit {
  orientation: PdfOrientation;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Medidas de una hoja A4 en milímetros (lado corto × lado largo). */
export const a4PageMm = { short: 210, long: 297 } as const;

/**
 * Calcula cómo encajar una imagen en una única hoja A4 sin deformarla.
 *
 * La orientación sigue a la imagen (más ancha que alta → horizontal) para
 * aprovechar la hoja, y la imagen se escala hasta tocar el margen por el lado
 * que primero lo alcance; en el otro eje queda centrada.
 */
export function fitImageToA4(imageWidth: number, imageHeight: number, marginMm = 10): PdfPageFit {
  const orientation: PdfOrientation = imageWidth > imageHeight ? 'landscape' : 'portrait';
  const pageWidth = orientation === 'landscape' ? a4PageMm.long : a4PageMm.short;
  const pageHeight = orientation === 'landscape' ? a4PageMm.short : a4PageMm.long;
  const availableWidth = pageWidth - marginMm * 2;
  const availableHeight = pageHeight - marginMm * 2;
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    orientation,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}
