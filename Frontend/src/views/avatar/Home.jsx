import React from 'react';
import { CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CBadge } from '@coreui/react-pro';
import { useNavigate } from 'react-router-dom';

const HomeAvatar = () => {
    const navigate = useNavigate();

    return (
        <CRow>
            <CCol xs={12}>
                <CCard className="mb-4" style={{ backgroundColor: '#0b0e11', color: '#f8f9fe', border: '1px solid #22262b' }}>
                    <CCardHeader style={{ backgroundColor: '#161a1e', borderBottom: '1px solid #22262b' }} className="d-flex justify-content-between align-items-center">
                        <h4 className="mb-0 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>ETHÉREAL Avatar 3D</h4>
                        <CBadge color="success" shape="rounded-pill" style={{ backgroundColor: '#00F2FF', color: '#0b0e11' }}>
                            Prototipo v1.0 Activo
                        </CBadge>
                    </CCardHeader>
                    <CCardBody style={{ padding: '3rem' }} className="text-center">

                        <h1 className="display-4 text-white font-weight-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            Digitaliza tu Presencia
                        </h1>
                        <p className="lead" style={{ color: '#a9abaf', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                            Escaneo de precisión sub-milimétrica para una experiencia de probador virtual sin precedentes impulsada por inteligencia artificial (TRELLIS 3D).
                        </p>

                        <div className="mb-5 d-flex justify-content-center gap-3">
                            <span className="badge" style={{ backgroundColor: '#101417', color: '#00e2ee', border: '1px solid #45484c', fontSize: '1rem', padding: '10px 15px' }}>
                                Servidor ✓
                            </span>
                            <span className="badge" style={{ backgroundColor: '#101417', color: '#00e2ee', border: '1px solid #45484c', fontSize: '1rem', padding: '10px 15px' }}>
                                Gradio API ✓
                            </span>
                            <span className="badge" style={{ backgroundColor: '#101417', color: '#00e2ee', border: '1px solid #45484c', fontSize: '1rem', padding: '10px 15px' }}>
                                Motor 3D ✓
                            </span>
                        </div>

                        <CButton
                            size="lg"
                            onClick={() => navigate('/avatar/escaneo')}
                            style={{
                                background: 'linear-gradient(135deg, #99f7ff 0%, #00f1fe 100%)',
                                color: '#005f64',
                                border: 'none',
                                padding: '1rem 3rem',
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                fontFamily: 'Space Grotesk, sans-serif',
                                boxShadow: '0 0 20px rgba(0, 242, 255, 0.4)',
                                borderRadius: '50px'
                            }}
                        >
                            Iniciar Escaneo 3D
                        </CButton>
                    </CCardBody>
                </CCard>
            </CCol>

            <CCol md={6}>
                <CCard style={{ backgroundColor: '#161a1e', color: '#f8f9fe', border: 'none' }}>
                    <CCardBody>
                        <h5>Modelos Activos</h5>
                        <div className="d-flex align-items-center mt-3 p-3" style={{ backgroundColor: '#101417', borderRadius: '12px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#22262b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                A
                            </div>
                            <div className="ms-3">
                                <h6 className="mb-0 text-white">Anny Model 01</h6>
                                <small style={{ color: '#a9abaf' }}>V-TRY ON READY • Precision: 98.4%</small>
                            </div>
                        </div>
                    </CCardBody>
                </CCard>
            </CCol>

            <CCol md={6}>
                <CCard style={{ backgroundColor: '#161a1e', color: '#f8f9fe', border: 'none' }}>
                    <CCardBody>
                        <h5>Catálogo de Pruebas</h5>
                        <ul className="list-unstyled mt-3">
                            <li className="mb-2 p-2" style={{ borderBottom: '1px solid #22262b' }}>Oversized Hoodie <small style={{ color: '#00e2ee', float: 'right' }}>Core Collection</small></li>
                            <li className="mb-2 p-2" style={{ borderBottom: '1px solid #22262b' }}>Tapered Denim <small style={{ color: '#00e2ee', float: 'right' }}>Essential Fit</small></li>
                            <li className="p-2">Puffer Jacket <small style={{ color: '#00e2ee', float: 'right' }}>Thermal Tech</small></li>
                        </ul>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default HomeAvatar;
