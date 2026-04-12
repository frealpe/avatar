import React, { useState, useEffect, useRef, useContext, Suspense, useMemo } from 'react';
import useStore from '../../store';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Stage } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';
import * as THREE from 'three';

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

// --- Componentes 3D Con Sincronización ---
const TALLA_SCALES = {
    'XS': 0.85,
    'S': 0.92,
    'M': 1.0,
    'L': 1.08,
    'XL': 1.16,
    'XXL': 1.25,
    'A Medida': 1.0
};

function FittingRoom({ avatarUrl, garmentUrl, targetScale = [1, 1, 1], prendaTalla = 'M' }) {
    const avatar = useGLTF(avatarUrl);
    const garment = garmentUrl ? useGLTF(garmentUrl) : null;
    const avatarRef = useRef();
    const garmentRef = useRef();
    const { nodes: avatarNodes } = useGraph(avatar.scene);
    const garmentNodes = garment ? useGraph(garment.scene).nodes : null;

    useFrame((state) => {
        if (!avatarRef.current) return;
        avatarRef.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;
        const lerpFactor = 0.1;
        avatarRef.current.scale.x += (targetScale[0] - avatarRef.current.scale.x) * lerpFactor;
        avatarRef.current.scale.y += (targetScale[1] - avatarRef.current.scale.y) * lerpFactor;
        avatarRef.current.scale.z += (targetScale[2] - avatarRef.current.scale.z) * lerpFactor;

        if (garmentRef.current && garmentNodes) {
            garmentRef.current.position.copy(avatarRef.current.position);
            const gScaleBase = TALLA_SCALES[prendaTalla] || 1.0;
            garmentRef.current.scale.x = avatarRef.current.scale.x * gScaleBase;
            garmentRef.current.scale.y = avatarRef.current.scale.y * gScaleBase;
            garmentRef.current.scale.z = avatarRef.current.scale.z * gScaleBase;
            Object.keys(avatarNodes).forEach(nodeName => {
                if (avatarNodes[nodeName].isBone && garmentNodes[nodeName]) {
                    garmentNodes[nodeName].quaternion.copy(avatarNodes[nodeName].quaternion);
                }
            });
        }
    });

    return (
        <group>
            <primitive ref={avatarRef} object={avatar.scene} position={[0, -1, 0]} />
            {garment && <primitive ref={garmentRef} object={garment.scene} position={[0, -1, 0]} />}
        </group>
    );
}

