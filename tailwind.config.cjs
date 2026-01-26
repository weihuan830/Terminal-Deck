/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 背景色
        'bg-primary': '#1e1e1e',
        'bg-secondary': '#252526',
        'bg-tertiary': '#2d2d2d',
        'bg-hover': '#3c3c3c',
        'bg-active': '#094771',
        // 前景色
        'fg-primary': '#cccccc',
        'fg-secondary': '#858585',
        'fg-muted': '#6e6e6e',
        // 边框
        'border-color': '#3c3c3c',
        'border-active': '#007acc',
        // 状态色
        'status-running': '#89d185',
        'status-idle': '#6e6e6e',
        'status-error': '#f14c4c',
        'status-exited': '#cca700',
        // 强调色
        'accent-primary': '#007acc',
        'accent-secondary': '#0e639c',
      },
    },
  },
  plugins: [],
}
