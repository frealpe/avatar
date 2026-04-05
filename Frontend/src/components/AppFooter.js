import React from 'react'
import { CFooter } from '@coreui/react-pro'

const AppFooter = () => {
  return (
    <CFooter className="px-4 py-0 d-flex align-items-center" style={{ height: '25px', minHeight: '25px', backgroundColor: 'transparent', border: 'none', color: '#a9abaf' }}>
      <div>
        <span className="ms-1">&copy; {new Date().getFullYear()} ETHÉREAL Systems</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Powered by Modavatar V-TryOn</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
