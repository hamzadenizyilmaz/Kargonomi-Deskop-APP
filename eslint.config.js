import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist-electron/**', 'dist-renderer/**', 'artifacts/**', 'setup/**', 'coverage/**', 'eslint.config.js', '*.config.ts'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    // Build helpers are plain Node.js modules outside the TypeScript project.
    files: ['scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { console: 'readonly' } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { project: ['./tsconfig.test.json'], tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
);
