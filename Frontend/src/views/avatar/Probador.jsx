import React, { useState, useEffect, useRef, useContext, Suspense } from 'react';
import useStore from '../../store';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Stage } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';

// --- Componentes 3D ---
function AvatarRealGLB({ url, targetScale = [1, 1, 1] }) {
    const { scene } = useGLTF(url);
    const group = useRef();

    useFrame((state, delta) => {
        if (group.current) {
            group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;
            const lerpFactor = 0.1;
            group.current.scale.x += (targetScale[0] - group.current.scale.x) * lerpFactor;
            group.current.scale.y += (targetScale[1] - group.current.scale.y) * lerpFactor;
            group.current.scale.z += (targetScale[2] - group.current.scale.z) * lerpFactor;
        }
    });

    return (
        <group ref={group} position={[0, -1, 0]}>
            <primitive object={scene} />
        </group>
    );
}

function GarmentRealGLB({ url, targetScale = [1, 1, 1] }) {
    const { scene } = useGLTF(url);
    const group = useRef();

    useFrame((state, delta) => {
        if (group.current) {
            // Sincronizar posición con el avatar
            group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;

            // Sincronizar escala
            const lerpFactor = 0.1;
            group.current.scale.x += (targetScale[0] - group.current.scale.x) * lerpFactor;
            group.current.scale.y += (targetScale[1] - group.current.scale.y) * lerpFactor;
            group.current.scale.z += (targetScale[2] - group.current.scale.z) * lerpFactor;
        }
    });

    return (
        <group ref={group} position={[0, -1, 0]}>
            <primitive object={scene} />
        </group>
    );
}

function AnnyHumanBody({ measurements, targetScale = [1, 1, 1], isTryingOn }) {
    const group = useRef();
    const bodyColor = isTryingOn ? '#9D00FF' : '#00F2FF';

    useFrame((state) => {
        if (group.current) {
            const lerpFactor = 0.1;
            group.current.scale.x += (targetScale[0] - group.current.scale.x) * lerpFactor;
            group.current.scale.y += (targetScale[1] - group.current.scale.y) * lerpFactor;
            group.current.scale.z += (targetScale[2] - group.current.scale.z) * lerpFactor;

            if (!isTryingOn) {
                group.current.position.y = (-1 * group.current.scale.y) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
            }
        }
    });

    return (
        <group ref={group} position={[0, -1, 0]}>
            <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[1.2, 2.5, 0.6]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#00F2FF" />
            </mesh>
        </group>
    );
}

