import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
};

export default withSentryConfig(nextConfig, {
  org: 'maicolgua',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  // disableLogger y automaticVercelMonitors fueron deprecados — quedaron en webpack.*
  // y no funcionan con Turbopack. Los sacamos para evitar warnings.
});
