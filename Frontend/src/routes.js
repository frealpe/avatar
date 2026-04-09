import React from 'react'

// Vistas ETHÉREAL / Avatar Try-On
const Wearables = React.lazy(() => import('./views/wearables/Wearables'))
const HomeAvatar = React.lazy(() => import('./views/avatar/Home'))
const EscaneoAvatar = React.lazy(() => import('./views/avatar/Escaneo'))
const GeneracionAvatar = React.lazy(() => import('./views/avatar/Generacion'))
const ProbadorAvatar = React.lazy(() => import('./views/avatar/Probador'))
const LaboratorioIA = React.lazy(() => import('./views/avatar/LaboratorioIA'))
const AjustesPose = React.lazy(() => import('./views/avatar/AjustesPose'))

const routes = [
  {
    path: '/',
    name: 'Home',
    element: ProbadorAvatar,
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
  { path: '/avatar/laboratorio', name: 'Laboratorio de IA Integrado', element: LaboratorioIA, exact: true },
  { path: '/avatar/ajustes', name: 'Ajustes de Pose', element: AjustesPose, exact: true }
]


export default routes
