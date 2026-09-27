import { FormControl } from '@angular/forms';

import { getControlErrorMessage, getVisibleErrorMessage, maliciousContentMessage } from './input-error-message';
import { inputRules } from './input-rules';
import { containsMaliciousContent, sanitizeQueryValue, validateText, validatorsFor } from './input-validators';

describe('input validators', () => {
  describe('containsMaliciousContent', () => {
    const malicious = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      'JaVaScRiPt :alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'x onload=alert(1)',
      '&#60;script&#62;',
      '&#x3C;script',
      'width: expression(alert(1))',
      '123>',
    ];

    for (const value of malicious) {
      it(`should flag "${value}"`, () => {
        expect(containsMaliciousContent(value)).toBeTrue();
      });
    }

    const legitimate = ['HBL-5U50FH61', 'Almacenes Éxito', 'Ruiz & Cía', 'Colombia / Perú', 'donation=10', 'Bogotá, D.C.'];

    for (const value of legitimate) {
      it(`should accept "${value}"`, () => {
        expect(containsMaliciousContent(value)).toBeFalse();
      });
    }
  });

  describe('validateText', () => {
    it('should report malicious content before any other error', () => {
      expect(validateText('<script>', inputRules.document)).toEqual({ maliciousContent: true });
    });

    it('should treat whitespace as empty for required rules', () => {
      expect(validateText('   ', inputRules.document)).toEqual({ required: true });
    });

    it('should allow empty values on optional rules', () => {
      expect(validateText('', inputRules.searchQuery)).toBeNull();
    });

    it('should measure length on the trimmed value', () => {
      expect(validateText('  123456789  ', inputRules.document)).toBeNull();
    });

    it('should reject values over the max length', () => {
      expect(validateText('1'.repeat(16), inputRules.document)).toEqual(
        jasmine.objectContaining({ maxlength: jasmine.objectContaining({ requiredLength: 15 }) }),
      );
    });

    it('should reject values under the min length', () => {
      expect(validateText('1234', inputRules.document)).toEqual(
        jasmine.objectContaining({ minlength: jasmine.objectContaining({ requiredLength: 5 }) }),
      );
    });

    it('should reject values with the wrong format', () => {
      expect(validateText('900123456-7', inputRules.document)).toEqual(
        jasmine.objectContaining({ pattern: jasmine.any(Object) }),
      );
      expect(validateText('Enka; DROP TABLE', inputRules.searchQuery)).toEqual(
        jasmine.objectContaining({ pattern: jasmine.any(Object) }),
      );
    });

    it('should accept accented search terms', () => {
      expect(validateText('Almacenes Éxito', inputRules.searchQuery)).toBeNull();
    });
  });

  describe('validatorsFor', () => {
    it('should add the email validator only to email rules', () => {
      const control = new FormControl('no-es-correo', { nonNullable: true, validators: validatorsFor(inputRules.email) });

      expect(control.hasError('email')).toBeTrue();
    });

    it('should validate the phone in E.164 format', () => {
      const control = new FormControl('3175766335', { nonNullable: true, validators: validatorsFor(inputRules.phone) });

      expect(control.hasError('pattern')).toBeTrue();

      control.setValue('+573175766335');
      expect(control.valid).toBeTrue();
    });
  });

  describe('sanitizeQueryValue', () => {
    it('should keep a valid value trimmed', () => {
      expect(sanitizeQueryValue('  China ', inputRules.searchQuery)).toBe('China');
    });

    it('should drop invalid or missing values', () => {
      expect(sanitizeQueryValue('<script>alert(1)</script>', inputRules.searchQuery)).toBe('');
      expect(sanitizeQueryValue('a'.repeat(51), inputRules.searchQuery)).toBe('');
      expect(sanitizeQueryValue(null, inputRules.searchQuery)).toBe('');
    });
  });

  describe('error messages', () => {
    function controlWith(value: string): FormControl<string> {
      return new FormControl(value, { nonNullable: true, validators: validatorsFor(inputRules.document) });
    }

    it('should use the CA03 text for malicious content', () => {
      expect(getControlErrorMessage(controlWith('<b>1</b>'), inputRules.document)).toBe(maliciousContentMessage);
      expect(maliciousContentMessage).toBe('La información ingresada no es válida.');
    });

    it('should explain each rule in Spanish', () => {
      expect(getControlErrorMessage(controlWith(''), inputRules.document)).toBe('Este campo es obligatorio.');
      expect(getControlErrorMessage(controlWith('1'.repeat(16)), inputRules.document)).toBe('Máximo 15 caracteres.');
      expect(getControlErrorMessage(controlWith('1234'), inputRules.document)).toBe('Mínimo 5 caracteres.');
      expect(getControlErrorMessage(controlWith('12a45'), inputRules.document)).toBe(inputRules.document.patternMessage);
      expect(getControlErrorMessage(controlWith('123456'), inputRules.document)).toBeNull();
    });

    it('should hide the message until the user interacts with the field', () => {
      const control = controlWith('');

      expect(getVisibleErrorMessage(control, inputRules.document)).toBeNull();

      control.markAsTouched();
      expect(getVisibleErrorMessage(control, inputRules.document)).toBe('Este campo es obligatorio.');
    });
  });
});
