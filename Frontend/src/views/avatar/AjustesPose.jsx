import React, { useState, useEffect, useRef, useContext, Suspense } from 'react';
import useStore from '../../store';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Stage, PivotControls } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';

// --- Componentes Auxiliares ---
const PoseSlider = ({ label, value, min, max, onChange }) => (
    <div className="group/slider">
        <div className="flex justify-between mb-3">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest group-hover/slider:text-[#00f1fe] transition-colors">{label}</label>
            <span className="text-[8px] font-black text-[#00f1fe] bg-[#00f1fe]/10 px-2 py-0.5 rounded-full">{value}</span>
        </div>
        <input
            type="range" min={min} max={max} step="0.1"
            value={value ?? 0}
            onInput={(e) => onChange(parseFloat(e.target.value))}
            className="w-full accent-[#00f1fe] bg-white/5 h-1 rounded-full appearance-none hover:bg-white/10 transition-colors cursor-pointer"
        />
    </div>
);

// --- Componentes 3D ---
const JointControl = ({ position, rotation, onChange, activeAxes, scale = 0.4, color = "#00f1fe", children }) => (
    <group position={position}>
        <PivotControls
            depthTest={false} anchor={[0, 0, 0]} disableAxes disableSliders scale={scale}
            activeAxes={activeAxes}
            onDrag={(l) => {
                const rot = new THREE.Euler().setFromRotationMatrix(l);
                onChange(rot);
            }}
        >
            <mesh><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} /></mesh>
        </PivotControls>
        <group rotation={rotation}>
            {children}
        </group>
    </group>
);

const AnnyFullSkeleton = ({ poseParams, onChange }) => {
    return (
        <group>

            {/* Torso Central */}
            <mesh position={[0, 2.5, 0]}>
                <boxGeometry args={[0.8, 1.2, 0.4]} />
                <meshStandardMaterial color="#333" wireframe opacity={0.2} transparent />
            </mesh>

            {/* Brazo Izquierdo */}
            <group position={[0.45, 3.0, 0]}>
                <PivotControls
                    depthTest={false} anchor={[0, 0, 0]} disableAxes disableSliders scale={0.5}
                    activeAxes={[false, false, true]}
                    onDrag={(l) => {
                        const rot = new THREE.Euler().setFromRotationMatrix(l);
                        onChange({ ...poseParams, poseLShoulder: -rot.z });
                    }}
                >
                    <mesh><sphereGeometry args={[0.08, 16, 16]} /><meshStandardMaterial color="#00f1fe" emissive="#00f1fe" emissiveIntensity={2} /></mesh>
                </PivotControls>

                <group rotation={[0, 0, -poseParams.poseLShoulder]}>
                    <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.05, 0.6, 0.05]} /><meshStandardMaterial color="#00f1fe" opacity={0.3} transparent /></mesh>

                    <JointControl
                        position={[0.6, 0, 0]}
                        rotation={[0, 0, poseParams.poseLElbow]}
                        activeAxes={[false, true, false]}
                        onChange={(rot) => onChange({ ...poseParams, poseLElbow: rot.y })}
                    >
                        <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.04, 0.6, 0.04]} /><meshStandardMaterial color="#00f1fe" opacity={0.3} transparent /></mesh>
                        <mesh position={[0.6, 0, 0]}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color="#d800ff" emissive="#d800ff" emissiveIntensity={5} /></mesh>
                    </JointControl>
                </group>
            </group>

            {/* Brazo Derecho */}
            <group position={[-0.45, 3.0, 0]}>
                <PivotControls
                    depthTest={false} anchor={[0, 0, 0]} disableAxes disableSliders scale={0.5}
                    activeAxes={[false, false, true]}
                    onDrag={(l) => {
                        const rot = new THREE.Euler().setFromRotationMatrix(l);
                        onChange({ ...poseParams, poseRShoulder: rot.z });
                    }}
                >
                    <mesh><sphereGeometry args={[0.08, 16, 16]} /><meshStandardMaterial color="#00f1fe" emissive="#00f1fe" emissiveIntensity={2} /></mesh>
                </PivotControls>

                <group rotation={[0, 0, poseParams.poseRShoulder]}>
                    <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.05, 0.6, 0.05]} /><meshStandardMaterial color="#00f1fe" opacity={0.3} transparent /></mesh>

                    <JointControl
                        position={[-0.6, 0, 0]}
                        rotation={[0, 0, -poseParams.poseRElbow]}
                        activeAxes={[false, true, false]}
                        onChange={(rot) => onChange({ ...poseParams, poseRElbow: -rot.y })}
                    >
                        <mesh position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.04, 0.6, 0.04]} /><meshStandardMaterial color="#00f1fe" opacity={0.3} transparent /></mesh>
                        <mesh position={[-0.6, 0, 0]}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color="#d800ff" emissive="#d800ff" emissiveIntensity={5} /></mesh>
                    </JointControl>
                </group>
            </group>

            {/* Piernas (Placeholder estático) */}
            <group position={[0.25, 1.9, 0]}>
                <mesh position={[0, -0.9, 0]}><boxGeometry args={[0.1, 1.8, 0.1]} /><meshStandardMaterial color="#444" opacity={0.2} transparent /></mesh>
            </group>
            <group position={[-0.25, 1.9, 0]}>
                <mesh position={[0, -0.9, 0]}><boxGeometry args={[0.1, 1.8, 0.1]} /><meshStandardMaterial color="#444" opacity={0.2} transparent /></mesh>
            </group>
        </group>
    );
};



