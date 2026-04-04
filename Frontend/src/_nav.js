import CIcon from '@coreui/icons-react'
import { cilMonitor, cilDevices, cilGrid, cilChartLine, cilSpeedometer } from '@coreui/icons'
import { CNavItem } from '@coreui/react-pro'

const _nav = [
  {
    component: CNavItem,
    name: 'Monitor',
    to: '/monitor',
    icon: <CIcon icon={cilMonitor} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Trayectorias',
    to: '/trayectorias',
    icon: <CIcon icon={cilGrid} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Dispositivos',
    to: '/dispositivos',
    icon: <CIcon icon={cilDevices} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'IA Agente',
    to: '/agente',
    icon: <CIcon icon={cilGrid} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Analítica',
    to: '/analitica',
    icon: <CIcon icon={cilChartLine} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Mediciones',
    to: '/mediciones',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
]

export default _nav
