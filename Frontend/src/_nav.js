import CIcon from '@coreui/icons-react'
import { cilUser, cil3d, cilObjectGroup, cilCart, cilSettings, cilLifeRing } from '@coreui/icons'
import { CNavItem } from '@coreui/react-pro'

const _nav = [
  {
    component: CNavItem,
    name: 'My Avatar',
    to: '/avatar/probador',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    materialIcon: 'person'
  },
  {
    component: CNavItem,
    name: 'Scanner 3D',
    to: '/avatar/escaneo',
    icon: <CIcon icon={cil3d} customClassName="nav-icon" />,
    materialIcon: 'view_in_ar'
  },
  {
    component: CNavItem,
    name: 'Measurements',
    to: '/avatar/medidas',
    icon: <CIcon icon={cilObjectGroup} customClassName="nav-icon" />,
    materialIcon: 'straighten'
  },
  {
    component: CNavItem,
    name: 'Collection',
    to: '/avatar/biblioteca',
    icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
    materialIcon: 'style'
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    materialIcon: 'settings'
  },
  {
    component: CNavItem,
    name: 'Support',
    to: '/support',
    icon: <CIcon icon={cilLifeRing} customClassName="nav-icon" />,
    materialIcon: 'help_outline'
  },
]

export default _nav
