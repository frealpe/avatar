import React, { useEffect, useState } from 'react';
import { CCard, CCardBody, CCol, CRow, CButton, CSpinner } from '@coreui/react-pro';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';

const GeneracionAvatar = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [avatarData, setAvatarData] = useState(null);

    // Simular la captura local o descargar el generado por móvil
    useEffect(() => {
        const fetchOrGenerate = async () => {
            try {
                // Asumiendo que el usuario se escaneó en web, generamos un mock Anny post request
                const response = await axios.post('http://localhost:8080/api/avatar/generate', { imageBase64: 'web_session_dummy' });

                if (response.data.ok) {
                    const newAvatar = response.data.avatar;
                    setAvatarData(newAvatar);
                    dispatch({ type: 'SET_AVATAR', payload: newAvatar });
                }
            } catch (e) {
                console.error("Error generating avatar", e);
            } finally {
                setLoading(false);
            }
        };

        fetchOrGenerate();
    }, [dispatch]);

    return (
        <CRow className="justify-content-center">
            <CCol md={8} lg={6}>
                <CCard style={{ backgroundColor: '#0b0e11', color: '#f8f9fe', border: 'none', borderRadius: '24px' }}>

                    <div style={{ backgroundColor: '#161a1e', padding: '1.5rem', textAlign: 'center', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
                        <h5 style={{ fontFamily: 'monospace', color: '#00F1FE' }}>Generación de Avatar Anny</h5>
                        {!loading && <p className="mb-0" style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 'bold' }}>Avatar Sincronizado ✓</p>}
                    </div>

                    <CCardBody style={{ padding: '2rem' }} className="text-center">

                        {loading ? (
                            <div className="py-5">
                                <CSpinner style={{ width: '4rem', height: '4rem', color: '#00f1fe' }} />
                                <h5 className="mt-4 text-white">Extrayendo Feature Maps de Anny...</h5>
                                <p style={{ color: '#a9abaf' }}>Conectando con Backend Express</p>
                            </div>
                        ) : (
                            <>
                                <div
                                    style={{
                                        height: '250px', backgroundColor: '#101417', borderRadius: '16px',
                                        border: '1px solid #22262b', margin: '0 auto 2rem auto',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                                    }}
                                >
                                    <h6 style={{ color: '#00F2FF' }}>Avatar ID: {avatarData?._id}</h6>
                                    <p style={{ color: '#a9abaf' }}>El avatar vectorial se encuentra en memoria global y listo para usarse.</p>
                                </div>

                                <CRow className="mb-4 text-start">
                                    <CCol xs={6}>
                                        <div className="p-3" style={{ backgroundColor: '#161a1e', borderRadius: '12px' }}>
                                            <small style={{ color: '#a9abaf' }}>Altura Estimada</small>
                                            <h4 style={{ color: '#00f1fe', margin: 0 }}>{avatarData?.measurements?.height} cm</h4>
                                        </div>
                                    </CCol>
                                    <CCol xs={6}>
                                        <div className="p-3" style={{ backgroundColor: '#161a1e', borderRadius: '12px' }}>
                                            <small style={{ color: '#a9abaf' }}>Pecho</small>
                                            <h4 style={{ color: '#00f1fe', margin: 0 }}>{avatarData?.measurements?.chest} cm</h4>
                                        </div>
                                    </CCol>
                                    <CCol xs={6} className="mt-3">
                                        <div className="p-3" style={{ backgroundColor: '#161a1e', borderRadius: '12px' }}>
                                            <small style={{ color: '#a9abaf' }}>Cintura</small>
                                            <h4 style={{ color: '#00f1fe', margin: 0 }}>{avatarData?.measurements?.waist} cm</h4>
                                        </div>
                                    </CCol>
                                    <CCol xs={6} className="mt-3">
                                        <div className="p-3" style={{ backgroundColor: '#161a1e', borderRadius: '12px' }}>
                                            <small style={{ color: '#a9abaf' }}>Cadera / Pierna</small>
                                            <h4 style={{ color: '#00f1fe', margin: 0 }}>{avatarData?.measurements?.inseam} cm</h4>
                                        </div>
                                    </CCol>
                                </CRow>

                                <div className="d-grid gap-2">
                                    <CButton
                                        onClick={() => navigate('/avatar/probador')}
                                        style={{ background: 'linear-gradient(135deg, #99f7ff 0%, #00f1fe 100%)', color: '#005f64', fontWeight: 'bold', borderRadius: '12px' }}
                                    >
                                        Ir al Vestidor Virtual (Three.js) →
                                    </CButton>
                                </div>
                            </>
                        )}
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default GeneracionAvatar;