// --- Componente Principal ---
const ProbadorAvatar = () => {
    const avatarData = useStore(state => state.avatarData);
    const { socket } = useContext(SocketContext);

    const [liveAvatar, setLiveAvatar] = useState(avatarData || { meshUrl: null, measurements: null });
    const [posedMeshUrl, setPosedMeshUrl] = useState(null);
    const lastPosedBetas = useRef(null);

    const [prendas, setPrendas] = useState([]);
    const [wornClothId, setWornClothId] = useState(null);
    const [targetScale, setTargetScale] = useState([1, 1, 1]);

    // 1. Sincronización con LocalStorage al montar
    useEffect(() => {
        const savedBody = localStorage.getItem('modavatar_active_body');
        if (savedBody) {
            try {
                const parsed = JSON.parse(savedBody);
                setLiveAvatar(parsed);
                console.log("👗 [Probador] Modelo recuperado de memoria activa:", parsed.modelType);
            } catch (e) { console.error("Error cargando avatar guardado", e); }
        }
    }, []);

    // 2. Calcular escala inicial basada en biometría
    useEffect(() => {
        if (liveAvatar.measurements) {
            const h = liveAvatar.measurements.height / 170 || 1;
            const w = (liveAvatar.measurements.chest || 90) / 90 || 1;
            setTargetScale([w, h, w]);
        }
    }, [liveAvatar.measurements]);

    // Escuchar cambios en tiempo real vía Socket (Preview y Finalizado)
    useEffect(() => {
        if (!socket) return;

        const handleAvatarPreview = (data) => {
            if (data.betas) {
                const b = data.betas;
                const h = 1 + (b[0] * 0.05);
                const w = 1 + (b[1] * 0.05);
                setTargetScale([w, h, w]);
            }
        };

        const handleAvatarReady = (data) => {
            console.log('✨ [Socket] Modelo Finalizado:', data);
            setLiveAvatar(data);
            if (data.measurements) {
                const h = data.measurements.height / 170;
                const w = (data.measurements.chest || 90) / 90;
                setTargetScale([w, h, w]);
            }
        };

        socket.on('avatar:preview', handleAvatarPreview);
        socket.on('avatar:completed', handleAvatarReady);

        return () => {
            socket.off('avatar:preview', handleAvatarPreview);
            socket.off('avatar:completed', handleAvatarReady);
        };
    }, [socket]);

    // 3. Poseser Mi Avatar (Convertir T-Pose a Modeling solo para Probador)
    useEffect(() => {
        const poseMiAvatar = async () => {
            // Si no tiene betas (ej: es un modelo estático de catálogo), no posamos nosotros
            if (!liveAvatar.betas) {
                setPosedMeshUrl(null);
                return;
            }

            // Evitar re-posar si las betas no han cambiado significativamente
            const betasStr = JSON.stringify(liveAvatar.betas);
            if (lastPosedBetas.current === betasStr) return;

            console.log("👗 [Probador] Solicitando postura pasarela/natural para Mi Avatar...");
            try {
                const res = await iotApi.recalculateAvatar(liveAvatar.betas, 'neutral', 'modeling');
                if (res && res.ok) {
                    setPosedMeshUrl(res.meshUrl);
                    lastPosedBetas.current = betasStr;
                }
            } catch (e) {
                console.error("Error posando avatar", e);
            }
        };
        poseMiAvatar();
    }, [liveAvatar.betas]);

    // Resetear posedMeshUrl si cambiamos a un avatar sin betas (Catálogo)
    useEffect(() => {
        if (!liveAvatar.betas) setPosedMeshUrl(null);
    }, [liveAvatar.meshUrl]);

    // Cargar Catálogo
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const data = await iotApi.getClothesCatalog();
                if (data && data.ok) setPrendas(data.data);
            } catch (e) { console.error("Error fetching catalog", e); }
        };
        fetchCatalog();
    }, []);

    const handleTryOn = (itemId) => {
        setWornClothId(itemId);
        console.log(`👕 Probando prenda ID: ${itemId}`);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden font-['Inter']">

            {/* Main Viewport - pantalla completa sin sidebar */}
            <div className="flex-1 flex overflow-hidden relative">
                <section className="flex-1 relative blueprint-grid">
                    <div className="absolute top-10 left-10 z-20">
                        <span className="text-[8px] text-[#00f1fe] uppercase tracking-[0.4em] font-black">Intervención Neural / Vista Probador</span>
                        <h2 className="text-4xl font-black text-white/10 tracking-tighter uppercase pointer-events-none mt-2">
                            {liveAvatar.modelType || 'Avatar_Anny'}
                        </h2>
                    </div>

                    <div className="absolute inset-0 z-0">
                        <Canvas dpr={[1, 2]}>
                            <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={35} />
                            <ambientLight intensity={0.4} />
                            <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
                            <spotLight position={[-5, 5, 5]} intensity={0.5} angle={0.2} penumbra={1} color="#d800ff" />

                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                    {(posedMeshUrl || liveAvatar.meshUrl) ? (
                                        <>
                                            <AvatarRealGLB
                                                key={posedMeshUrl || liveAvatar.meshUrl}
                                                url={posedMeshUrl || liveAvatar.meshUrl}
                                                targetScale={targetScale}
                                            />
                                            {liveAvatar.prenda3D && (
                                                <GarmentRealGLB key={liveAvatar.prenda3D} url={liveAvatar.prenda3D} targetScale={targetScale} />
                                            )}
                                        </>
                                    ) : (
                                        <AnnyHumanBody measurements={liveAvatar.measurements} targetScale={targetScale} isTryingOn={wornClothId !== null} />
                                    )}
                                </Stage>
                            </Suspense>

                            <OrbitControls enablePan={false} enableZoom={true} minDistance={1.5} maxDistance={8} />
                        </Canvas>
                    </div>
                </section>
            </div>

            {/* Collection Carousel */}
            <footer className="h-64 bg-black/40 border-t border-white/5 p-8 z-40 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6 px-4">
                    <h4 className="text-[10px] font-black text-[#00f1fe]/50 uppercase tracking-[0.4em]">Colección: Neo-Refraction 2026</h4>
                    <div className="flex gap-4">
                        <span className="material-symbols-outlined text-sm text-gray-700">grid_view</span>
                        <span className="material-symbols-outlined text-sm text-gray-700">filter_list</span>
                    </div>
                </div>

                <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar px-4">
                    {prendas.length > 0 ? prendas.map(prenda => (
                        <div
                            key={prenda.id || prenda._id}
                            onClick={() => handleTryOn(prenda._id)}
                            className={`flex-shrink-0 w-56 h-36 rounded-3xl relative overflow-hidden group cursor-pointer border transition-all duration-500 ${wornClothId === prenda._id ? 'border-[#00f1fe] bg-[#00f1fe]/10 scale-95 shadow-[0_0_40px_rgba(0,241,254,0.1)]' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                        >
                            <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-5xl">apparel</span>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-black to-transparent">
                                <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{prenda.titulo}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[8px] text-gray-500 font-bold uppercase">{prenda.categoria || 'Concept'}</span>
                                    <span className="text-[8px] text-[#00f1fe] font-black">{prenda.talla || 'L'}</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-56 h-36 rounded-3xl bg-white/5 border border-white/10 animate-pulse"></div>
                        ))
                    )}
                </div>
            </footer>
        </div>
    );
};

export default ProbadorAvatar;
