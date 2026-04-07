import React, { useEffect, useRef, useContext } from 'react'
import useStore from '../store'
import { SocketContext } from '../context/SocketContext'

const AppHeader = () => {
    const sidebarShow = useStore((state) => state.sidebarShow)
    const set = useStore((state) => state.set)
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
                <button className="px-8 py-2.5 bg-[#00f1fe] text-[#005f64] text-[11px] font-black tracking-widest rounded-lg shadow-[0_0_20px_rgba(0,241,254,0.4)] hover:shadow-[0_0_40px_rgba(0,241,254,0.6)] transition-all uppercase">
                    Guardar Cambios
                </button>
            </div>
        </header>
    )
}

export default AppHeader
