import { createRoot } from 'react-dom/client'
import 'core-js'
import 'cesium/Build/Cesium/Widgets/widgets.css';
import App from './App'
import { SocketProvider } from './context/SocketContext';
//import { SocketProvider } from '../../context/SocketContext';

createRoot(document.getElementById('root')).render(
  <SocketProvider>
    <App />
  </SocketProvider>,
)
