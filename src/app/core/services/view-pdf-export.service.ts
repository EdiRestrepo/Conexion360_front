import { Injectable } from '@angular/core';

import { fitImageToA4 } from '../utils/pdf-page-fit';

/** Atributo que marca los nodos que no deben salir en la captura (botones, avisos). */
export const pdfExcludeAttribute = 'data-pdf-exclude';

/**
 * Exporta un elemento visible de la pantalla como un PDF de una sola hoja A4,
 * con la captura como imagen.
 *
 * `html-to-image` y `jspdf` se cargan con `import()` solo al exportar: juntos
 * pesan varios cientos de kB y no tienen por qué ir en el bundle inicial.
 * Se usa `html-to-image` y no `html2canvas` porque deja el pintado al propio
 * navegador (vía SVG `foreignObject`), así que respeta `color-mix()` de
 * `styles.css`, las fuentes y los `<canvas>` de Chart.js.
 */
@Injectable({ providedIn: 'root' })
export class ViewPdfExportService {
  async exportElement(element: HTMLElement, fileName: string): Promise<void> {
    const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const image = await toJpeg(element, {
      quality: 0.92,
      pixelRatio: 2,
      backgroundColor: this.readBackgroundColor(),
      filter: (node) => !(node instanceof HTMLElement && node.hasAttribute(pdfExcludeAttribute)),
    });
    const fit = fitImageToA4(width, height);
    const pdf = new jsPDF({
      orientation: fit.orientation,
      unit: 'mm',
      format: 'a4',
    });

    pdf.addImage(image, 'JPEG', fit.x, fit.y, fit.width, fit.height);
    pdf.save(fileName);
  }

  /** El JPEG no admite transparencia: se rellena con el fondo de la app en vez de negro. */
  private readBackgroundColor(): string {
    const value = getComputedStyle(globalThis.document.documentElement).getPropertyValue('--color-background').trim();

    return value || 'white';
  }
}
