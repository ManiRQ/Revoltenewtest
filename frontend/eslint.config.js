import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        crypto: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
