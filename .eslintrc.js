module.exports = {
  extends: ['./node_modules/sdu-react-scripts/config/eslint'], 
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        'selector': 'variable',
        'types': ['boolean'],
        'format': ['PascalCase'],
        'prefix': ['is', 'should', 'has', 'can', 'did', 'will']
      }
    ],
  }
}