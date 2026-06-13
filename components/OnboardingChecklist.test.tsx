import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { OnboardingChecklist } from './OnboardingChecklist';
import esMessages from '@/lib/i18n/messages/es.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/app/(app)/dashboard/onboardingActions', () => ({
  skipOnboarding: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

const GCAL_LINK = 'a[href="/settings#google-calendar"]';

afterEach(() => cleanup());

describe('OnboardingChecklist', () => {
  it('marca el paso de Google Calendar como pendiente cuando no está conectado', () => {
    const { container } = render(
      <OnboardingChecklist
        hasExpense={false}
        hasContact={false}
        hasReminder={false}
        googleCalendarConnected={false}
      />,
    );

    // El CTA para conectar Google Calendar está presente.
    expect(container.querySelector(GCAL_LINK)).not.toBeNull();
    expect(container.textContent).toContain(esMessages.onboarding.step4_title);
    expect(container.textContent).toContain('0/4');
  });

  it('marca el paso de Google Calendar como completo cuando está conectado', () => {
    const { container } = render(
      <OnboardingChecklist
        hasExpense={false}
        hasContact={false}
        hasReminder={false}
        googleCalendarConnected
      />,
    );

    // Paso completo: ya no se muestra el CTA de conexión.
    expect(container.querySelector(GCAL_LINK)).toBeNull();
    expect(container.textContent).toContain('1/4');
  });

  it('cuenta todos los pasos completados', () => {
    const { container } = render(
      <OnboardingChecklist
        hasExpense
        hasContact
        hasReminder
        googleCalendarConnected
      />,
    );

    expect(container.textContent).toContain('4/4');
    expect(container.textContent).toContain('100%');
  });
});
