import type { Preview } from '@storybook/nextjs-vite'
import '../src/styles/globals.css'

/** Custom viewports matching the three Vmarble breakpoints */
const VIEWPORTS = {
  mobile375: {
    name: 'Mobile (375px)',
    styles: { width: '375px', height: '812px' },
    type: 'mobile',
  },
  tablet768: {
    name: 'Tablet (768px)',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet',
  },
  desktop1280: {
    name: 'Desktop (1280px)',
    styles: { width: '1280px', height: '900px' },
    type: 'desktop',
  },
} as const

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: VIEWPORTS,
      defaultViewport: 'desktop1280',
    },
    a11y: {
      test: 'todo',
    },
  },
}

export default preview
