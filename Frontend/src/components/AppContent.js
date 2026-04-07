import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react-pro'
import routes from '../routes'

const AppContent = () => {
  return (
    <CContainer className="px-0 h-full d-flex flex-column" fluid style={{ flex: 1, minHeight: 'calc(100vh - 80px)' }}>
      <Suspense fallback={<div className="h-full flex items-center justify-center"><CSpinner color="primary" /></div>}>
        <Routes>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={<route.element />}
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="avatar/probador" replace />} />
          <Route path="*" element={<Navigate to="avatar/probador" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
