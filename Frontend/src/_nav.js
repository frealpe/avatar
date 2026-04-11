import CIcon from '@coreui/icons-react'
import { cilUser, cil3d, cilObjectGroup, cilCart, cilSettings, cilLifeRing } from '@coreui/icons'
import { CNavItem } from '@coreui/react-pro'

const _nav = [
  {
    component: CNavItem,
    name: 'Mi Avatar',
    to: '/avatar/probador',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    materialIcon: 'person'
  },
  {
    component: CNavItem,
    name: 'Escáner 3D',
    to: '/avatar/escaneo',
    icon: <CIcon icon={cil3d} customClassName="nav-icon" />,
    materialIcon: 'view_in_ar'
  },
  {
    component: CNavItem,
    name: 'Medidas',
    to: '/avatar/medidas',
    icon: <CIcon icon={cilObjectGroup} customClassName="nav-icon" />,
    materialIcon: 'straighten'
  },
  {
    component: CNavItem,
    name: 'Laboratorio IA',
    to: '/avatar/laboratorio',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    materialIcon: 'science'
  },
  {
    component: CNavItem,
    name: 'Colección',
    to: '/avatar/coleccion',
    icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
    materialIcon: 'style'
  },
  {
    component: CNavItem,
    name: 'Ajustes',
    to: '/avatar/ajustes',

    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    materialIcon: 'settings'
  },
  {
    component: CNavItem,
    name: 'Soporte',
    to: '/support',
    icon: <CIcon icon={cilLifeRing} customClassName="nav-icon" />,
    materialIcon: 'help_outline'
  },
]

export default _nav
