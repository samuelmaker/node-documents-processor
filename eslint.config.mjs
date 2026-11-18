export default [{
  files: ['**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    globals: Object.fromEntries(['window', 'document', 'fetch', 'crypto', 'console', 'require', 'module', '__dirname', 'process', 'Buffer', 'AbortSignal'].map(name => [name, 'readonly'])),
  },
  rules: { 'no-undef': 'error', 'no-unreachable': 'error' },
}];
