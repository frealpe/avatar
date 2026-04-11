import React, { useState, useEffect, useRef, useContext, Suspense } from 'react';
import useStore from '../../store';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Stage } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';
import * as THREE from 'three';
import { useMemo } from 'react';

// --- Helpers ---
const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = iotApi.API_BASE || 'http://localhost:8080';
    let cleanUrl = url.replace(/\/\//g, '/');
    if (cleanUrl.startsWith('/api/') && (cleanUrl.includes('/patterns/') || cleanUrl.includes('/temp/') || cleanUrl.includes('/avatars/'))) {
        cleanUrl = cleanUrl.replace('/api/', '/');
    }
    return `${base}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

// --- Componentes 3D ---

function AvatarRealGLB({ url, targetScale = [1, 1, 1] }) {
    const group = useRef();
    // Validate url early
    if (!url) return null;

    // Preload to improve UX
    try {
        useGLTF.preload(url);
    } catch (e) {
        // ignore preload errors
    }

    const Inner = () => {
        const { scene } = useGLTF(url);
        useFrame((state) => {
            if (group.current) {
                group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;
                const lerpFactor = 0.1;
                group.current.scale.x += (targetScale[0] - group.current.scale.x) * lerpFactor;
                group.current.scale.y += (targetScale[1] - group.current.scale.y) * lerpFactor;
                group.current.scale.z += (targetScale[2] - group.current.scale.z) * lerpFactor;
            }
        });
    // El GLB en disco ya viene corregido; no aplicar rotación en runtime.
    return (<group ref={group} position={[0, -1, 0]} rotation={[0, 0, 0]}><primitive object={scene} /></group>);
    };

    return (
        <Suspense fallback={null}>
            <Inner />
        </Suspense>
    );
}

function GarmentRealGLB({ url, targetScale = [1, 1, 1] }) {
    const group = useRef();
    if (!url) return null;
    try { useGLTF.preload(url); } catch (e) {}

    const Inner = () => {
        const { scene } = useGLTF(url);
        useFrame((state) => {
            if (group.current) {
                group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;
                const lerpFactor = 0.1;
                group.current.scale.x += (targetScale[0] - group.current.scale.x) * lerpFactor;
                group.current.scale.y += (targetScale[1] - group.current.scale.y) * lerpFactor;
                group.current.scale.z += (targetScale[2] - group.current.scale.z) * lerpFactor;
            }
        });
    // El GLB en disco ya viene corregido; no aplicar rotación en runtime.
    return (<group ref={group} position={[0, -1, 0]} rotation={[0, 0, 0]}><primitive object={scene} /></group>);
    };

    return (
        <Suspense fallback={null}>
            <Inner />
        </Suspense>
    );
}

// Small Error Boundary to catch loader errors and avoid crashing the whole app
class GLBErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('GLB load error:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}

function AnnyHumanBody({ measurements, targetScale = [1, 1, 1], isTryingOn }) {
    const group = useRef();
    const bodyColor = isTryingOn ? '#9D00FF' : '#00F2FF';
    useFrame((state) => {
        if (group.current) {
            const lerpFactor = 0.1;
            group.current.scale.set(...targetScale);
            if (!isTryingOn) group.current.position.y = (-1 * group.current.scale.y) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });
    return (
        <group ref={group} position={[0, -1, 0]}>
            <mesh position={[0, 1.5, 0]}><boxGeometry args={[1.2, 2.5, 0.6]} /><meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent /></mesh>
            <mesh position={[0, 3.2, 0]}><sphereGeometry args={[0.4, 32, 32]} /><meshStandardMaterial color="#00F2FF" /></mesh>
        </group>
    );
}

// Lightweight PoseOverlay: draws joints & bones based on poseData (compatible with AjustesPose IKSkeleton)
function PoseOverlay({ poseData }) {
    const L = useMemo(() => ({ spine: 0.3, neck: 0.2, head: 0.15, shoulder: 0.2, uArm: 0.35, fArm: 0.35, thigh: 0.4, calf: 0.4, foot: 0.1 }), []);
    const getQ = (key) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...(poseData[key] || [0, 0, 0]), 'XYZ'));
    const rootP = new THREE.Vector3(0, 0.9, 0);
    const qHips = getQ('hips');
    const posSpine = rootP.clone().add(new THREE.Vector3(0, L.spine, 0).applyQuaternion(qHips));
    const qSpine = qHips.clone().multiply(getQ('spine'));
    const posNeck = posSpine.clone().add(new THREE.Vector3(0, L.neck, 0).applyQuaternion(qSpine));
    const qHead = qSpine.clone().multiply(getQ('head'));
    const posHead = posNeck.clone().add(new THREE.Vector3(0, L.head, 0).applyQuaternion(qHead));

    // Left arm
    const sL_Offset = new THREE.Vector3(L.shoulder, 0, 0).applyQuaternion(qSpine);
    const posSL = posNeck.clone().add(sL_Offset);
    const qSL = qSpine.clone().multiply(getQ('shoulder_l'));
    const posEL = posSL.clone().add(new THREE.Vector3(L.uArm, 0, 0).applyQuaternion(qSL));
    const qEL = qSL.clone().multiply(getQ('elbow_l'));
    const posHL = posEL.clone().add(new THREE.Vector3(L.fArm, 0, 0).applyQuaternion(qEL));

    // Right arm
    const sR_Offset = new THREE.Vector3(-L.shoulder, 0, 0).applyQuaternion(qSpine);
    const posSR = posNeck.clone().add(sR_Offset);
    const qSR = qSpine.clone().multiply(getQ('shoulder_r'));
    const posER = posSR.clone().add(new THREE.Vector3(-L.uArm, 0, 0).applyQuaternion(qSR));
    const qER = qSR.clone().multiply(getQ('elbow_r'));
    const posHR = posER.clone().add(new THREE.Vector3(-L.fArm, 0, 0).applyQuaternion(qER));

    const Line = ({ start, end, color = '#00f1fe' }) => (
        <line>
            <bufferGeometry attach="geometry" onUpdate={(g) => g.setFromPoints([new THREE.Vector3(...start), new THREE.Vector3(...end)])} />
            <lineBasicMaterial attach="material" color={color} linewidth={1} transparent opacity={0.85} />
        </line>
    );

    const Joint = ({ pos, color = 'white' }) => (
        <mesh position={pos}><sphereGeometry args={[0.04, 12, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} /></mesh>
    );

    return (
        <group rotation={[0, Math.PI, 0]} position={[0, -0.6, 0]}>
            <Line start={rootP.toArray()} end={posSpine.toArray()} />
            <Line start={posSpine.toArray()} end={posNeck.toArray()} />
            <Line start={posNeck.toArray()} end={posHead.toArray()} />

            <Line start={posNeck.toArray()} end={posSL.toArray()} />
            <Line start={posSL.toArray()} end={posEL.toArray()} />
            <Line start={posEL.toArray()} end={posHL.toArray()} />

            <Line start={posNeck.toArray()} end={posSR.toArray()} />
            <Line start={posSR.toArray()} end={posER.toArray()} />
            <Line start={posER.toArray()} end={posHR.toArray()} />

            <Joint pos={posHead.toArray()} />
            <Joint pos={posNeck.toArray()} />
            <Joint pos={posSL.toArray()} color={'#00f1fe'} />
            <Joint pos={posEL.toArray()} color={'#00f1fe'} />
            <Joint pos={posHL.toArray()} color={'#00f1fe'} />
            <Joint pos={posSR.toArray()} color={'#d800ff'} />
            <Joint pos={posER.toArray()} color={'#d800ff'} />
            <Joint pos={posHR.toArray()} color={'#d800ff'} />
        </group>
    );
}

// --- Componente Principal Probador ---
const ProbadorAvatar = () => {
    const avatarData = useStore(state => state.avatarData);
    const setAvatar = useStore(state => state.setAvatar);
    const { socket } = useContext(SocketContext);

    const [liveAvatar, setLiveAvatar] = useState(avatarData || { meshUrl: null, measurements: null });
    const [prendas, setPrendas] = useState([]);
    const [wornClothId, setWornClothId] = useState(null);
    const [targetScale, setTargetScale] = useState([1, 1, 1]);
    const [selectedCollection, setSelectedCollection] = useState(null);

    // 1. Cargar desde localStorage si el store está vacío (Persistencia)
    useEffect(() => {
        if (!avatarData) {
            const savedBody = localStorage.getItem('modavatar_active_body');
            if (savedBody) {
                try {
                    const parsed = JSON.parse(savedBody);
                    setAvatar(parsed);
                    setLiveAvatar(parsed);
                    console.log("🧬 [Probador] Avatar recuperado de localStorage");
                } catch (e) { console.error("Error parsing saved body:", e); }
            }
        }
    }, [avatarData, setAvatar]);

    // 2. Sincronizar con el store (por si venimos de Ajustes con una nueva pose)
    useEffect(() => {
        if (avatarData) setLiveAvatar(prev => ({ ...prev, ...avatarData }));
    }, [avatarData]);

    // Listener para previsualizaciones en tiempo real desde el Laboratorio (betas)
    useEffect(() => {
        if (!socket) return;

        const clamp = (v, a = 0.75, b = 1.35) => Math.max(a, Math.min(b, v));

        const handlePreview = (data) => {
            try {
                const betas = Array.isArray(data?.betas) ? data.betas : [];

                // METRIC CONFIG similar al Laboratorio: base + beta*delta
                const METRIC_CONFIG = {
                    0: { base: 170.0, delta: 7.0 }, // Estatura
                    1: { base: 72.0, delta: 6.0 },  // Peso
                    2: { base: 95.0, delta: 5.0 },  // Músculo (Pecho)
                    3: { base: 42.0, delta: 2.5 },  // Hombros
                    4: { base: 100.0, delta: 6.0 }, // Cadera
                };

                const measurements = {};
                for (let i = 0; i <= 4; i++) {
                    const b = betas[i] || 0;
                    if (METRIC_CONFIG[i]) measurements[['height','weight','chest','shoulders','hips'][i]] = parseFloat((METRIC_CONFIG[i].base + b * METRIC_CONFIG[i].delta).toFixed(1));
                }

                // Mapear betas a escalas para el render 3D (x, y, z). Y controla rangos razonables.
                const heightBeta = betas[0] || 0;
                const chestBeta = betas[2] || 0;
                const shoulderBeta = betas[3] || 0;

                // scaleY varía con la altura; scaleX/Z con el pecho y hombros
                const scaleY = clamp(1 + (heightBeta * 0.07), 0.8, 1.25);
                const scaleXZ = clamp(1 + (chestBeta * 0.03) + (shoulderBeta * 0.01), 0.8, 1.25);

                // Aplicar preview sin sobrescribir permanentemente el avatar guardado
                setLiveAvatar(prev => ({ ...prev, measurements: { ...prev.measurements, ...measurements }, betas }));
                setTargetScale([scaleXZ, scaleY, scaleXZ]);

            } catch (e) {
                console.error('Error procesando avatar:preview:', e);
            }
        };

        socket.on('avatar:preview', handlePreview);
        return () => { socket.off('avatar:preview', handlePreview); };
    }, [socket]);

    // Listener para previsualizaciones de POSE en tiempo real (desde AjustesPose)
    useEffect(() => {
        if (!socket) return;
        const handlePose = (data) => {
            try {
                if (!data || !data.poseData) return;
                // Simple: attach poseData to liveAvatar for UI/overlay. Not regenerating mesh here.
                setLiveAvatar(prev => ({ ...prev, poseData: data.poseData }));
            } catch (e) {
                console.error('Error procesando pose:preview:', e);
            }
        };
        socket.on('pose:preview', handlePose);
        return () => { socket.off('pose:preview', handlePose); };
    }, [socket]);



    const collections = prendas.reduce((acc, current) => {
        const cat = current.categoria || 'Sin Categoría';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(current);
        return acc;
    }, {});

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const data = await iotApi.getClothesCatalog();
                if (data && data.ok) setPrendas(data.data);
            } catch (e) { console.error(e); }
        };
        fetchCatalog();
    }, []);

    const handleTryOn = (itemId) => {
        setWornClothId(itemId);
        const selectedPrenda = prendas.find(p => p._id === itemId || p.id === itemId);
        setLiveAvatar(prev => ({ ...prev, prenda3D: selectedPrenda?.prenda3D || null }));
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden font-['Inter']">
            <div className="flex-1 flex overflow-hidden relative">
                <section className="flex-1 relative blueprint-grid">
                    <div className="absolute top-10 left-10 z-20">
                        <span className="text-[8px] text-[#00f1fe] uppercase tracking-[0.4em] font-black">Virtual Fitting Room / Probador</span>
                        <h2 className="text-4xl font-black text-white/10 tracking-tighter uppercase mt-2">{liveAvatar.modelType || 'Avatar_Anny'}</h2>
                    </div>

                    <div className="absolute inset-0 z-0">
                        <Canvas dpr={[1, 2]}>
                            <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={35} />
                            <ambientLight intensity={0.4} />
                            <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                    {liveAvatar.meshUrl ? (
                                        <GLBErrorBoundary fallback={<AnnyHumanBody measurements={liveAvatar.measurements} targetScale={targetScale} isTryingOn={wornClothId !== null} />}>
                                            <AvatarRealGLB url={getFullUrl(liveAvatar.meshUrl)} targetScale={targetScale} />
                                            {liveAvatar.prenda3D && <GarmentRealGLB url={getFullUrl(liveAvatar.prenda3D)} targetScale={targetScale} />}
                                            {/* Pose overlay: simple skeleton drawn from poseData for live preview */}
                                            {liveAvatar.poseData && <group position={[0, 0, 0]}><PoseOverlay poseData={liveAvatar.poseData} /></group>}
                                        </GLBErrorBoundary>
                                    ) : (
                                        <AnnyHumanBody measurements={liveAvatar.measurements} targetScale={targetScale} isTryingOn={wornClothId !== null} />
                                    )}
                                </Stage>
                            </Suspense>
                            <OrbitControls enablePan={false} enableZoom={true} minDistance={1.5} maxDistance={8} />
                        </Canvas>
                    </div>

                    {/* HUD de Orientación y Alineación */}
                    <div className="absolute top-32 left-10 z-20 flex flex-col gap-2">
                        {(() => {
                            const selectedPrenda = prendas.find(p => p._id === wornClothId || p.id === wornClothId);
                            if (!selectedPrenda && !liveAvatar.normal) return null;

                            const vAv = new THREE.Vector3(
                                liveAvatar.normal?.x ?? 0,
                                liveAvatar.normal?.y ?? 0,
                                liveAvatar.normal?.z ?? 1
                            ).normalize();

                            const vPr = new THREE.Vector3(
                                selectedPrenda?.normal?.x ?? 0,
                                selectedPrenda?.normal?.y ?? 0,
                                selectedPrenda?.normal?.z ?? 1
                            ).normalize();

                            const dot = vAv.dot(vPr);
                            const angleRad = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));
                            const angleDeg = (angleRad * 180) / Math.PI;

                            return (
                                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-1 min-w-[180px]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Alignment / Normal</span>
                                        <div className={`w-2 h-2 rounded-full ${Math.abs(dot - 1) < 0.01 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-yellow-500'}`} />
                                    </div>
                                    <div className="flex items-end justify-between mt-1">
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-white leading-none">{(dot).toFixed(4)}</span>
                                            <span className="text-[6px] text-[#00f1fe] font-bold uppercase">Dot Product</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[12px] font-black text-white leading-none">{angleDeg.toFixed(1)}°</span>
                                            <span className="text-[6px] text-[#00f1fe] font-bold uppercase">Angle Offset</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-[#00f1fe] transition-all duration-500"
                                            style={{ width: `${(dot * 100).toFixed(0)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {selectedCollection && (
                        <div className="absolute right-0 top-0 bottom-0 w-80 z-50 flex">
                            <div className="flex-1 bg-black/60 backdrop-blur-3xl border-l border-white/10 p-8 flex flex-col animate-slide-left">
                                <div className="flex justify-between items-center mb-8">
                                    <h5 className="text-[10px] font-black text-[#00f1fe] uppercase tracking-[0.3em]">{selectedCollection}</h5>
                                    <button onClick={() => setSelectedCollection(null)} className="text-gray-500 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-10">
                                    {collections[selectedCollection]?.map(prenda => (
                                        <div key={prenda._id} onClick={() => handleTryOn(prenda._id)} className={`group relative rounded-2xl overflow-hidden cursor-pointer border transition-all duration-500 ${wornClothId === prenda._id ? 'border-[#00f1fe] bg-[#00f1fe]/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                                            <div className="aspect-[4/3] relative flex items-center justify-center bg-white/5">
                                                {prenda.img && <img src={`${iotApi.API_BASE}${prenda.img}`} alt={prenda.titulo} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />}
                                            </div>
                                            <div className="p-4 bg-black/40">
                                                <p className="text-[9px] font-black text-white uppercase tracking-wider mb-1">{prenda.titulo}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[7px] text-gray-400 font-bold uppercase">{selectedCollection}</span>
                                                    <span className="text-[7px] text-[#00f1fe] font-black">{prenda.talla}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <footer className="h-44 bg-black/60 border-t border-white/5 p-8 z-40 backdrop-blur-xl">
                <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar px-4">
                    {Object.keys(collections).map(catName => (
                        <div key={catName} onClick={() => setSelectedCollection(catName)} className={`flex-shrink-0 w-48 h-24 rounded-2xl relative overflow-hidden group cursor-pointer border transition-all duration-500 ${selectedCollection === catName ? 'border-[#00f1fe] bg-[#00f1fe]/5' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <h5 className="text-[10px] font-black text-white uppercase tracking-widest">{catName}</h5>
                                <span className="text-[7px] text-[#00f1fe] font-bold uppercase">{collections[catName].length} ITEMS</span>
                            </div>
                        </div>
                    ))}
                </div>
            </footer>
        </div>
    );
};

export default ProbadorAvatar;
