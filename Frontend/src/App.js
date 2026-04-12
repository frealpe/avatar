import React, { Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import useStore from './store'
import { AuthContext } from './context/AuthContext'
import { CSpinner, useColorModes } from '@coreui/react-pro'
import './scss/style.scss'
// We use those styles to show code examples, you should remove them in your application.
import './scss/examples.scss'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const Login = React.lazy(() => import('./views/login/Login'))

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes(
    'coreui-pro-react-admin-template-theme-light',
  )
  const storedTheme = useStore((state) => state.theme)
  const { isAuthenticated } = React.useContext(AuthContext)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HashRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          <Route exact path="/login" name="Login Page" element={<Login />} />
          <Route 
            path="*" 
            name="home" 
            element={isAuthenticated ? <DefaultLayout /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
