import CIcon from '@coreui/icons-react'
import { cilUser, cil3d, cilObjectGroup, cilCart, cilSettings, cilLifeRing } from '@coreui/icons'
import { CNavItem, CNavGroup, CNavTitle } from '@coreui/react-pro'

const _nav = [
  {
    component: CNavTitle,
    name: 'AVATAR IA',
  },
  {
    component: CNavItem,
    name: 'Mi Avatar',
    to: '/avatar/probador',
    materialIcon: 'face'
  },
  {
    component: CNavItem,
    name: 'Escáner 3D',
    to: '/avatar/escaneo',
    materialIcon: 'view_in_ar'
  },
  {
    component: CNavItem,
    name: 'Laboratorio IA',
    to: '/avatar/laboratorio',
    materialIcon: 'science'
  },
  {
    component: CNavTitle,
    name: 'CATÁLOGO',
  },
  {
    component: CNavItem,
    name: 'Colección',
    to: '/avatar/coleccion',
    materialIcon: 'style'
  },
  {
    component: CNavTitle,
    name: 'GESTIÓN DE LA PLATAFORMA',
  },
  {
    component: CNavItem,
    name: 'Usuarios',
    to: '/admin/usuarios',
    materialIcon: 'person'
  },
  {
    component: CNavItem,
    name: 'Clientes',
    to: '/admin/clientes',
    materialIcon: 'business'
  },
  {
    component: CNavItem,
    name: 'Proyectos',
    to: '/admin/proyectos',
    materialIcon: 'list_alt'
  },
  {
    component: CNavItem,
    name: 'Operadores',
    to: '/admin/operadores',
    materialIcon: 'corporate_fare'
  },
  {
    component: CNavTitle,
    name: 'SOPORTE Y CONFIGURACIÓN',
  },
  {
    component: CNavItem,
    name: 'Ajustes',
    to: '/avatar/ajustes',
    materialIcon: 'settings'
  },
  {
    component: CNavItem,
    name: 'Soporte',
    to: '/support',
    materialIcon: 'help_outline'
  },
]

export default _nav