function AnnyHumanBody({ targetScale = [1, 1, 1], isTryingOn }) {
    const group = useRef();
    const bodyColor = isTryingOn ? '#9D00FF' : '#00F2FF';
    useFrame((state) => {
        if (group.current) {
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

function MiniModelPreview({ url }) {
    if (!url) return null;
    return (
        <Canvas camera={{ position: [0, 0, 2], fov: 40 }} gl={{ alpha: true }} style={{ height: '100%', width: '100%' }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <Suspense fallback={null}>
                <Stage environment="city" intensity={0.5} contactShadow={false}><Model url={url} /></Stage>
            </Suspense>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={4} />
        </Canvas>
    );
}

function Model({ url }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

class GLBErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() { if (this.state.hasError) return this.props.fallback || null; return this.props.children; }
}

const ProbadorAvatar = () => {
    const avatarData = useStore(state => state.avatarData);
    const setAvatar = useStore(state => state.setAvatar);
    const { socket } = useContext(SocketContext);
    const [liveAvatar, setLiveAvatar] = useState(avatarData || { meshUrl: null });
    const [prendas, setPrendas] = useState([]);
    const [wornClothId, setWornClothId] = useState(null);
    const [focusPrenda, setFocusPrenda] = useState(null);
    const [targetScale, setTargetScale] = useState([1, 1, 1]);
    const [selectedCategoria, setSelectedCategoria] = useState(null);
    const [isProbando, setIsProbando] = useState(false);
    const [lastDressedUrl, setLastDressedUrl] = useState(null);

    useEffect(() => {
        if (!avatarData) {
            const savedBody = localStorage.getItem('modavatar_active_body');
            if (savedBody) {
                try {
                    const parsed = JSON.parse(savedBody);
                    setAvatar(parsed);
                } catch (e) { console.error(e); }
            }
        }
    }, [avatarData, setAvatar]);

    useEffect(() => { if (avatarData) setLiveAvatar(prev => ({ ...prev, ...avatarData })); }, [avatarData]);

    useEffect(() => {
        if (!socket) return;
        const clamp = (v, a = 0.75, b = 1.35) => Math.max(a, Math.min(b, v));
        const handlePreview = (data) => {
            try {
                const betas = Array.isArray(data?.betas) ? data.betas : [];
                const heightBeta = betas[0] || 0;
                const chestBeta = betas[2] || 0;
                const shoulderBeta = betas[3] || 0;
                setTargetScale([clamp(1 + (chestBeta * 0.03) + (shoulderBeta * 0.01)), clamp(1 + (heightBeta * 0.07)), clamp(1 + (chestBeta * 0.03) + (shoulderBeta * 0.01))]);
            } catch (e) { console.error(e); }
        };
        socket.on('avatar:preview', handlePreview);

        return () => {
            socket.off('avatar:preview', handlePreview);
        };
    }, [socket]);

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const data = await iotApi.getClothesCatalog();
                if (data && data.ok) setPrendas(data.data);
            } catch (e) { console.error(e); }
        };
        fetchCatalog();
    }, []);

    const collections = prendas.reduce((acc, current) => {
        const cat = current.categoria || 'Sin Categoría';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(current);
        return acc;
    }, {});

    const handleSelectForFocus = (itemId) => {
        const prenda = prendas.find(p => p._id === itemId || p.id === itemId);
        setFocusPrenda(prenda);
    };

    const handleTryOn = async (prenda) => {
        setIsProbando(true);
        try {
            const avatarUrl = liveAvatar.meshUrl;
            const garmentUrl = prenda.prenda3D;
            const res = await iotApi.tryOnClothes(avatarUrl, garmentUrl);
            if (res.ok) {
                setLastDressedUrl(res.meshUrl);
                setWornClothId(prenda._id || prenda.id);
            } else {
                alert(res.msg || "Error en el ajuste");
            }
        } catch (error) {
            console.error("Error al probar prenda:", error);
            alert("Error conectando con el motor de físicas.");
        } finally {
            setIsProbando(false);
            setFocusPrenda(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden font-['Inter']">
            <div className="flex-1 flex overflow-hidden relative">
                {/* Canvas Avatar - Izquierda/Centro */}
                <section className={`relative blueprint-grid transition-all duration-500 ${selectedCategoria ? 'w-2/3' : 'flex-1'}`}>
                    <div className="absolute top-10 left-10 z-20">
                        <span className="text-[8px] text-[#00f1fe] uppercase tracking-[0.4em] font-black">Virtual Fitting Room / Workspace</span>
                        <h2 className="text-4xl font-black text-white/10 tracking-tighter uppercase mt-2">{liveAvatar.modelType || 'Anny_Model'}</h2>
                    </div>

                    <div className="absolute inset-0 z-0">
                        <Canvas dpr={[1, 2]}>
                            <PerspectiveCamera makeDefault position={[0, 0.5, 5]} fov={35} />
                            <ambientLight intensity={0.4} />
                            <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                    {lastDressedUrl ? (
                                        <Model url={getFullUrl(lastDressedUrl)} />
                                    ) : liveAvatar.meshUrl ? (
                                        <GLBErrorBoundary fallback={<AnnyHumanBody targetScale={targetScale} isTryingOn={wornClothId !== null} />}>
                                            <FittingRoom
                                                avatarUrl={getFullUrl(liveAvatar.meshUrl)}
                                                garmentUrl={liveAvatar.prenda3D ? getFullUrl(liveAvatar.prenda3D) : null}
                                                targetScale={targetScale}
                                                prendaTalla={liveAvatar.prendaTalla || 'M'}
                                            />
                                        </GLBErrorBoundary>
                                    ) : (
                                        <AnnyHumanBody targetScale={targetScale} isTryingOn={wornClothId !== null} />
                                    )}
                                </Stage>
                            </Suspense>
                            <OrbitControls enablePan={false} enableZoom={true} minDistance={1.5} maxDistance={8} />
                        </Canvas>
                    </div>

                    {/* TARJETA DE DRESSING MOVIDA AL LATERAL (AQUÍ SOLO SI NO HAY CATEGORÍA) */}
                    {!selectedCategoria && focusPrenda && (
                        <div className="absolute top-32 right-10 z-50 w-[350px] animate-in slide-in-from-right duration-500">
                            <FocusGarmentCard
                                prenda={focusPrenda}
                                onClose={() => setFocusPrenda(null)}
                                onTryOn={handleTryOn}
                                liveAvatar={liveAvatar}
                            />
                        </div>
                    )}

                    {/* HUD Alineación */}
                    <div className="absolute top-32 left-10 z-20 flex flex-col gap-2">
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-1 min-w-[180px]">
                            <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Active System</span>
                            <div className="flex items-end justify-between mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-black text-white leading-none">SYNCED</span>
                                    <span className="text-[6px] text-[#00f1fe] font-bold uppercase">Pose Engine</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[12px] font-black text-white leading-none">{liveAvatar.prendaTalla || 'M'}</span>
                                    <span className="text-[6px] text-[#00f1fe] font-bold uppercase">Garment Size</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Panel Lateral de Prendas */}
                {selectedCategoria && (
                    <aside className="w-1/3 h-full bg-black/40 border-l border-white/5 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">{selectedCategoria}</h3>
                            <button onClick={() => setSelectedCategoria(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        {focusPrenda && (
                            <div className="p-2 border-b border-white/10 bg-[#161a1e]/40 animate-in slide-in-from-top duration-500">
                                <FocusGarmentCard
                                    prenda={focusPrenda}
                                    onClose={() => setFocusPrenda(null)}
                                    onTryOn={handleTryOn}
                                    liveAvatar={liveAvatar}
                                    compact
                                />
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-2 content-start custom-scrollbar">
                            {prendas.filter(p => (p.categoria || 'Sin Categoría') === selectedCategoria).map(prenda => (
                                <button
                                    key={prenda._id || prenda.id}
                                    onClick={() => handleSelectForFocus(prenda._id || prenda.id)}
                                    className={`group relative overflow-hidden rounded-lg border h-fit transition-all ${wornClothId === (prenda._id || prenda.id) ? 'border-[#00f1fe] bg-[#00f1fe]/10 shadow-[0_0_10px_#00f1fe20]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                                >
                                    <div className="w-full aspect-square bg-black/60 relative">
                                        {prenda.prenda3D ? <MiniModelPreview url={getFullUrl(prenda.prenda3D)} /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-sm text-gray-700">image</span></div>}
                                    </div>
                                    <div className="p-1 text-center bg-black/40">
                                        <h4 className="font-bold text-white text-[7px] truncate uppercase leading-tight">{prenda.name}</h4>
                                    </div>
                                    {wornClothId === (prenda._id || prenda.id) && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#00f1fe] rounded-full shadow-[0_0_5px_#00f1fe]" />}
                                </button>
                            ))}
                        </div>
                    </aside>
                )}
            </div>

            <footer className="h-44 bg-black/60 border-t border-white/5 p-8 backdrop-blur-3xl">
                <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar px-4 h-full items-center">
                    {Object.keys(collections).map(catName => (
                        <button key={catName} onClick={() => setSelectedCategoria(catName)} className={`flex-shrink-0 w-48 h-24 rounded-2xl relative overflow-hidden group border transition-all duration-500 ${selectedCategoria === catName ? 'border-[#00f1fe] bg-[#00f1fe]/10 scale-105 shadow-[0_0_30px_#00f1fe20]' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                                <h5 className="text-[10px] font-black text-white uppercase tracking-widest">{catName}</h5>
                                <span className="text-[7px] text-[#00f1fe] font-bold uppercase">{collections[catName].length} ITEMS</span>
                            </div>
                        </button>
                    ))}
                </div>
            </footer>
        </div>
    );
};

const FocusGarmentCard = ({ prenda, onClose, onTryOn, liveAvatar, compact }) => {
    return (
        <div className={`relative bg-black/80 backdrop-blur-2xl border border-[#00f1fe]/30 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col items-center ${compact ? 'p-4' : 'p-6'} text-center transition-all duration-500`}>
            {!compact && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f1fe] to-transparent" />}

            <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
            </button>

            <div className={`${compact ? 'w-24 h-24' : 'w-40 h-40'} bg-black/40 rounded-2xl mb-4 relative border border-white/5`}>
                <MiniModelPreview url={getFullUrl(prenda.prenda3D)} />
            </div>

            {!compact && <span className="text-[8px] text-[#00f1fe] font-black tracking-[0.3em] uppercase mb-1">New Selection</span>}
            <h2 className={`${compact ? 'text-sm' : 'text-xl'} font-black text-white uppercase tracking-tight`}>{prenda.name}</h2>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-4">{prenda.marca || 'Anny Exclusive'}</p>

            <div className="flex gap-2 mb-4 w-full px-2">
                <div className="flex-1 p-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="block text-[6px] text-gray-600 uppercase font-black">Size</span>
                    <span className="text-[10px] font-bold text-white">{liveAvatar.tallaSugerida || 'M'}</span>
                </div>
                <div className="flex-1 p-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="block text-[6px] text-gray-600 uppercase font-black">Status</span>
                    <span className={`text-[10px] font-bold ${prenda.isFitted ? 'text-[#00fe85]' : 'text-gray-400'}`}>{prenda.isFitted ? 'FITTED' : 'RAW'}</span>
                </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
                <button onClick={() => onTryOn(prenda)} className="w-full py-3 bg-[#00f1fe] text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-xs">checkroom</span> PROBAR PRENDA
                </button>
            </div>
        </div>
    );
};

export default ProbadorAvatar;
