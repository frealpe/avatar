import React, { useState, useEffect, useRef } from 'react';
import { CCard, CCardBody, CCol, CRow, CButton, CBadge } from '@coreui/react-pro';
import { useSelector } from 'react-redux';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import iotApi from '../../service/iotApi';

// Componente Malla Anny (HMR Proxy) adaptativo
function AnnyHumanBody({ measurements, isTryingOn }) {
    const group = useRef();

    const heightScale = measurements ? measurements.height / 170 : 1;
    const widthScale = measurements ? measurements.chest / 90 : 1;
    const bodyColor = isTryingOn ? '#9D00FF' : '#00F2FF';

    // Animación idle leve
    useFrame((state) => {
        if (group.current && !isTryingOn) {
            group.current.position.y = (-2 * heightScale) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={group} position={[0, -2 * heightScale, 0]} scale={[widthScale, heightScale, widthScale]}>
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[1.2, 1.5, 0.6]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#00F2FF" />
            </mesh>
            <mesh position={[-0.3, 0.5, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 1.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0.3, 0.5, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 1.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[-0.8, 2, 0]} rotation={[0, 0, 0.2]}>
                <cylinderGeometry args={[0.15, 0.15, 1.2, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0.8, 2, 0]} rotation={[0, 0, -0.2]}>
                <cylinderGeometry args={[0.15, 0.15, 1.2, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
        </group>
    );
}

const ProbadorAvatar = () => {
    const avatarData = useSelector(state => state.avatarData) || {
        modelType: 'Demo Local Model',
        measurements: { height: 172, chest: 90, waist: 76 }
    };

    const [prendas, setPrendas] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [tryingOn, setTryingOn] = useState(false);
    const [wornClothId, setWornClothId] = useState(null);

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const data = await iotApi.getClothesCatalog();
                if (data && data.ok) {
                    setPrendas(data.data);
                }
            } catch (e) {
                console.error("Error fetching catalog", e);
            }
        };
        fetchCatalog();
    }, []);

    const handleTryOn = async () => {
        if (!selectedItem) return;
        setTryingOn(true);

        try {
            // Enviar al Backend (simular cloth simulation)
            await iotApi.tryOnClothes(avatarData._id || 'mock', selectedItem);
            setWornClothId(selectedItem);
        } catch (e) {
            console.error(e);
        } finally {
            setTryingOn(false);
        }
    };

    return (
        <CRow>
            {/* Panel Izquierdo - Catálogo */}
            <CCol md={4} className="mb-4">
                <CCard style={{ backgroundColor: '#161a1e', color: '#f8f9fe', border: 'none', height: '100%' }}>
                    <CCardBody>
                        <h5 className="mb-4" style={{ fontFamily: 'monospace', color: '#00F1FE' }}>Catálogo de Prendas</h5>
                        <div className="d-flex flex-column gap-3">
                            {prendas.map(prenda => (
                                <div
                                    key={prenda.id}
                                    onClick={() => setSelectedItem(prenda.id)}
                                    style={{
                                        backgroundColor: selectedItem === prenda.id ? '#1c2024' : '#101417',
                                        border: selectedItem === prenda.id ? '1px solid #00F1FE' : '1px solid #22262b',
                                        padding: '1.5rem',
                                        borderRadius: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <h6 className="mb-1">{prenda.name}</h6>
                                    <CBadge color="dark" shape="rounded-pill" style={{ backgroundColor: '#0b0e11' }}>{prenda.category}</CBadge>
                                    {wornClothId === prenda.id && <CBadge color="success" className="ms-2">Activo</CBadge>}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                            <CButton
                                onClick={handleTryOn} disabled={!selectedItem || tryingOn}
                                style={{ width: '100%', background: 'linear-gradient(135deg, #99f7ff 0%, #00f1fe 100%)', color: '#005f64', fontWeight: 'bold' }}
                            >
                                {tryingOn ? 'Interpolando IA...' : 'Renderizar Ropa'}
                            </CButton>
                        </div>
                    </CCardBody>
                </CCard>
            </CCol>

            {/* Panel Central - Visor 3D Web */}
            <CCol md={8}>
                <CCard style={{ backgroundColor: '#0b0e11', border: '1px solid #22262b', height: '100%', minHeight: '600px' }}>
                    <CCardBody style={{ padding: 0 }}>
                        <Canvas camera={{ position: [0, 0, 7], fov: 50 }} style={{ width: '100%', height: '100%', minHeight: '500px' }}>
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[10, 10, 10]} intensity={1.5} color="#00F2FF" />
                            <directionalLight position={[-10, 5, -10]} intensity={0.8} color="#9D00FF" />

                            <AnnyHumanBody
                                measurements={avatarData.measurements}
                                isTryingOn={wornClothId !== null}
                            />
                            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
                        </Canvas>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default ProbadorAvatar;
