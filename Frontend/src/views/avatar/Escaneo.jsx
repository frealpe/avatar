import React, { useState } from 'react';
import { CCard, CCardBody, CCol, CRow, CButton, CProgress } from '@coreui/react-pro';
import { useNavigate } from 'react-router-dom';

const EscaneoAvatar = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);

    const startScan = () => {
        setScanning(true);
        let current = 0;
        const interval = setInterval(() => {
            current += 15;
            setProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    navigate('/avatar/generacion');
                }, 500);
            }
        }, 500);
    };

    return (
        <CRow className="justify-content-center">
            <CCol md={8} lg={6}>
                <CCard style={{ backgroundColor: '#0b0e11', color: '#f8f9fe', border: 'none', borderRadius: '24px', overflow: 'hidden' }}>

                    {/* Header */}
                    <div style={{ backgroundColor: '#161a1e', padding: '1.5rem', textAlign: 'center' }}>
                        <h5 style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#00F1FE' }}>Escaneo Corporal 3D</h5>
                        <p className="mb-0" style={{ color: '#a9abaf', fontSize: '0.9rem' }}>Paso 1/3 - Posición Frontal</p>
                    </div>

                    <CCardBody style={{ padding: '2rem' }}>

                        {/* Viewfinder / Camera Simulation */}
                        <div
                            style={{
                                height: '400px',
                                backgroundColor: '#101417',
                                borderRadius: '16px',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: scanning ? '2px solid #00F1FE' : '1px solid #22262b',
                                boxShadow: scanning ? '0 0 30px rgba(0, 242, 255, 0.2) inset' : 'none',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Fake Silhouette Overlay */}
                            <div style={{
                                position: 'absolute',
                                border: '2px dashed rgba(0, 242, 255, 0.4)',
                                width: '180px',
                                height: '350px',
                                borderRadius: '90px 90px 20px 20px',
                                opacity: scanning ? 0.8 : 0.4
                            }}></div>

                            {scanning && (
                                <div style={{
                                    position: 'absolute',
                                    top: `${100 - progress}%`,
                                    width: '100%',
                                    height: '4px',
                                    backgroundColor: '#00F2FF',
                                    boxShadow: '0 0 15px 5px rgba(0, 242, 255, 0.5)',
                                    transition: 'top 0.5s linear'
                                }}></div>
                            )}

                            {!scanning && <p className="mt-auto mb-4" style={{ color: '#f8f9fe', zIndex: 10 }}>Mantente recto, brazos separados del cuerpo</p>}
                            {scanning && <p className="mt-auto mb-4" style={{ color: '#00F2FF', zIndex: 10, fontWeight: 'bold' }}>Analizando con IA... {progress}%</p>}
                        </div>

                        {/* Actions */}
                        <div className="mt-4 text-center">
                            {!scanning ? (
                                <CButton
                                    onClick={startScan}
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: '2px solid #00f1fe',
                                        color: '#00f1fe',
                                        borderRadius: '50px',
                                        padding: '10px 40px',
                                        fontSize: '1.2rem',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', backgroundColor: '#00f1fe', borderRadius: '50%', marginRight: '10px' }}></span>
                                    Capturar Foto
                                </CButton>
                            ) : (
                                <CProgress className="mb-3" style={{ height: '10px', backgroundColor: '#161a1e' }}>
                                    <CProgress value={progress} style={{ backgroundColor: '#00f1fe', boxShadow: '0 0 10px rgba(0,242,255,0.8)' }} />
                                </CProgress>
                            )}
                        </div>

                        {/* Simulated Live Measurements */}
                        <div className="mt-4 d-flex justify-content-between" style={{ color: '#a9abaf', fontSize: '0.85rem' }}>
                            <div className="text-center">
                                <div>Altura</div>
                                <div style={{ color: scanning && progress > 20 ? '#00f1fe' : '#f8f9fe', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {scanning && progress > 20 ? '1.72m' : '---'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div>Pecho</div>
                                <div style={{ color: scanning && progress > 50 ? '#00f1fe' : '#f8f9fe', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {scanning && progress > 50 ? '92cm' : '---'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div>Cintura</div>
                                <div style={{ color: scanning && progress > 80 ? '#00f1fe' : '#f8f9fe', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {scanning && progress > 80 ? '76cm' : '---'}
                                </div>
                            </div>
                        </div>

                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default EscaneoAvatar;
