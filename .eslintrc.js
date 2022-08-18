module.exports = {
  extends: ['./node_modules/@elseu/sdu-react-scripts-eslint', 'plugin:storybook/recommended'],
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    '@typescript-eslint/naming-convention': ['error', {
      'selector': 'variable',
      'types': ['boolean'],
      'format': ['PascalCase'],
      'prefix': ['is', 'should', 'has', 'can', 'did', 'will']
    }]
  }
};