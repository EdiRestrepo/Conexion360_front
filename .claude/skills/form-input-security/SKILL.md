---
name: form-input-security
description: Reglas obligatorias de validación y bloqueo de contenido malicioso (HU1 CA02 y CA03) para Conexion360. Usar SIEMPRE que se cree o modifique un formulario, un input, un textarea, un buscador, un FormControl/FormGroup, o un filtro que se lea de query params de la URL.
---

# Seguridad de formularios e inputs (HU1 – CA02 / CA03)

Aplica a todo campo en el que el usuario pueda escribir, y a todo valor que
llegue desde la URL (`queryParamMap`) y termine en un filtro o en una petición.

## Piezas compartidas (no duplicar)

| Archivo | Qué contiene |
|---|---|
| `src/app/core/utils/input-rules.ts` | `inputRules`: obligatoriedad, longitud máxima y mínima, patrón y mensaje de patrón por **tipo de campo** (`document`, `searchQuery`, `email`, `emailConfirmation`, `phone`). Es la única fuente de esos números. |
| `src/app/core/utils/input-validators.ts` | `validatorsFor(rule)` (lo que se pasa al `FormControl`), `validateText(value, rule)`, `containsMaliciousContent(value)` y `sanitizeQueryValue(value, rule)`. |
| `src/app/core/utils/input-error-message.ts` | `getVisibleErrorMessage(control, rule)`: el mensaje en español, o `null` si el usuario aún no tocó el campo. |

Si un tipo de campo nuevo no encaja en `inputRules`, se **agrega una entrada
ahí**, con su prueba. No se escriben `Validators.maxLength(50)` ni regex
sueltos en los componentes.

## Checklist por campo (CA02)

Cada `FormControl` de texto se declara con
`validators: validatorsFor(inputRules.X)`, que cubre de una vez:

1. **Obligatoriedad**: `required` de la regla (un valor de solo espacios
   cuenta como vacío). Los buscadores son opcionales.
2. **Tipo de dato**: el patrón de la regla (solo dígitos para documentos, E.164
   para teléfono, `Validators.email` para correo…) y el `type`/`inputmode`
   correcto en el HTML.
3. **Formato**: el patrón de la regla.
4. **Longitud máxima**: la de la regla, **y** además el atributo `maxlength`
   en el `<input>` con el mismo valor (`[attr.maxlength]="rule.maxLength"`).
   El atributo es solo ayuda de UX; el que cuenta es el validador.
5. **Contenido malicioso** (CA03): siempre incluido por `validatorsFor`.

Longitud y formato se evalúan sobre el valor recortado; al enviar, enviar
`value.trim()`.

Controles tipados sin texto libre (`checkbox`, `select` con opciones fijas) no
necesitan estas reglas, pero si su valor viene de la URL debe compararse contra
la lista blanca de valores permitidos antes de usarse.

## Rechazo y mensajes (CA02 / CA03)

- **Nunca enviar la petición con el control inválido.** En submit:
  `if (form.invalid) { form.markAllAsTouched(); return; }`.
- En buscadores con `valueChanges`: `filter(() => control.valid)` antes de
  navegar o consultar; el valor inválido no llega a la URL ni al backend.
- Los valores leídos de `queryParamMap` pasan por
  `sanitizeQueryValue(value, rule)`: si no cumplen, se tratan como vacíos.
- **No "limpiar" silenciosamente** el contenido malicioso: se rechaza y se
  muestra el mensaje. El usuario debe saber que su entrada no se aceptó.
- El mensaje sale de `getVisibleErrorMessage(control, rule)` (expuesto como
  getter en el componente). Para contenido malicioso el texto es exactamente
  **«La información ingresada no es válida.»** (CA03).
- Se muestra solo cuando el usuario ya tocó el campo (`dirty` o `touched`).

## Accesibilidad del error

```html
<input
  [formControl]="control"
  [attr.maxlength]="rule.maxLength"
  [attr.aria-invalid]="!!fieldError"
  [attr.aria-describedby]="fieldError ? 'campo-error' : null"
/>
@if (fieldError) {
  <span id="campo-error" class="field-error" role="alert">{{ fieldError }}</span>
}
```

`id` único por campo dentro de la vista. `.field-error` es global (`src/styles.css`). La lógica (qué mensaje, si hay error)
vive en el `.ts`, no en el HTML.

## Prohibido

- `[innerHTML]`, `bypassSecurityTrust*`, `ElementRef.nativeElement.innerHTML`
  o construir HTML con strings a partir de datos del usuario.
- `any` en validadores o mensajes.
- Afirmar en comentarios, UI o documentación que esto protege el backend: la
  validación en servidor (CA05) es responsabilidad de la API .NET.

## Pruebas obligatorias

- Regla o validador nuevo → casos en `input-validators.spec.ts` (válido, vacío, demasiado largo, formato incorrecto,
  `<script>`, `javascript:`, `onerror=`).
- Componente con formulario → al menos: valor malicioso muestra
  «La información ingresada no es válida.» y **no** llama al servicio;
  valor que excede `maxLength` no se envía; valor válido sí se envía.
- Ejecutar la suite completa (`npm test`), no solo el spec tocado.
