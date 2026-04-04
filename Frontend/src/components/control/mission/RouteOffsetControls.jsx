import React from 'react';
import { CCard, CCardBody, CButton, CFormCheck, CRow, CCol } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import {
    cilArrowTop, cilArrowBottom,
    cilArrowLeft, cilArrowRight,
    cilCaretTop, cilCaretBottom
} from '@coreui/icons';

const RouteOffsetControls = ({
    globalControl,
    setGlobalControl,
    handleRouteOffset,
    selectedSlaveIds = []
}) => {
    return (
        <div className="mb-3 border-bottom border-secondary pb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small text-muted fw-bold">Desplazamiento de Ruta</span>
                <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: '0.65rem', color: '#adb5bd' }}>
                        {globalControl ? 'Global' : 'Individual'}
                    </span>
                    <CFormCheck
                        switch
                        id="global-offset-check"
                        checked={globalControl}
                        onChange={() => setGlobalControl(!globalControl)}
                        className="m-0"
                    />
                </div>
            </div>

            {!globalControl && (
                <div className="mb-2 text-warning" style={{ fontSize: '0.65rem' }}>
                    Afectando a: {selectedSlaveIds.length > 0 ? `${selectedSlaveIds.length} seleccionado(s)` : 'Todos (ninguno seleccionado)'}
                </div>
            )}

            <CRow className="g-2 text-center align-items-center">
                {/* D-PAD Z / X */}
                <CCol xs={8}>
                    <div className="d-flex flex-column align-items-center gap-1">
                        {/* Adelante (-Z) */}
                        <CButton
                            color="secondary" size="sm" variant="outline" className="p-1"
                            style={{ width: '40px' }}
                            onClick={() => handleRouteOffset('z', -0.5)}
                            title="Adelante (-Z)"
                        >
                            <CIcon icon={cilArrowTop} />
                        </CButton>
                        <div className="d-flex gap-4">
                            {/* Izquierda (-X) */}
                            <CButton
                                color="secondary" size="sm" variant="outline" className="p-1"
                                style={{ width: '40px' }}
                                onClick={() => handleRouteOffset('x', -0.5)}
                                title="Izquierda (-X)"
                            >
                                <CIcon icon={cilArrowLeft} />
                            </CButton>
                            {/* Derecha (+X) */}
                            <CButton
                                color="secondary" size="sm" variant="outline" className="p-1"
                                style={{ width: '40px' }}
                                onClick={() => handleRouteOffset('x', 0.5)}
                                title="Derecha (+X)"
                            >
                                <CIcon icon={cilArrowRight} />
                            </CButton>
                        </div>
                        {/* Atrás (+Z) */}
                        <CButton
                            color="secondary" size="sm" variant="outline" className="p-1"
                            style={{ width: '40px' }}
                            onClick={() => handleRouteOffset('z', 0.5)}
                            title="Atrás (+Z)"
                        >
                            <CIcon icon={cilArrowBottom} />
                        </CButton>
                    </div>
                </CCol>

                {/* Altura / Y */}
                <CCol xs={4}>
                    <div className="d-flex flex-column align-items-center gap-2 h-100 justify-content-center border-start border-secondary">
                        <span style={{ fontSize: '0.65rem', color: '#adb5bd' }}>Altura</span>
                        <CButton
                            color="info" size="sm" variant="outline" className="p-1"
                            style={{ width: '40px' }}
                            onClick={() => handleRouteOffset('y', 0.5)}
                            title="Subir Ruta (+Y)"
                        >
                            <CIcon icon={cilCaretTop} />
                        </CButton>
                        <CButton
                            color="info" size="sm" variant="outline" className="p-1"
                            style={{ width: '40px' }}
                            onClick={() => handleRouteOffset('y', -0.5)}
                            title="Bajar Ruta (-Y)"
                        >
                            <CIcon icon={cilCaretBottom} />
                        </CButton>
                    </div>
                </CCol>
            </CRow>
        </div>
    );
};

export default RouteOffsetControls;