// --- Componentes 3D ---
function AnnyHumanBody({ targetScale = [1, 1, 1], isPosing }) {
    const group = useRef();
    const bodyColor = isPosing ? '#00F2FF' : '#555';
    useFrame((state) => {
        if (group.current) {
            group.current.scale.set(...targetScale);
            group.current.position.y = -1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
        }
    });
    return (
        <group ref={group} position={[0, -1, 0]}>
            <mesh position={[0, 1.5, 0]}><boxGeometry args={[1.2, 2.5, 0.6]} /><meshStandardMaterial color={bodyColor} wireframe opacity={0.3} transparent /></mesh>
            <mesh position={[0, 3.2, 0]}><sphereGeometry args={[0.4, 32, 32]} /><meshStandardMaterial color={bodyColor} wireframe /></mesh>
        </group>
    );
}

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

// --- Vista AjustesPose ---

const AjustesPose = () => {
    // Helper para asegurar que la URL sea absoluta
    const getFullUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${iotApi.API_BASE}${url}`;
    };

    const avatarData = useStore(state => state.avatarData);
    const setAvatar = useStore(state => state.setAvatar);
    const { socket } = useContext(SocketContext);

    const [liveAvatar, setLiveAvatar] = useState(avatarData || { meshUrl: null, measurements: null });
    const [posedMeshUrl, setPosedMeshUrl] = useState(null);
    const lastPosedBetas = useRef(null);

    // 1. Cargar desde localStorage si el store está vacío (Persistencia)
    useEffect(() => {
        if (!avatarData) {
            const savedBody = localStorage.getItem('modavatar_active_body');
            if (savedBody) {
                try {
                    const parsed = JSON.parse(savedBody);
                    setAvatar(parsed);
                    setLiveAvatar(parsed);
                    console.log("🧬 [Ajustes] Avatar recuperado de localStorage");
                } catch (e) { console.error("Error parsing saved body:", e); }
            }
        }
    }, [avatarData, setAvatar]);

    // 2. Sincronizar con el store (por si el avatar se genera mientras estamos aquí)
    useEffect(() => {
        if (avatarData) setLiveAvatar(avatarData);
    }, [avatarData]);


    const [poseParams, setPoseParams] = useState({
        poseLShoulder: -1.3,
        poseRShoulder: -1.3,
        poseLElbow: 0.1,
        poseRElbow: -0.1
    });

    const [targetScale, setTargetScale] = useState([1, 1, 1]);
    const [selectedJoint, setSelectedJoint] = useState('Brazo Izquierdo');

    // Escala basada en biometría
    useEffect(() => {
        if (liveAvatar.measurements) {
            const h = liveAvatar.measurements.height / 170 || 1;
            const w = (liveAvatar.measurements.chest || 90) / 90 || 1;
            setTargetScale([w, h, w]);
        }
    }, [liveAvatar.measurements]);

    // Recalculo de Pose
    useEffect(() => {
        const poseMiAvatar = async () => {
            if (!liveAvatar.betas) return;
            const currentBetas = liveAvatar.betas || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const stateStr = JSON.stringify({ b: currentBetas, p: poseParams });
            if (lastPosedBetas.current === stateStr) return;

            try {
                const res = await iotApi.recalculateAvatar(currentBetas, 'neutral', 'modeling', poseParams);
                if (res && res.ok) {
                    const newUrl = getFullUrl(`${res.meshUrl}?t=${Date.now()}`);
                    setPosedMeshUrl(newUrl);
                    // Sincronizar con el store global para que el Probador use esta pose
                    setAvatar({ ...liveAvatar, meshUrl: newUrl });
                    lastPosedBetas.current = stateStr;
                }
            } catch (e) { console.error(e); }
        };
        const timer = setTimeout(poseMiAvatar, 250);
        return () => clearTimeout(timer);
    }, [liveAvatar.betas, poseParams]);



    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden font-['Inter']">
            {/* Main Viewport Split in Two Cards */}
            <div className="flex-1 p-6 grid grid-cols-2 gap-6 relative z-10 overflow-hidden">
                {/* Carta 1: Modelo Avatar */}
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl relative overflow-hidden flex flex-col group hover:border-[#00f1fe]/30 transition-all">
                    <div className="absolute top-6 left-6 z-20">
                        <span className="text-[8px] text-[#00f1fe] uppercase tracking-[0.4em] font-black">Vista de Salida</span>
                        <h3 className="text-xl font-black text-white tracking-tighter uppercase mt-1">Avatar 3D</h3>
                    </div>

                    <div className="flex-1 w-full h-full relative">
                        <Canvas dpr={[1, 2]}>
                            <PerspectiveCamera makeDefault position={[0, 0.5, 4]} fov={35} />
                            <ambientLight intensity={0.4} />
                            <pointLight position={[10, 10, 10]} intensity={1} color="#00F2FF" />
                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                    <group position={[0, -1, 0]}>
                                        {(posedMeshUrl || liveAvatar.meshUrl) ? (
                                            <AvatarRealGLB
                                                url={posedMeshUrl || getFullUrl(liveAvatar.meshUrl)}
                                                targetScale={targetScale}
                                            />
                                        ) : (
                                            <AnnyHumanBody targetScale={targetScale} isPosing={true} />
                                        )}
                                    </group>
                                </Stage>
                            </Suspense>
                            <OrbitControls enablePan={false} enableZoom={true} minDistance={1.5} maxDistance={8} />
                        </Canvas>
                    </div>
                </div>

                {/* Carta 2: Exo-Esqueleto HUD */}
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl relative overflow-hidden flex flex-col group hover:border-[#d800ff]/30 transition-all">
                    <div className="absolute top-6 left-6 z-20">
                        <span className="text-[8px] text-[#d800ff] uppercase tracking-[0.4em] font-black">Consola de Mando</span>
                        <h3 className="text-xl font-black text-white tracking-tighter uppercase mt-1">Skeleton HUD</h3>
                    </div>

                    <div className="flex-1 w-full h-full relative">
                        <Canvas dpr={[1, 2]}>
                            <PerspectiveCamera makeDefault position={[0, 0.5, 4]} fov={35} />
                            <ambientLight intensity={0.4} />
                            <pointLight position={[10, 10, 10]} intensity={1} color="#d800ff" />
                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                    <group position={[0, -1, 0]}>
                                        <AnnyFullSkeleton
                                            poseParams={poseParams}
                                            onChange={setPoseParams}
                                        />
                                    </group>
                                </Stage>
                            </Suspense>
                            <OrbitControls enablePan={false} enableZoom={true} minDistance={1.5} maxDistance={8} />
                        </Canvas>
                    </div>
                </div>
            </div>

            {/* Sidebar de Pose */}
            <div className="absolute right-0 top-0 bottom-0 w-80 z-50 flex pointer-events-none">
                <div className="flex-1 bg-black/60 backdrop-blur-3xl border-l border-white/10 p-8 flex flex-col animate-slide-left pointer-events-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-[10px] font-black uppercase text-[#00f1fe] tracking-[0.3em]">Control Maestro Anatomía</h3>
                        <div className="w-2 h-2 rounded-full bg-[#00f1fe] animate-pulse shadow-[0_0_10px_#00f1fe]"></div>
                    </div>

                    <p className="text-[10px] text-gray-400 uppercase mb-8 leading-relaxed">
                        Manipula el <span className="text-white font-bold">Exo-Esqueleto 3D</span> a la derecha para definir la pose. El modelo se sincronizará automáticamente.
                    </p>
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-10">
                        {selectedJoint === 'Brazo Izquierdo' ? (
                            <>
                                <div className="space-y-8 pt-6 border-t border-white/5">
                                    <PoseSlider label="Elevación Hombro (Z)" value={poseParams.poseLShoulder} min={-3.0} max={2.0} onChange={(v) => setPoseParams(p => ({ ...p, poseLShoulder: v }))} />
                                    <PoseSlider label="Flexión Codo" value={poseParams.poseLElbow} min={-1.5} max={1.5} onChange={(v) => setPoseParams(p => ({ ...p, poseLElbow: v }))} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-8 pt-6 border-t border-white/5">
                                    <PoseSlider label="Elevación Hombro (Z)" value={poseParams.poseRShoulder} min={-3.0} max={2.0} onChange={(v) => setPoseParams(p => ({ ...p, poseRShoulder: v }))} />
                                    <PoseSlider label="Flexión Codo" value={poseParams.poseRElbow} min={-1.5} max={1.5} onChange={(v) => setPoseParams(p => ({ ...p, poseRElbow: v }))} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer de Navegación de Pose */}
            <footer className="h-44 bg-black/80 border-t border-white/5 p-8 z-40 backdrop-blur-3xl">
                <div className="flex gap-6 overflow-x-auto no-scrollbar px-4">
                    {['Brazo Izquierdo', 'Brazo Derecho', 'Torso (Próximamente)', 'Piernas (Próximamente)'].map(part => (
                        <div key={part} onClick={() => !part.includes('Próximamente') && setSelectedJoint(part)} className={`flex-shrink-0 w-48 h-20 rounded-2xl relative overflow-hidden cursor-pointer border transition-all duration-500 ${selectedJoint === part ? 'border-[#00f1fe] bg-[#00f1fe]/10' : 'border-white/5 bg-white/5 hover:border-white/20'} ${part.includes('Próximamente') ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black to-transparent">
                                <h5 className="text-[9px] font-black text-white uppercase tracking-widest">{part}</h5>
                            </div>
                        </div>
                    ))}
                </div>
            </footer>
        </div>
    );
};

export default AjustesPose;
