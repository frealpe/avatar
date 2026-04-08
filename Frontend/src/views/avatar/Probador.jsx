import React, { useState, useEffect, useRef, useContext } from 'react';
import useStore from '../../store';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';
import Model3D from '../../components/probador/Model3D';
import Sidebar from '../../components/probador/Sidebar';

const DEFAULT_AVATAR = {
    modelType: 'ANNY_MODEL_01',
    meshUrl: null
};

const ProbadorAvatar = () => {
    const avatarData = useStore(state => state.avatarData) || DEFAULT_AVATAR;
    const { socket } = useContext(SocketContext);

    const initialAvatar = useRef(avatarData);
    const [liveAvatar, setLiveAvatar] = useState(initialAvatar.current);
    const [prendas, setPrendas] = useState([]);
    const [tryingOn, setTryingOn] = useState(false);
    const [wornClothId, setWornClothId] = useState(null);

    // Sincronización segura (solo si el ID cambia)
    useEffect(() => {
        if (avatarData && avatarData._id !== liveAvatar?._id) {
            setLiveAvatar(JSON.parse(JSON.stringify(avatarData))); // Deep copy so we can edit
        }
    }, [avatarData?._id]);

    useEffect(() => {
        if (!socket) return;
        const handleAvatarReady = (data) => {
            if (JSON.stringify(data) === JSON.stringify(liveAvatar)) return;
            console.log('✨ [Socket] Nuevo avatar recibido:', data);
            setLiveAvatar(data);
        };
        socket.on('avatar:ready', handleAvatarReady);
        return () => socket.off('avatar:ready', handleAvatarReady);
    }, [socket, liveAvatar]);

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

                            <Model3D glbUrl={liveAvatar.meshUrl} isTryingOn={wornClothId !== null} />

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

                {/* Parameters Section (Sidebar from Component) */}
                <Sidebar />
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
