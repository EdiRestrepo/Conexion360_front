import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

import { CatalogOption, LocaleCatalogService } from '../../../../core/services/locale-catalog.service';

/**
 * Campo de catálogo con búsqueda al escribir.
 *
 * Un `<select>` nativo solo salta a la primera coincidencia de la inicial, que
 * con 418 zonas horarias es inservible. Aquí se escribe y se filtra por
 * cualquier parte del texto.
 *
 * Lo que se ve es la etiqueta (`America/Bogota (UTC-5)`) y lo que se emite es el
 * código (`America/Bogota`): esa distinción es la que permitirá guardar cuando
 * el backend exponga el endpoint, sin volver a tocar la pantalla.
 */
@Component({
  selector: 'app-catalog-select',
  imports: [MatAutocompleteModule, ReactiveFormsModule],
  templateUrl: './catalog-select.html',
  styleUrl: './catalog-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogSelect {
  private readonly catalog = inject(LocaleCatalogService);

  readonly fieldLabel = input.required<string>();
  readonly options = input.required<CatalogOption[]>();
  /** Código de la opción activa, no su etiqueta. */
  readonly selected = input('');
  readonly selectionChange = output<string>();

  /**
   * El control guarda la opción entera, no su texto: es lo que espera
   * `MatAutocomplete`, y `displayLabel` se encarga de que en pantalla se lea la
   * etiqueta. Mientras el usuario teclea, en cambio, el valor es el texto suelto.
   */
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly search = new FormControl<CatalogOption | string>('', { nonNullable: true });

  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' as CatalogOption | string });

  /**
   * Al enfocar, el cuadro trae escrita la opción actual. Si eso contara como
   * búsqueda, la lista se abriría filtrada a un solo elemento y no se podría
   * ver el resto: hasta que no se teclea, se muestran todas.
   */
  private readonly typing = signal(false);

  /**
   * La elección vive aquí, no en el input `selected`.
   *
   * `selected` solo siembra el valor inicial: la pantalla lo saca de una lectura
   * del backend y no vuelve a cambiarlo, así que tomarlo como única fuente hacía
   * que cualquier opción elegida se revirtiera sola al salir del campo.
   * `linkedSignal` da las dos cosas: se puede fijar desde aquí y vuelve a
   * sembrarse si el backend responde otro valor.
   */
  private readonly currentValue = linkedSignal(() => this.selected());

  protected readonly selectedOption = computed(
    () => this.options().find((option) => option.value === this.currentValue()) ?? null,
  );

  protected readonly visibleOptions = computed(() => {
    const value = this.query();

    return this.typing() && typeof value === 'string' ? this.catalog.filter(this.options(), value) : this.options();
  });

  /** Sin esto el cuadro mostraría `[object Object]` al elegir una opción. */
  protected readonly displayLabel = (option: CatalogOption | string | null): string =>
    typeof option === 'string' ? option : (option?.label ?? '');

  constructor() {
    // Un solo sitio decide lo que se lee en el cuadro: la opción vigente. Sirve
    // tanto para la siembra inicial como para reflejar lo que se acaba de elegir.
    effect(() => {
      this.showSelectedLabel();
    });
  }

  protected onFocus(input: HTMLInputElement): void {
    this.typing.set(false);
    // Seleccionar el texto hace que la primera tecla lo reemplace, en vez de
    // añadirse al final de `America/Bogota (UTC-5)`.
    input.select();
  }

  /**
   * Restaurar y reponer la lista se hace al cerrarse el panel, nunca en el
   * `blur`.
   *
   * Pulsar una opción quita el foco del cuadro ANTES de que el clic termine. Si
   * eso rehiciera la lista —de un resultado filtrado a las 418 zonas—, el nodo
   * bajo el puntero desaparecería entre el `mousedown` y el `mouseup`, y el clic
   * no llegaría a ninguna opción: justo el síntoma de que se elegía COP y
   * quedaba USD. Con tres idiomas la lista apenas cambiaba, y por eso ese campo
   * sí funcionaba.
   */
  protected onPanelClosed(): void {
    this.typing.set(false);
    this.showSelectedLabel();
    this.collapseSelection();
  }

  protected onInput(): void {
    this.typing.set(true);
  }

  protected onSelected(event: MatAutocompleteSelectedEvent): void {
    const option = event.option.value as CatalogOption;

    this.typing.set(false);
    this.currentValue.set(option.value);
    this.selectionChange.emit(option.value);
  }

  private showSelectedLabel(): void {
    this.search.setValue(this.selectedOption() ?? this.currentValue(), { emitEvent: false });
  }

  /**
   * Al enfocar se selecciona todo el texto para poder buscar de una tecla; una
   * vez elegida la opción, ese resaltado azul sobra. Va en un microtask porque
   * `MatAutocompleteTrigger` también aplaza su escritura del cuadro.
   */
  private collapseSelection(): void {
    queueMicrotask(() => {
      const input = this.field().nativeElement;

      input.setSelectionRange(input.value.length, input.value.length);
    });
  }
}
