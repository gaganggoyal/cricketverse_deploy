/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        pitch:     '#1e5c0e',
        'pitch-light': '#2d8a18',
        gold:      '#c9a84c',
        'gold-light': '#e8c96a',
        cream:     '#f5f0e8',
        dark:      '#0a0f0d',
        dark2:     '#111916',
        card:      '#141f17',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
