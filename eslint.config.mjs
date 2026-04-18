import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import storybook from 'eslint-plugin-storybook'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...storybook.configs['flat/recommended'],
  {
    ignores: ['storybook-static/**'],
  },
]

export default eslintConfig
