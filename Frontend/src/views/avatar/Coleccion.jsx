import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import useStore from '../../store';

function MiniModelPreview({ url }) {
    if (!url) return null;
    return (
        <Canvas camera={{ position: [0, 0, 2], fov: 40 }} gl={{ alpha: true }} style={{ height: '100%', width: '100%' }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <Suspense fallback={null}>
                <Stage environment="city" intensity={0.5} contactShadow={false}>
                    <Model url={url} />
                </Stage>
            </Suspense>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={4} />
        </Canvas>
    );
}

function Model({ url }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

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

const Coleccion = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { avatarData, setAvatar } = useStore();
    const [categorias, setCategorias] = useState([]);
    const [selectedCategoria, setSelectedCategoria] = useState(null);
    const [prendas, setPrendas] = useState([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedSizes, setSelectedSizes] = useState({});

    const tallyMap = [
        { id: 'XS', label: 'XS', desc: 'Extra pequeña' },
        { id: 'S', label: 'S', desc: 'Persona delgada' },
        { id: 'M', label: 'M', desc: 'Promedio' },
        { id: 'L', label: 'L', desc: 'Más contextura' },
        { id: 'XL', label: 'XL', desc: 'Grande' },
        { id: 'XXL', label: 'XXL', desc: 'Extra grande' },
        { id: 'A Medida', label: 'MED', desc: 'A medida (Tus medidas exactas)' }
    ];

    useEffect(() => {
        if (location.state?.category && categorias.length > 0) {
            handleSelectCategoria(location.state.category);
        }
    }, [location.state, categorias]);

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                setLoadingCatalog(true);
                const data = await iotApi.getClothesCatalog();
                if (data && data.ok) {
                    const grouped = {};
                    data.data.forEach(prenda => {
                        const cat = prenda.categoria || 'Sin Categoría';
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(prenda);
                    });
                    const sortedCats = Object.keys(grouped).sort();
                    setCategorias(sortedCats);
                }
            } catch (e) {
                console.error('Error cargando catálogo:', e);
            } finally {
                setLoadingCatalog(false);
            }
        };
        fetchCatalog();
    }, []);

    const handleSelectCategoria = async (categoria) => {
        setSelectedCategoria(categoria);
        try {
            const data = await iotApi.getClothesCatalog();
            if (data && data.ok) {
                const filtered = data.data.filter(p => (p.categoria || 'Sin Categoría').toUpperCase() === categoria.toUpperCase());
                setPrendas(filtered);
            }
        } catch (e) {
            console.error('Error cargando prendas de categoría:', e);
        }
    };

    const handleTryOn = async (prenda) => {
        const sSize = selectedSizes[prenda._id || prenda.id] || avatarData?.tallaSugerida || 'M';
        if (!avatarData?._id) {
            navigate('/avatar/escaneo');
            return;
        }

        try {
            setSaving(true);
            const response = await iotApi.updateAvatar(avatarData._id, {
                prenda3D: prenda.prenda3D,
                prendaTalla: sSize
            });

            if (response.ok) {
                setAvatar(response.avatar);
                console.log("👕 Prenda seleccionada con talla:", sSize);
            }
        } catch (error) {
            console.error('Error al guardar selección de prenda:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleVolver = () => {
        if (selectedCategoria) {
            setSelectedCategoria(null);
            setPrendas([]);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden font-['Inter']">
            <div className="flex items-center justify-between p-4 md:p-8 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-4">
                    <button onClick={handleVolver} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                            {selectedCategoria ? selectedCategoria : 'Colecciones'}
                        </h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">
                            {selectedCategoria ? 'Prendas Digitalizadas' : 'Categorías Disponibles'}
                        </p>
                    </div>
                </div>
                {selectedCategoria && <span className="text-sm text-gray-400">{prendas.length} prendas</span>}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!selectedCategoria ? (
                    <div className="p-6 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {loadingCatalog ? (
                                <div className="col-span-full text-center py-12">
                                    <span className="material-symbols-outlined animate-spin text-4xl text-[#00f1fe]">loading</span>
                                    <p className="text-gray-400 mt-4">Cargando categorías...</p>
                                </div>
                            ) : categorias.length === 0 ? (
                                <div className="col-span-full text-center py-12"><p className="text-gray-400">No hay categorías disponibles</p></div>
                            ) : (
                                categorias.map((categoria) => (
                                    <button
                                        key={categoria}
                                        onClick={() => handleSelectCategoria(categoria)}
                                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-black/40 hover:border-[#00f1fe] transition-all hover:shadow-lg hover:shadow-[#00f1fe]/20"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#00f1fe]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
                                            <div className="mb-4">
                                                <span className="material-symbols-outlined text-5xl text-[#00f1fe]/50 group-hover:text-[#00f1fe] transition-colors">
                                                    {categoria.toLowerCase().includes('camisa') ? 'shirt' : categoria.toLowerCase().includes('pantalón') ? 'category' : categoria.toLowerCase().includes('zapato') ? 'shoes' : categoria.toLowerCase().includes('accesor') ? 'diamond' : 'checkroom'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-white uppercase tracking-wider">{categoria}</h3>
                                            <p className="text-xs text-gray-400 mt-3 uppercase tracking-widest">Click para explorar</p>
                                            <div className="mt-4 transform group-hover:translate-x-1 transition-transform">
                                                <span className="material-symbols-outlined text-[#00f1fe]/50 group-hover:text-[#00f1fe]">arrow_forward</span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {loadingCatalog ? (
                                <div className="col-span-full text-center py-12">
                                    <span className="material-symbols-outlined animate-spin text-4xl text-[#00f1fe]">loading</span>
                                    <p className="text-gray-400 mt-4">Cargando prendas...</p>
                                </div>
                            ) : prendas.length === 0 ? (
                                <div className="col-span-full text-center py-12"><p className="text-gray-400">No hay prendas en esta categoría</p></div>
                            ) : (
                                prendas.map((prenda) => (
                                    <div
                                        key={prenda._id || prenda.id}
                                        className={`group relative overflow-hidden rounded-2xl border transition-all hover:shadow-xl hover:shadow-[#00f1fe]/10 ${avatarData?.prenda3D === prenda.prenda3D ? 'border-[#00f1fe] bg-[#00f1fe]/5' : 'border-white/10 bg-gradient-to-br from-white/5 to-black/40'}`}
                                    >
                                        <div className="relative w-full h-56 bg-black/60 overflow-hidden">
                                            {avatarData?.prenda3D === prenda.prenda3D && (
                                                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-[#00f1fe] text-black px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-[0_0_10px_#00f1fe]">
                                                    <span className="material-symbols-outlined text-[10px]">check_circle</span> Seleccionado
                                                </div>
                                            )}
                                            {prenda.prenda3D ? <MiniModelPreview url={getFullUrl(prenda.prenda3D)} /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-5xl text-gray-600">image_not_supported</span></div>}
                                        </div>

                                        <div className="p-5 bg-black/40 backdrop-blur-sm border-t border-white/5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-black text-white text-sm uppercase tracking-wide truncate">{prenda.name}</h3>
                                                    <p className="text-[9px] text-[#00f1fe] font-bold tracking-widest uppercase opacity-60">{prenda.marca || 'ANNY FASHION'}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter mb-1">Tu Talla Sugerida</span>
                                                    <span className="text-xs font-black text-[#00f1fe] bg-[#00f1fe]/10 px-2 py-0.5 rounded-md border border-[#00f1fe]/20">{avatarData?.tallaSugerida || 'M'}</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 mb-5">
                                                {tallyMap.map(t => (
                                                    <div key={t.id} className="relative group/tip flex-1 min-w-[35px]">
                                                        <button
                                                            onClick={() => setSelectedSizes(prev => ({ ...prev, [prenda._id || prenda.id]: t.id }))}
                                                            className={`w-full py-2 rounded-lg text-[9px] font-black transition-all border ${(selectedSizes[prenda._id || prenda.id] || avatarData?.tallaSugerida || 'M') === t.id
                                                                    ? 'bg-[#00f1fe] text-black border-[#00f1fe] shadow-[0_0_15px_rgba(0,241,254,0.4)]'
                                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            {t.label}
                                                        </button>
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 border border-white/10 rounded-lg text-[8px] text-white opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                                                            {t.desc}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => handleTryOn(prenda)}
                                                disabled={saving}
                                                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${avatarData?.prenda3D === prenda.prenda3D
                                                        ? 'bg-[#d800ff] text-white shadow-[0_0_20px_rgba(216,0,255,0.4)] hover:scale-[1.02]'
                                                        : 'bg-white/10 text-white hover:bg-[#00f1fe] hover:text-black hover:scale-[1.02]'
                                                    }`}
                                            >
                                                {saving ? <span className="material-symbols-outlined animate-spin text-[12px]">sync</span> : avatarData?.prenda3D === prenda.prenda3D ? 'Prenda Seleccionada ✓' : 'Probar Ahora'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Coleccion;
