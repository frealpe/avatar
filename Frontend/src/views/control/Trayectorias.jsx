import React from 'react';
import { CContainer, CRow, CCol, CCard, CCardBody, CCardHeader } from '@coreui/react-pro';
import ThreeTrajectoryScene from '../../components/control/three/ThreeTrajectoryScene';

const Trayectorias = () => {
    return (
        <CContainer fluid className="p-0 overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
            <CRow className="h-100 g-0">
                <CCol xs={12} className="h-100">
                    <CCard className="h-100 border-0 rounded-0 shadow-none">
                        <CCardBody className="p-0 h-100">
                            <ThreeTrajectoryScene />
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </CContainer>
    );
};

export default Trayectorias;
