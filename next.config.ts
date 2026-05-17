import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes desactivado a propósito: tenemos varios href dinámicos
  // (filtros, navegación por mes, etc.) que romperían con typed routes estricto.
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
