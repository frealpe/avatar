import React, { useContext } from 'react'
import useStore from '../store'
import { SocketContext } from '../context/SocketContext'
import { AuthContext } from '../context/AuthContext'

const AppHeader = () => {
    const sidebarShow = useStore((state) => state.sidebarShow)
    const backgroundJobs = useStore((state) => state.backgroundJobs)
    const simulationNotification = useStore((state) => state.simulationNotification)
    const set = useStore((state) => state.set)
    const { logout } = useContext(AuthContext)
    const { online } = useContext(SocketContext)

    return (
        <header className="h-20 flex items-center justify-between px-10 z-40 bg-[#0b0e11]/80 backdrop-blur-xl border-b border-[#45484c]/10">
            <div className="flex items-center gap-4">
                <span 
                    className="material-symbols-outlined text-[#00F2FF] cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => set({ sidebarShow: !sidebarShow })}
                >
                    menu
                </span>
                <span className="text-[10px] font-bold tracking-[0.3em] text-[#a9abaf] uppercase font-['Space_Grotesk']">Precision Interface v.2.0</span>
            </div>
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1c2024] border border-[#45484c]/20">
                    <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#22c55e] animate-pulse' : 'bg-[#ff716c]'}`}></div>
                    <span className="text-[9px] font-bold text-white tracking-[0.1em] uppercase">ETHEREAL Server {online ? 'Online' : 'Offline'}</span>
                </div>

                {/* Simulation Status Bar */}
                {backgroundJobs.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#d800ff]/10 border border-[#d800ff]/20 animate-pulse">
                        <div className="w-2 h-2 rounded-full border border-[#d800ff] border-t-transparent animate-spin"></div>
                        <span className="text-[8px] font-black text-[#d800ff] uppercase tracking-widest">
                            Simulando {backgroundJobs.length > 1 ? `(${backgroundJobs.length})` : backgroundJobs[0].name}
                        </span>
                    </div>
                )}

                {/* Notification Toast in Header */}
                {simulationNotification && (
                    <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full border animate-in slide-in-from-top cursor-pointer
                        ${simulationNotification.type === 'success' ? 'bg-[#00fe85]/10 border-[#00fe85]/30 text-[#00fe85]' : 
                          simulationNotification.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                          'bg-[#00f1fe]/10 border-[#00f1fe]/30 text-[#00f1fe]'}`}
                        onClick={() => {
                            if (simulationNotification.result && window.location.pathname.includes('avatar')) {
                                // Evento para que LaboratorioIA cargue el resultado
                                window.dispatchEvent(new CustomEvent('load-simulation-result', { detail: simulationNotification.result }));
                            }
                            set({ simulationNotification: null });
                        }}
                    >
                        <span className="material-symbols-outlined text-xs">
                            {simulationNotification.type === 'success' ? 'check_circle' : 'info'}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest">{simulationNotification.msg}</span>
                        <span className="material-symbols-outlined text-[10px] opacity-40 hover:opacity-100" onClick={(e) => { e.stopPropagation(); set({ simulationNotification: null }); }}>close</span>
                    </div>
                )}
                <span 
                    className="material-symbols-outlined text-[#ff716c] cursor-pointer hover:scale-110 transition-transform hover:text-[#ff4a44]"
                    onClick={() => logout()}
                    title="Cerrar Sesión"
                >
                    logout
                </span>
                <button className="px-8 py-2.5 bg-[#00f1fe] text-[#005f64] text-[11px] font-black tracking-widest rounded-lg shadow-[0_0_20px_rgba(0,241,254,0.4)] hover:shadow-[0_0_40px_rgba(0,241,254,0.6)] transition-all uppercase">
                    Guardar Cambios
                </button>
            </div>
        </header>
    )
}

export default AppHeader
