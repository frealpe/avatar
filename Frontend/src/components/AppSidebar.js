import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import navigation from '../_nav'
import { NavLink } from 'react-router-dom'

const AppSidebar = () => {
    const dispatch = useDispatch()
    const sidebarShow = useSelector((state) => state.sidebarShow)

    return (
        <>
            {/* Overlay Mobile */}
            {sidebarShow && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => dispatch({ type: 'set', sidebarShow: false })}
                ></div>
            )}

            <aside className={`fixed lg:relative top-0 left-0 w-72 h-full bg-[#0b0e11] border-r border-[#45484c]/10 flex flex-col p-8 z-50 overflow-y-auto custom-scrollbar transition-transform duration-300 ${sidebarShow ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="mb-8">
                <span className="text-2xl font-black tracking-[-0.04em] text-[#00F2FF] drop-shadow-[0_0_12px_rgba(0,242,255,0.5)] font-['Space_Grotesk'] uppercase">ETHÉREAL</span>
            </div>

            <nav className="flex flex-col gap-2 mb-8">
                {navigation.map(item => (
                    <NavLink 
                        key={item.name} 
                        to={item.to || '#'}
                        onClick={() => dispatch({ type: 'set', sidebarShow: false })}
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-[#101417] text-[#00F2FF] shadow-[inset_0_0_15px_rgba(0,242,255,0.05)]' : 'text-[#a9abaf] hover:bg-[#101417]/30 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-lg">{item.materialIcon}</span>
                        <span className="text-sm font-semibold tracking-wide">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="mb-10 p-4 rounded-2xl bg-[#101417]/50 border border-[#45484c]/10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#1c2024] flex items-center justify-center overflow-hidden border border-[#00F2FF]/30">
                        <span className="material-symbols-outlined text-[#00F2FF]">person</span>
                    </div>
                    <div>
                        <h4 className="text-[12px] font-bold text-white font-['Space_Grotesk']">Anny Model 01</h4>
                        <p className="text-[10px] text-[#a9abaf]">Precision: 98.4%</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-[#00F2FF]/10 text-[#00F2FF] text-[8px] font-bold tracking-widest rounded-full border border-[#00F2FF]/20 inline-block uppercase text-center w-full">
                    V-Try On Ready
                </div>
            </div>

            <div className="mt-auto space-y-3">
                <button className="w-full py-3 rounded-xl border border-[#45484c]/20 text-[10px] uppercase tracking-widest font-bold text-[#a9abaf] hover:bg-[#101417] transition-all">Historial de escaneo</button>
                <button className="w-full py-3 rounded-xl border border-[#ff716c]/20 text-[10px] uppercase tracking-widest font-bold text-[#ff716c] hover:bg-[#ff716c]/5 transition-all">Eliminar avatar</button>
            </div>
        </aside>
        </>
    )
}

export default AppSidebar
