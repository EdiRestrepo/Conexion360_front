import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SessionTimeoutChoice, SessionTimeoutDialog } from './session-timeout-dialog';

describe('SessionTimeoutDialog', () => {
  let fixture: ComponentFixture<SessionTimeoutDialog>;
  let closeSpy: jasmine.Spy<(result: SessionTimeoutChoice) => void>;
  const remainingSeconds = signal(47);

  beforeEach(async () => {
    closeSpy = jasmine.createSpy('close');
    remainingSeconds.set(47);

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, SessionTimeoutDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { remainingSeconds } },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionTimeoutDialog);
    fixture.detectChanges();
  });

  it('muestra la cuenta atrás en formato mm:ss', () => {
    expect(fixture.nativeElement.querySelector('.session-dialog__countdown').textContent.trim()).toBe('00:47');
  });

  it('refresca la cuenta atrás cuando avanza la señal', () => {
    remainingSeconds.set(5);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.session-dialog__countdown').textContent.trim()).toBe('00:05');
  });

  it('no muestra segundos negativos si la señal se pasa de cero', () => {
    remainingSeconds.set(-3);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.session-dialog__countdown').textContent.trim()).toBe('00:00');
  });

  it('cierra con «stay» al pulsar Seguir conectado', () => {
    clickButton('Seguir conectado');

    expect(closeSpy).toHaveBeenCalledWith('stay');
  });

  it('cierra con «logout» al pulsar Cerrar sesión', () => {
    clickButton('Cerrar sesión');

    expect(closeSpy).toHaveBeenCalledWith('logout');
  });

  function clickButton(label: string): void {
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((candidate) => candidate.textContent?.includes(label));

    button?.click();
  }
});
