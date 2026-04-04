import React, { useContext, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer, cilSignalCellular4 } from '@coreui/icons'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react-pro'
import { AppSidebarNav } from './AppSidebarNav'
import { SocketContext } from '../context/SocketContext'


// sidebar nav config
import navigation from '../_nav'


import './AppSidebar.css'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { socket } = useContext(SocketContext)
  const [masterStatus, setMasterStatus] = useState({ online: false, rssi: -100, uptime: '00:00:00' })

  useEffect(() => {
    if (!socket) return

    const handler = (data) => {
      if (data.topic?.includes('master') && data.topic?.includes('status')) {
        setMasterStatus({
          online: data.data?.status === 'online',
          rssi: data.data?.rssi || -60, // Fallback if RSSI not in payload yet
          uptime: data.data?.uptime || '00:00:00'
        })
      }
    }

    socket.on('mqtt:message', handler)
    return () => socket.off('mqtt:message', handler)
  }, [socket])

  const getSignalColor = (rssi) => {
    if (rssi > -60) return 'success'
    if (rssi > -80) return 'warning'
    return 'danger'
  }

  return (
    <CSidebar
      className="custom-sidebar border-end"
      // style={{ height: '50vh' }} 
      colorScheme="light"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand as={NavLink} to="/dashboard" className="text-decoration-none">
           <div className="sidebar-brand-full">
             <CIcon icon={cilSpeedometer} height={24} className="me-2" />
             <div>
               <div>Controlador Vuelo</div>
             </div>
           </div>
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      
      <AppSidebarNav items={navigation} />

      <div className="sidebar-footer-custom">
        <div className="footer-status-row">
          <span>Master Gateway</span>
          <div className={`status-dot ${masterStatus.online ? 'bg-success' : 'bg-danger'}`}></div>
        </div>
        <div className="uptime-counter d-flex align-items-center justify-content-between">
          <span>Signal: {masterStatus.rssi} dBm</span>
          <CIcon icon={cilSignalCellular4} className={`text-${getSignalColor(masterStatus.rssi)}`} />
        </div>
        <div className="uptime-bar">
          <div 
            className={`uptime-progress bg-${getSignalColor(masterStatus.rssi)}`} 
            style={{ width: `${Math.max(0, 100 + masterStatus.rssi)}%` }}
          ></div>
        </div>
      </div>

      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
