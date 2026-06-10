'use client';

import posthog from 'posthog-js';
import { PostHogProvider as Provider } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && KEY) {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    autocapture: {
      dom_event_allowlist: ['click', 'submit'],
      element_allowlist: ['a', 'button', 'form', 'input', 'select', 'textarea', 'label'],
      css_selector_allowlist: ['[data-attr]'],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    loaded: (ph: any) => {
      if (process.env.NODE_ENV === 'development') ph.debug();
    },
  });
}

export const PostHogProvider = ({ children }: { children: React.ReactNode }) => {
  if (!KEY) return <>{children}</>;
  return (
    <Provider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </Provider>
  );
};

const PageviewTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
};
