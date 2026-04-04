import React, { useEffect, useRef, useContext } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  useColorModes,
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import { cilContrast, cilMenu, cilMoon, cilSun, cilLanguage, cifGb, cifEs } from '@coreui/icons'

import { AppHeaderDropdown } from './header/index'
import { SocketContext } from '../context/SocketContext'


const AppHeader = () => {
  const headerRef = useRef()  // Crea una referencia para el encabezado

  // Hook para manejar el modo de color con un tema predeterminado
  const { colorMode, setColorMode } = useColorModes('coreui-pro-react-admin-template-theme-light')

  // Hook para traducción
  const { i18n, t } = useTranslation()

  const dispatch = useDispatch()  // Hook para enviar acciones a Redux
  const asideShow = useSelector((state) => state.asideShow)  // Obtiene el estado del aside
  const sidebarShow = useSelector((state) => state.sidebarShow)  // Obtiene el estado del sidebar

  useEffect(() => {
    // Agrega un evento para cambiar la sombra del header al hacer scroll
    document.addEventListener('scroll', () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    })
  }, [])  // Se ejecuta una sola vez al montar el componente

  const { online } = useContext(SocketContext)

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>  {/* Encabezado fijo con padding 0 */}
      <CContainer className="border-bottom px-4" fluid>  {/* Contenedor con borde inferior y padding horizontal */}

        {/* Botón para alternar la visibilidad del sidebar */}
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}  // Ajusta el margen izquierdo
        >
          <CIcon icon={cilMenu} size="lg" />  {/* Icono de menú */}
        </CHeaderToggler>
        <div className="d-flex align-items-center flex-wrap">
          <span className={`ms-3 fw-bold ${online ? 'text-success' : 'text-danger'}`}>
            🦋 Bionic Butterfly {online ? 'Online' : 'Offline'}
          </span>

        </div>
        
        {/* Barra de navegación dentro del encabezado */}
        <CHeaderNav className="ms-auto ms-md-0">
          {/* Separador vertical */}
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>

          {/* Menú desplegable para seleccionar el idioma */}
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>  {/* Botón sin flecha */}
              <CIcon icon={cilLanguage} size="lg" />  {/* Icono de idioma */}
            </CDropdownToggle>
            <CDropdownMenu>
              {/* Opción para cambiar a inglés */}
              <CDropdownItem
                active={i18n.language === 'en'}
                className="d-flex align-items-center"
                as="button"
                onClick={() => i18n.changeLanguage('en')}
              >
                <CIcon className="me-2" icon={cifGb} size="lg" /> English
              </CDropdownItem>
              
              {/* Opción para cambiar a español */}
              <CDropdownItem
                active={i18n.language === 'es'}
                className="d-flex align-items-center"
                as="button"
                onClick={() => i18n.changeLanguage('es')}
              >
                <CIcon className="me-2" icon={cifEs} size="lg" /> Español
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          {/* Menú desplegable para cambiar el modo de color */}
          <CDropdown variant="nav-item" placement="bottom-end">            
            <CDropdownToggle caret={false}>
              {/* Muestra el icono según el modo de color actual */}
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>

            <CDropdownMenu>
              {/* Opción para cambiar al modo claro */}
              <CDropdownItem
                active={colorMode === 'light'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('light')}
              >
                <CIcon className="me-2" icon={cilSun} size="lg" /> {t('light')}
              </CDropdownItem>

              {/* Opción para cambiar al modo oscuro */}
              <CDropdownItem
                active={colorMode === 'dark'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('dark')}
              >
                <CIcon className="me-2" icon={cilMoon} size="lg" /> {t('dark')}
              </CDropdownItem>
              
              {/* Opción para cambiar al modo automático */}
              <CDropdownItem
                active={colorMode === 'auto'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('auto')}
              >
                <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          {/* Separador vertical */}
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>

          {/* Menú de usuario */}
          <AppHeaderDropdown />
        </CHeaderNav>     
      </CContainer>
    </CHeader>
  )
}

export default AppHeader  // Exporta el componente para su uso en otros archivos
