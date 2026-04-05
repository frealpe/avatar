import React from 'react'

const Dispositivos = React.lazy(() => import('./views/control/Dispositivos'))
const Monitor     = React.lazy(() => import('./views/monitor/Monitor'))
const Trayectorias = React.lazy(() => import('./views/control/Trayectorias'))
const Agent = React.lazy(() => import('./views/control/Agent'))
const Analitica = React.lazy(() => import('./views/analitica/Analitica'))
const Mediciones = React.lazy(() => import('./views/mediciones/principal'))

// Vistas Avatar Try-On
const HomeAvatar = React.lazy(() => import('./views/avatar/Home'))
const EscaneoAvatar = React.lazy(() => import('./views/avatar/Escaneo'))
const GeneracionAvatar = React.lazy(() => import('./views/avatar/Generacion'))
const ProbadorAvatar = React.lazy(() => import('./views/avatar/Probador'))

const routes = [
  {
    path: '/',
    name: 'Monitor',
    element: Monitor,
    exact: true,
  },
  {
    path: '/monitor',
    name: 'Monitor',
    element: Monitor,
    exact: true,
  },
  {
    path: '/trayectorias',
    name: 'Trayectorias',
    element: Trayectorias,
    exact: true,
  },
  {
    path: '/dispositivos',
    name: 'Dispositivos',
    element: Dispositivos,
    exact: true,
  },
  {
    path: '/agente',
    name: 'IA Agente',
    element: Agent,
    exact: true,
  },
  {
    path: '/analitica',
    name: 'Analítica',
    element: Analitica,
    exact: true,
  },
  {
    path: '/mediciones',
    name: 'Mediciones',
    element: Mediciones,
    exact: true,
  },
  { path: '/avatar', name: 'Home Avatar', element: HomeAvatar, exact: true },
  { path: '/avatar/escaneo', name: 'Escaneo Corporal 3D', element: EscaneoAvatar, exact: true },
  { path: '/avatar/generacion', name: 'Generación Avatar', element: GeneracionAvatar, exact: true },
  { path: '/avatar/probador', name: 'Probador 3D Virtual', element: ProbadorAvatar, exact: true }
]

export default routes
