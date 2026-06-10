'use client';

import { Toaster } from 'sonner';
import { useTheme } from '@/lib/theme';

export const ThemeToaster = () => {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      mobileOffset={{ top: 16, right: 16, left: 16 }}
      offset={{ top: 24, right: 24 }}
      richColors
      closeButton
      theme={resolvedTheme}
      visibleToasts={3}
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'kumo-toast',
          title: 'kumo-toast-title',
          description: 'kumo-toast-desc',
        },
      }}
    />
  );
};
