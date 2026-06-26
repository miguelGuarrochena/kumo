import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Reglas del React Compiler (eslint-plugin-react-hooks v6) que este código
      // —escrito sin React Compiler— no respeta y que marcan patrones legítimos
      // y muy extendidos. Las desactivamos; el resto de react-hooks se mantiene
      // (exhaustive-deps, rules-of-hooks, etc.).
      //  - set-state-in-effect: init desde localStorage, sync con sistemas externos.
      //  - static-components: render de <Icon/> donde Icon sale de un mapa de íconos.
      //  - purity: Date.now() en render para cálculos de display (días de trial, etc.).
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/purity': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'e2e/.auth/**',
    'playwright-report/**',
    'test-results/**',
    'coverage/**',
  ]),
]);
