import React, { useState, useEffect, useRef } from 'react';
import { CCard, CCardBody, CCol, CRow, CButton, CProgress, CFormSelect } from '@coreui/react-pro';
import { useNavigate } from 'react-router-dom';

const EscaneoAvatar = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Enumerar dispositivos de video disponibles
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Solicitar permisos inicialmente para obtener los nombres reales de las cámaras
                await navigator.mediaDevices.getUserMedia({ video: true });
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = deviceList.filter(device => device.kind === 'videoinput');

                setDevices(videoDevices);
                if (videoDevices.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
                setCameraError('');
            } catch (err) {
                console.error("Error enumerating devices: ", err);
                setCameraError("Permiso de cámara denegado o no soportado en esta red (usa localhost o HTTPS).");
            }
        };
        getDevices();

        // Cleanup al desmontar
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Iniciar stream de video cuando se selecciona una cámara
    useEffect(() => {
        const startStream = async () => {
            if (!selectedDeviceId) return;

            // Detener el streaming actual si existe
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedDeviceId } }
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setCameraError('');
            } catch (err) {
                console.error("Error starting camera stream: ", err);
                setCameraError("No se pudo iniciar la cámara. Verifica los permisos.");
            }
        };

        startStream();
    }, [selectedDeviceId]);

    const startScan = () => {
        setScanning(true);

        // Capturar la imagen justo cuando inicia
        let imageBase64 = null;
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            // Necesitamos invertirla porque el video tiene transform: scaleX(-1)
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        }

        let current = 0;
        const interval = setInterval(() => {
            current += 15;
            setProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    navigate('/avatar/generacion', { state: { imageBase64 } });
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

                        {/* Camera Selector (only show if multiple cameras available) */}
                        {devices.length > 1 && (
                            <div className="mb-3">
                                <CFormSelect
                                    value={selectedDeviceId}
                                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                                    style={{ backgroundColor: '#101417', color: '#00F1FE', border: '1px solid #22262b' }}
                                >
                                    {devices.map((device, index) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Cámara ${index + 1}`}
                                        </option>
                                    ))}
                                </CFormSelect>
                            </div>
                        )}

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
                            {/* Live Video Feed */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)', // Mirror effect
                                    opacity: scanning ? 0.3 : 1, // Dim when scanning
                                    transition: 'opacity 0.5s'
                                }}
                            />

                            {cameraError && (
                                <div style={{ position: 'absolute', zIndex: 20, textAlign: 'center', padding: '20px', backgroundColor: 'rgba(11,14,17,0.8)', color: '#ff716c', borderRadius: '10px' }}>
                                    <p className="mb-0"><strong>Error:</strong> {cameraError}</p>
                                </div>
                            )}

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
