import React from 'react'

const Dispositivos = React.lazy(() => import('./views/control/Dispositivos'))
const IotDashboard = React.lazy(() => import('./views/iot/Dashboard'))
const IotDeviceControl = React.lazy(() => import('./views/iot/DeviceControl'))
const AdminUsers = React.lazy(() => import('./views/admin/Users'))
const AdminServices = React.lazy(() => import('./views/admin/Services'))
const Monitor = React.lazy(() => import('./views/monitor/Monitor'))
const Trayectorias = React.lazy(() => import('./views/control/Trayectorias'))
const Agent = React.lazy(() => import('./views/control/Agent'))
const Analitica = React.lazy(() => import('./views/analitica/Analitica'))
const Mediciones = React.lazy(() => import('./views/mediciones/principal'))

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
  {
    path: '/iot/dashboard',
    name: 'IoT Dashboard',
    element: IotDashboard,
    exact: true,
  },
  {
    path: '/iot/control',
    name: 'IoT Control',
    element: IotDeviceControl,
    exact: true,
  },
  {
    path: '/admin/users',
    name: 'Users',
    element: AdminUsers,
    exact: true,
  },
  {
    path: '/admin/services',
    name: 'Services',
    element: AdminServices,
    exact: true,
  },
]

export default routes
