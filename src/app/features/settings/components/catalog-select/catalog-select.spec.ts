import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CatalogOption } from '../../../../core/services/locale-catalog.service';
import { CatalogSelect } from './catalog-select';

describe('CatalogSelect', () => {
  let fixture: ComponentFixture<CatalogSelect>;

  const options: CatalogOption[] = [
    { value: 'America/Bogota', label: 'America/Bogota (UTC-5)' },
    { value: 'America/Mexico_City', label: 'America/Mexico City (UTC-6)' },
    { value: 'Europe/Madrid', label: 'Europe/Madrid (UTC+2)' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CatalogSelect, NoopAnimationsModule] }).compileComponents();

    fixture = TestBed.createComponent(CatalogSelect);
    fixture.componentRef.setInput('fieldLabel', 'Zona horaria');
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('selected', 'America/Bogota');
    fixture.detectChanges();
  });

  it('muestra la etiqueta de la opción seleccionada, no su código', async () => {
    await settle();

    expect(getField().value).toBe('America/Bogota (UTC-5)');
  });

  it('al enfocar ofrece todas las opciones', () => {
    // El cuadro ya trae escrita la opción actual: si eso contara como búsqueda,
    // el panel se abriría con un solo resultado.
    focusField();

    expect(getPanelLabels().length).toBe(3);
  });

  it('filtra por cualquier parte del texto, no solo por el principio', () => {
    typeIntoField('bogo');

    expect(getPanelLabels()).toEqual(['America/Bogota (UTC-5)']);
  });

  it('encuentra por huso horario', () => {
    typeIntoField('utc-6');

    expect(getPanelLabels()).toEqual(['America/Mexico City (UTC-6)']);
  });

  it('emite el código al elegir una opción', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.selectionChange.subscribe((value) => emitted.push(value));

    typeIntoField('madrid');
    clickFirstOption();
    await settle();

    expect(emitted).toEqual(['Europe/Madrid']);
    expect(getField().value).toBe('Europe/Madrid (UTC+2)');
  });

  it('mantiene la opción elegida al cerrarse el panel', async () => {
    // El input `selected` no cambia: si mandara él, la elección se revertiría
    // sola en cuanto se cierra el panel.
    typeIntoField('madrid');
    clickFirstOption();
    closePanel();
    await settle();

    expect(getField().value).toBe('Europe/Madrid (UTC+2)');
  });

  it('el clic sobre una opción filtrada sobrevive a la pérdida de foco', async () => {
    typeIntoField('madrid');

    // Pulsar sobre el panel quita el foco del cuadro antes de que termine el
    // clic. Si eso repusiera la lista completa, el nodo bajo el puntero
    // desaparecería y no se seleccionaría nada.
    getField().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(getPanelLabels()).toEqual(['Europe/Madrid (UTC+2)']);

    clickFirstOption();
    await settle();

    expect(getField().value).toBe('Europe/Madrid (UTC+2)');
  });

  it('restaura la etiqueta si se cierra el panel a medio escribir', async () => {
    typeIntoField('zzz');
    closePanel();
    await settle();

    expect(getField().value).toBe('America/Bogota (UTC-5)');
  });

  /**
   * `MatAutocompleteTrigger.writeValue` aplaza la escritura del cuadro a un
   * microtask, así que leer el `value` justo después de `detectChanges()` lo
   * encuentra vacío.
   */
  async function settle(): Promise<void> {
    await fixture.whenStable();
  }

  /** Lo que hace Material al pulsar fuera, con Escape o tras elegir una opción. */
  function closePanel(): void {
    fixture.debugElement.query(By.directive(MatAutocompleteTrigger)).injector.get(MatAutocompleteTrigger).closePanel();
    fixture.detectChanges();
  }

  function getField(): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  }

  function focusField(): void {
    getField().dispatchEvent(new Event('focusin'));
    fixture.detectChanges();
  }

  function typeIntoField(text: string): void {
    focusField();

    const field = getField();
    field.value = text;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** El panel del autocompletar se renderiza en el overlay, fuera del fixture. */
  function getPanelLabels(): string[] {
    return Array.from(document.querySelectorAll('mat-option')).map((option) => option.textContent?.trim() ?? '');
  }

  function clickFirstOption(): void {
    (document.querySelector('mat-option') as HTMLElement).click();
    fixture.detectChanges();
  }
});
