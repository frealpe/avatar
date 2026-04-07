import React, { useState, useEffect, useRef, useContext, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';

function AvatarRealGLB({ url, measurements }) {
    const { scene } = useGLTF(url);
    const group = useRef();

    // Scale mesh metrically from sliders
    const heightScale = measurements ? measurements.height / 170 : 1;
    const widthScale = measurements ? measurements.chest / 90 : 1;

    useFrame((state) => {
        if (group.current) {
            group.current.position.y = (-1 * heightScale) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={group} position={[0, -1 * heightScale, 0]} scale={[widthScale, heightScale, widthScale]}>
            <primitive object={scene} />
        </group>
    );
}

// Componente Malla Anny (HMR Proxy) adaptativo
function AnnyHumanBody({ measurements, isTryingOn }) {
    const group = useRef();
    const heightScale = measurements ? measurements.height / 170 : 1;
    const widthScale = measurements ? measurements.chest / 90 : 1;
    const bodyColor = isTryingOn ? '#9D00FF' : '#00F2FF';

    useFrame((state) => {
        if (group.current && !isTryingOn) {
            group.current.position.y = (-1 * heightScale) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={group} position={[0, -1 * heightScale, 0]} scale={[widthScale, heightScale, widthScale]}>
            <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[1.2, 2.5, 0.6]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#00F2FF" />
            </mesh>
            <mesh position={[-0.3, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 2.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0.3, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 2.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
        </group>
    );
}

const DEFAULT_AVATAR = {
    modelType: 'ANNY_MODEL_01',
    measurements: { height: 184, chest: 102, waist: 78, hips: 94 }
};

const ProbadorAvatar = () => {
    const avatarData = useSelector(state => state.avatarData) || DEFAULT_AVATAR;

    const { socket } = useContext(SocketContext);

    // Memorizamos el estado inicial para evitar recreaciones
    const initialAvatar = useRef(avatarData);
    const [liveAvatar, setLiveAvatar] = useState(initialAvatar.current);
    const [prendas, setPrendas] = useState([]);
    const [tryingOn, setTryingOn] = useState(false);
    const [wornClothId, setWornClothId] = useState(null);

    // Sincronización segura con Redux (solo si el ID cambia)
    useEffect(() => {
        if (avatarData && avatarData._id !== liveAvatar?._id) {
            setLiveAvatar(JSON.parse(JSON.stringify(avatarData))); // Deep copy so we can edit
        }
    }, [avatarData?._id]);

    const handleMeasurementChange = (key, val) => {
        setLiveAvatar(prev => ({
            ...prev,
            measurements: {
                ...prev.measurements,
                [key]: parseFloat(val)
            }
        }));
    };

    useEffect(() => {
        if (!socket) return;
        const handleAvatarReady = (data) => {
            // Guarda de igualdad profunda básica para evitar bucle si los datos son idénticos
            if (JSON.stringify(data) === JSON.stringify(liveAvatar)) return;

            console.log('✨ [Socket] Nuevo avatar recibido:', data);
            setLiveAvatar(data);
        };
        socket.on('avatar:ready', handleAvatarReady);
        return () => socket.off('avatar:ready', handleAvatarReady);
    }, [socket, liveAvatar]); // Añadimos liveAvatar para la guarda de comparación

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const data = await iotApi.getClothesCatalog();
                if (data && data.ok) setPrendas(data.data);
            } catch (e) {
                console.error("Error fetching catalog", e);
            }
        };
        fetchCatalog();
    }, []);

    const handleTryOn = async (itemId) => {
        setTryingOn(true);
        try {
            await iotApi.tryOnClothes(liveAvatar._id || 'mock', itemId);
            setWornClothId(itemId);
        } catch (e) {
            console.error(e);
        } finally {
            setTryingOn(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden">

            {/* Body: Viewport + Parameters */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Viewport Section */}
                <section className="flex-1 relative blueprint-grid">
                    <div className="absolute top-10 left-10 z-20">
                        <span className="text-[8px] text-[#a9abaf] uppercase tracking-[0.4em] font-['Space_Grotesk']">Área de Visualización</span>
                        <h2 className="text-5xl font-black text-white/10 tracking-tighter uppercase pointer-events-none mt-2">Anny_m</h2>
                    </div>

                    {/* Floating Axis Selector */}
                    <div className="absolute top-10 right-10 z-20 w-32 h-32 bg-[#101417]/80 backdrop-blur-xl border border-[#45484c]/30 rounded-2xl p-4 shadow-2xl">
                        <div className="relative w-full h-full border border-[#45484c]/20 flex items-center justify-center">
                            <div className="absolute w-full h-[1px] bg-[#45484c]/20"></div>
                            <div className="absolute h-full w-[1px] bg-[#45484c]/20"></div>
                            <div className="w-3 h-3 rounded-full bg-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.8)]"></div>
                        </div>
                        <p className="text-[7px] text-[#00F2FF] text-right mt-2 uppercase tracking-widest font-['Space_Grotesk']">Pos: Eje-Z</p>
                    </div>

                    <div className="absolute inset-0 z-0">
                        <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} intensity={1.5} color="#00F2FF" />
                            <spotLight position={[-10, 10, 5]} intensity={0.5} color="#C47FFF" />

                            <Suspense fallback={null}>
                                {liveAvatar.meshUrl ? (
                                    <AvatarRealGLB url={liveAvatar.meshUrl} measurements={liveAvatar.measurements} />
                                ) : (
                                    <AnnyHumanBody measurements={liveAvatar.measurements} isTryingOn={wornClothId !== null} />
                                )}
                            </Suspense>

                            <OrbitControls enablePan={false} enableZoom={true} />
                        </Canvas>
                    </div>

                    {/* Bottom Overlays */}
                    <div className="absolute bottom-10 left-10 flex gap-10 items-end z-20">
                        <div>
                            <span className="text-[8px] text-[#00F2FF] uppercase tracking-[0.2em] font-['Space_Grotesk'] font-bold">Orientación</span>
                            <div className="flex gap-2 mt-3">
                                <div className="w-10 h-10 rounded-lg bg-[#101417]/80 border border-[#45484c]/30 flex items-center justify-center cursor-pointer hover:bg-[#00F2FF]/10 transition-all">
                                    <span className="material-symbols-outlined text-sm text-white">3d_rotation</span>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-[#101417]/80 border border-[#45484c]/30 flex items-center justify-center cursor-pointer hover:bg-[#00F2FF]/10 transition-all">
                                    <span className="material-symbols-outlined text-sm text-white">grid_view</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className="text-[8px] text-[#a9abaf] uppercase tracking-[0.2em] font-['Space_Grotesk'] font-bold">Puntos de Tensión</span>
                            <div className="flex gap-3 mt-3">
                                <div className="w-4 h-4 rounded-full bg-[#C47FFF] shadow-[0_0_10px_rgba(196,127,255,0.6)]"></div>
                                <div className="w-4 h-4 rounded-full bg-[#45484c]/50 border border-[#45484c]/20"></div>
                                <div className="w-4 h-4 rounded-full bg-[#45484c]/50 border border-[#45484c]/20"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Parameters Section */}
                <aside className="w-[420px] h-full bg-[#101417]/40 backdrop-blur-3xl border-l border-[#45484c]/10 p-10 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                            <h3 className="font-['Space_Grotesk'] text-xl font-black text-white uppercase tracking-tight">Parámetros Corporales</h3>
                            <p className="text-[8px] uppercase text-[#a9abaf] tracking-[0.2em] font-bold">Ajuste Métrico</p>
                        </div>
                        <span className="text-[9px] uppercase tracking-widest text-[#00F2FF] font-black cursor-pointer hover:underline">Restablecer</span>
                    </div>

                    <div className="flex-1 mt-10 space-y-10">
                        {[
                            { label: 'Altura (cm)', key: 'height', min: 140, max: 210 },
                            { label: 'Peso (kg)', key: 'weight', min: 40, max: 120 },
                            { label: 'Circunferencia Pecho', key: 'chest', min: 70, max: 130 },
                            { label: 'Ancho Cintura', key: 'waist', min: 50, max: 110 }
                        ].map(param => {
                            const val = liveAvatar.measurements?.[param.key] || param.min;
                            // Clamp percentage between 0 and 100
                            const percent = Math.min(Math.max(((val - param.min) / (param.max - param.min)) * 100, 0), 100);

                            return (
                                <div key={param.label} className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[11px] font-bold text-[#a9abaf] uppercase tracking-widest">{param.label}</label>
                                        <div className="px-3 py-1 rounded-md bg-[#1c2024] border border-[#45484c]/40">
                                            <span className="text-xs font-bold text-[#00F2FF] font-mono">{val.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <div className="relative h-4 w-full flex items-center">
                                        <div className="absolute inset-x-0 h-1.5 w-full bg-[#22262b] rounded-full pointer-events-none">
                                            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#8C00E5] to-[#00F2FF] rounded-full" style={{ width: `${percent}%` }}></div>
                                            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#00F2FF] shadow-[0_0_10px_rgba(0,242,255,0.8)] border-2 border-white pointer-events-none" style={{ left: `calc(${percent}% - 8px)` }}></div>
                                        </div>
                                        <input
                                            type="range"
                                            min={param.min} max={param.max} step="0.1"
                                            value={val}
                                            onChange={(e) => handleMeasurementChange(param.key, e.target.value)}
                                            className="opacity-0 w-full h-full cursor-pointer absolute inset-0 z-10"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-auto p-6 rounded-2xl bg-[#0b0e11]/60 border border-[#45484c]/20 flex gap-4 items-start">
                        <span className="material-symbols-outlined text-[#00F2FF] text-lg">info</span>
                        <p className="text-[10px] text-[#a9abaf] leading-relaxed">
                            Los cambios de peso ajustarán automáticamente la distribución de la masa en las extremidades para garantizar la precisión anatómica.
                        </p>
                    </div>
                </aside>
            </div>

            {/* Footer: Collection Carousel */}
            <footer className="h-64 bg-[#0b0e11] border-t border-[#45484c]/10 p-8 z-40">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] font-['Space_Grotesk']">Colección Actual: Neo-Refraction 2024</h4>
                    <div className="flex gap-4">
                        <span className="material-symbols-outlined text-sm text-[#a9abaf] cursor-pointer hover:text-white">west</span>
                        <span className="material-symbols-outlined text-sm text-white cursor-pointer">east</span>
                    </div>
                </div>

                <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
                    {[
                        { name: 'Pulse_Jacket', active: true, id: 101 },
                        { name: 'Void_Core_V2', active: false, id: 102 },
                        { name: 'Stratos_Pants', active: false, id: 103 },
                        { name: 'Holo_Tees', active: false, id: 104 },
                        { name: 'Light_Step_01', active: false, id: 105 },
                        { name: 'Cyber_Mesh', active: false, id: 106 }
                    ].map(item => (
                        <div key={item.id} className={`flex-shrink-0 w-48 h-32 rounded-2xl relative overflow-hidden group cursor-pointer transition-all ${item.active ? 'ring-2 ring-[#facd2e] ring-offset-4 ring-offset-[#0b0e11]' : 'opacity-60 hover:opacity-100'}`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${item.active ? 'from-[#facd2e]/20 to-transparent' : 'from-white/5 to-transparent'}`}></div>
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <div className={`w-32 h-32 bg-[radial-gradient(circle_at_50%_50%,${item.active ? '#facd2e30' : '#ffffff10'}_0%,transparent_70%)] absolute`}></div>
                                <span className="material-symbols-outlined text-4xl text-white/20 group-hover:text-white/40 transition-colors">checkroom</span>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <span className="text-[10px] font-bold text-white uppercase tracking-widest font-['Space_Grotesk']">{item.name}</span>
                            </div>
                            {item.active && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#00F2FF] shadow-[0_0_8px_rgba(0,242,255,1)]"></div>
                            )}
                        </div>
                    ))}
                </div>
            </footer>
        </div>


    );
};

export default ProbadorAvatar;
