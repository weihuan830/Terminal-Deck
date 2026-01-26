import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 导入 xterm 样式
import '@xterm/xterm/css/xterm.css';

// 注意: 禁用 StrictMode 以避免终端组件的双重初始化问题
// xterm.js 和 node-pty 等外部资源不适合 StrictMode 的双重渲染模式
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
