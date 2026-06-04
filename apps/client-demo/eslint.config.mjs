import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ['.next/**', '.open-next/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
