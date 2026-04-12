import React from 'react'

// Vistas ETHÉREAL / Avatar Try-On
const Wearables = React.lazy(() => import('./views/wearables/Wearables'))
const HomeAvatar = React.lazy(() => import('./views/avatar/Home'))
const EscaneoAvatar = React.lazy(() => import('./views/avatar/Escaneo'))
const GeneracionAvatar = React.lazy(() => import('./views/avatar/Generacion'))
const ProbadorAvatar = React.lazy(() => import('./views/avatar/Probador'))
const LaboratorioIA = React.lazy(() => import('./views/avatar/LaboratorioIA'))
const AjustesPose = React.lazy(() => import('./views/avatar/AjustesPose'))
const ColeccionAvatar = React.lazy(() => import('./views/avatar/Coleccion'))
const Usuarios = React.lazy(() => import('./views/admin/Usuarios'))
const Proyectos = React.lazy(() => import('./views/admin/Proyectos'))
const Clientes = React.lazy(() => import('./views/admin/Clientes'))
const Operadores = React.lazy(() => import('./views/admin/Operadores'))

const routes = [
  {
    path: '/',
    name: 'Home',
    element: ProbadorAvatar,
    exact: true,
  },
  {
    path: '/admin/usuarios',
    name: 'Gestión de Usuarios',
    element: Usuarios,
    exact: true,
  },
  {
    path: '/admin/proyectos',
    name: 'Gestión de Proyectos',
    element: Proyectos,
    exact: true,
  },
  {
    path: '/admin/clientes',
    name: 'Cartera de Clientes',
    element: Clientes,
    exact: true,
  },
  {
    path: '/admin/operadores',
    name: 'Gestión de Operadores',
    element: Operadores,
    exact: true,
  },
  {
    path: '/wearables',
    name: 'Wearables Hub',
    element: Wearables,
    exact: true,
  },
  // Subrutas Avatar
  { path: '/avatar', name: 'Home Avatar', element: HomeAvatar, exact: true },
  { path: '/avatar/escaneo', name: 'Escaneo Corporal 3D', element: EscaneoAvatar, exact: true },
  { path: '/avatar/generacion', name: 'Generación Avatar', element: GeneracionAvatar, exact: true },
  { path: '/avatar/probador', name: 'Probador 3D Virtual', element: ProbadorAvatar, exact: true },
  { path: '/avatar/coleccion', name: 'Colección de Prendas', element: ColeccionAvatar, exact: true },
  { path: '/avatar/laboratorio', name: 'Laboratorio de IA Integrado', element: LaboratorioIA, exact: true },
  { path: '/avatar/ajustes', name: 'Ajustes de Pose', element: AjustesPose, exact: true }
]

export default routes
