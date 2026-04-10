import React, { useState, useEffect, useRef, useContext, Suspense } from 'react';
import useStore from '../../store';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Stage } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';

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
    const { scene } = useGLTF(url);
    const group = useRef();
    useFrame((state) => {
        if (group.current) {
            group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;
            const lerpFactor = 0.1;
            group.current.scale.x += (targetScale[0] - group.current.scale.x) * lerpFactor;
            group.current.scale.y += (targetScale[1] - group.current.scale.y) * lerpFactor;
            group.current.scale.z += (targetScale[2] - group.current.scale.z) * lerpFactor;
        }
    });
    return (<group ref={group} position={[0, -1, 0]}><primitive object={scene} /></group>);
}

function GarmentRealGLB({ url, targetScale = [1, 1, 1] }) {
    const { scene } = useGLTF(url);
    const group = useRef();
    useFrame((state) => {
        if (group.current) {
            group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.01;
            const lerpFactor = 0.1;
            group.current.scale.x += (targetScale[0] - group.current.scale.x) * lerpFactor;
            group.current.scale.y += (targetScale[1] - group.current.scale.y) * lerpFactor;
            group.current.scale.z += (targetScale[2] - group.current.scale.z) * lerpFactor;
        }
    });
    return (<group ref={group} position={[0, -1, 0]}><primitive object={scene} /></group>);
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
                                        <>
                                            <AvatarRealGLB url={getFullUrl(liveAvatar.meshUrl)} targetScale={targetScale} />
                                            {liveAvatar.prenda3D && <GarmentRealGLB url={getFullUrl(liveAvatar.prenda3D)} targetScale={targetScale} />}
                                        </>
                                    ) : (
                                        <AnnyHumanBody measurements={liveAvatar.measurements} targetScale={targetScale} isTryingOn={wornClothId !== null} />
                                    )}
                                </Stage>
                            </Suspense>
                            <OrbitControls enablePan={false} enableZoom={true} minDistance={1.5} maxDistance={8} />
                        </Canvas>
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
