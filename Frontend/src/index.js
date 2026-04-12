import { createRoot } from 'react-dom/client'
import 'core-js'
import 'cesium/Build/Cesium/Widgets/widgets.css';
import App from './App'
import axios from 'axios'
import useStore from './store'
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
//import { SocketProvider } from '../../context/SocketContext';

// Interceptor de Axios para incluir el token en cada petición
axios.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token
    if (token) {
      config.headers['x-token'] = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor de respuesta para manejar errores de autenticación (401)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useStore.getState().setLogout()
    }
    return Promise.reject(error)
  }
)

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <SocketProvider>
      <App />
    </SocketProvider>
  </AuthProvider>,
)
