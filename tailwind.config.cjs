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
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        // 前景色
        'fg-primary': 'var(--fg-primary)',
        'fg-secondary': 'var(--fg-secondary)',
        'fg-muted': 'var(--fg-muted)',
        // 边框
        'border-color': 'var(--border-color)',
        'border-active': 'var(--border-active)',
        // 状态色
        'status-running': 'var(--status-running)',
        'status-idle': 'var(--status-idle)',
        'status-error': 'var(--status-error)',
        'status-exited': 'var(--status-exited)',
        // 强调色
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
      },
    },
  },
  plugins: [],
}
