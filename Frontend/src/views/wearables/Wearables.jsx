import React from 'react';
import { CCard, CCardBody, CCol, CRow } from '@coreui/react-pro';

const Wearables = () => {
    return (
        <CRow>
            <CCol xs={12}>
                <CCard style={{ backgroundColor: '#0b0e11', color: '#f8f9fe', border: '1px solid #22262b' }}>
                    <CCardBody>
                        <h4 className="mb-4" style={{ fontFamily: 'monospace', color: '#00F2FF' }}>Wearables Hub</h4>
                        <p style={{ color: '#a9abaf' }}>
                            Conecta, monitorea y administra tus dispositivos Vestibles Inteligentes, HUDs y ropa tecnológica
                            desde esta consola de control.
                        </p>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>

                            <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#161a1e', padding: '1.5rem', borderRadius: '12px', border: '1px solid #22262b' }}>
                                <h6 style={{ color: '#00f1fe' }}>Smart Wearable Badge</h6>
                                <p style={{ fontSize: '0.9rem', color: '#a9abaf' }}>Estado: Sincronizado</p>
                            </div>

                            <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#161a1e', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #22262b' }}>
                                <h6 style={{ color: '#a9abaf' }}>+ Añadir Nuevo Visor HUD</h6>
                                <p style={{ fontSize: '0.9rem', color: '#555' }}>Esperando emparejamiento Bluetooth...</p>
                            </div>

                        </div>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default Wearables;
