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

    // Auto-seleccionar categoría si viene del estado de navegación
    useEffect(() => {
        if (location.state?.category && categorias.length > 0) {
            handleSelectCategoria(location.state.category);
        }
    }, [location.state, categorias]);

    // Cargar catálogo y agrupar por categorías
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                setLoadingCatalog(true);
                const data = await iotApi.getClothesCatalog();
                if (data && data.ok) {
                    // Agrupar por categoría
                    const grouped = {};
                    data.data.forEach(prenda => {
                        const cat = prenda.categoria || 'Sin Categoría';
                        if (!grouped[cat]) {
                            grouped[cat] = [];
                        }
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

    // Cuando se selecciona una categoría, cargar sus prendas
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
        if (!avatarData?._id) {
            console.error('No hay avatar activo para probarse la ropa');
            navigate('/avatar/escaneo');
            return;
        }

        try {
            setSaving(true);
            console.log(`👕 Guardando prenda ${prenda.titulo || prenda.name} para avatar ${avatarData._id}`);

            // Persistir en DB
            const response = await iotApi.updateAvatar(avatarData._id, {
                prenda3D: prenda.prenda3D
            });

            if (response.ok) {
                // Actualizar store local
                setAvatar(response.avatar);
                // El usuario prefiere quedarse en la colección tras seleccionar
                console.log("👕 Prenda seleccionada y guardada");
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
            navigate('/');  // Ir a Home, no a Probador
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0b0e11] relative overflow-hidden font-['Inter']">
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-8 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleVolver}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title={selectedCategoria ? "Volver a categorías" : "Volver al Probador"}
                    >
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
                {selectedCategoria && (
                    <span className="text-sm text-gray-400">
                        {prendas.length} prendas
                    </span>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!selectedCategoria ? (
                    // VISTA 1: Tarjetas de Categorías
                    <div className="p-6 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {loadingCatalog ? (
                                <div className="col-span-full text-center py-12">
                                    <span className="material-symbols-outlined animate-spin text-4xl text-[#00f1fe]">
                                        loading
                                    </span>
                                    <p className="text-gray-400 mt-4">Cargando categorías...</p>
                                </div>
                            ) : categorias.length === 0 ? (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-gray-400">No hay categorías disponibles</p>
                                </div>
                            ) : (
                                categorias.map((categoria) => {
                                    // Contar prendas en cada categoría
                                    const countPrendas = categorias.length; // Placeholder, se actualiza al hacer click
                                    return (
                                        <button
                                            key={categoria}
                                            onClick={() => handleSelectCategoria(categoria)}
                                            className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-black/40 hover:border-[#00f1fe] transition-all hover:shadow-lg hover:shadow-[#00f1fe]/20"
                                        >
                                            {/* Fondo con gradiente */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#00f1fe]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                            {/* Contenido */}
                                            <div className="relative p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
                                                {/* Icono de categoría */}
                                                <div className="mb-4">
                                                    <span className="material-symbols-outlined text-5xl text-[#00f1fe]/50 group-hover:text-[#00f1fe] transition-colors">
                                                        {categoria.toLowerCase().includes('camisa') ? 'shirt' :
                                                            categoria.toLowerCase().includes('pantalón') ? 'category' :
                                                                categoria.toLowerCase().includes('zapato') ? 'shoes' :
                                                                    categoria.toLowerCase().includes('accesor') ? 'diamond' :
                                                                        'checkroom'}
                                                    </span>
                                                </div>

                                                {/* Nombre categoría */}
                                                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                                                    {categoria}
                                                </h3>

                                                {/* Contador */}
                                                <p className="text-xs text-gray-400 mt-3 uppercase tracking-widest">
                                                    Click para explorar
                                                </p>

                                                {/* Arrow */}
                                                <div className="mt-4 transform group-hover:translate-x-1 transition-transform">
                                                    <span className="material-symbols-outlined text-[#00f1fe]/50 group-hover:text-[#00f1fe]">
                                                        arrow_forward
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    // VISTA 2: Prendas de la Categoría Seleccionada
                    <div className="p-6 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {loadingCatalog ? (
                                <div className="col-span-full text-center py-12">
                                    <span className="material-symbols-outlined animate-spin text-4xl text-[#00f1fe]">
                                        loading
                                    </span>
                                    <p className="text-gray-400 mt-4">Cargando prendas...</p>
                                </div>
                            ) : prendas.length === 0 ? (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-gray-400">No hay prendas en esta categoría</p>
                                </div>
                            ) : (
                                prendas.map((prenda) => (
                                    <button
                                        key={prenda._id || prenda.id}
                                        onClick={() => handleTryOn(prenda)}
                                        disabled={saving}
                                        className={`group relative overflow-hidden rounded-xl border transition-all hover:shadow-lg hover:shadow-[#00f1fe]/20 text-left ${avatarData?.prenda3D === prenda.prenda3D
                                                ? 'border-[#00f1fe] bg-[#00f1fe]/10 shadow-[0_0_15px_rgba(0,241,254,0.15)]'
                                                : 'border-white/10 bg-gradient-to-br from-white/5 to-black/40 hover:border-[#00f1fe]/50'
                                            }`}
                                    >
                                        {/* Vista 3D / Imagen */}
                                        <div className="relative w-full h-48 bg-black/60 overflow-hidden">
                                            {/* Badge de Selección */}
                                            {avatarData?.prenda3D === prenda.prenda3D && (
                                                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-[#00f1fe] text-black px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-[0_0_10px_#00f1fe]">
                                                    <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                                    Seleccionado
                                                </div>
                                            )}
                                            {prenda.prenda3D ? (
                                                <MiniModelPreview url={getFullUrl(prenda.prenda3D)} />
                                            ) : prenda.image ? (
                                                <img
                                                    src={getFullUrl(prenda.image)}
                                                    alt={prenda.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-5xl text-gray-600">
                                                        image_not_supported
                                                    </span>
                                                </div>
                                            )}
                                            {/* Overlay al hover */}
                                            <div className="absolute inset-0 bg-[#00f1fe]/0 group-hover:bg-[#00f1fe]/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#00f1fe]/50 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                    <span className="text-[10px] font-black text-[#00f1fe] uppercase tracking-widest">
                                                        {saving ? 'PROCESANDO...' : avatarData?.prenda3D === prenda.prenda3D ? 'RE-SELECCIONAR' : 'PROBAR AHORA'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Info prenda */}
                                        <div className="p-4 border-t border-white/5">
                                            <h3 className="font-black text-white text-sm uppercase tracking-wide truncate">
                                                {prenda.name}
                                            </h3>
                                            <p className="text-[9px] text-[#00f1fe] font-bold mt-1 tracking-widest uppercase opacity-60">
                                                {prenda.marca || 'DESIGN-LAB'}
                                            </p>
                                        </div>
                                    </button>
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
