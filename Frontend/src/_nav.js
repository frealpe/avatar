import CIcon from '@coreui/icons-react'
import { cilMonitor, cilDevices, cilGrid, cilChartLine, cilSpeedometer } from '@coreui/icons'
import { CNavItem } from '@coreui/react-pro'

const _nav = [
  {
    component: CNavItem,
    name: '--- ETHÉREAL ---',
    to: '#',
    disabled: true,
  },
  {
    component: CNavItem,
    name: 'Avatar 3D Home',
    to: '/avatar',
    icon: <CIcon icon={cilMonitor} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Scanner 3D',
    to: '/avatar/escaneo',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Probador Virtual',
    to: '/avatar/probador',
    icon: <CIcon icon={cilGrid} customClassName="nav-icon" />,
  },
]

export default _nav
