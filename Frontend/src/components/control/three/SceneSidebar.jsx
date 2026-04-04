import React, { useState, useRef, useEffect, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import { cilChevronRight } from '@coreui/icons';

const MIN_WIDTH = 220;
const MAX_WIDTH = 560;

/**
 * SceneSidebar
 * Renders a fixed right-side icon strip.
 * Each tab opens a slide-in panel to the left of the strip.
 *
 * Props:
 *   tabs:        Array<{ id, label, icon, color }>
 *   initial:     string  — id of panel open by default (null = all closed)
 *   children:    ReactNode per tab id, keyed by tab.id
 *                  e.g. { station: <StationPanel />, mission: <MissionControl /> }
 *   stationId:   string  — id of the resizable panel (default 'station')
 */
const SceneSidebar = ({ tabs = [], initial = null, children = {}, stationId = 'station', onTabChange }) => {
    const [activePanel, setActivePanel] = useState(initial);
    const [panelWidth, setPanelWidth] = useState(300);

    const isResizingRef = useRef(false);
    const resizeStartX = useRef(0);
    const resizeStartW = useRef(300);

    const startResize = useCallback(e => {
        isResizingRef.current = true;
        resizeStartX.current = e.clientX;
        resizeStartW.current = panelWidth;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    }, [panelWidth]);

    useEffect(() => {
        const onMove = e => {
            if (!isResizingRef.current) return;
            // Dragging left = wider panel (inverted because panel is on the right)
            const delta = resizeStartX.current - e.clientX;
            const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartW.current + delta));
            setPanelWidth(next);
        };
        const onUp = () => {
            if (isResizingRef.current) {
                isResizingRef.current = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const toggle = id => {
        const next = activePanel === id ? null : id;
        setActivePanel(next);
        onTabChange?.(next);
    };

    const activeTab = tabs.find(t => t.id === activePanel);

    return (
        <div
            className="h-100 d-flex align-items-stretch flex-row-reverse shadow flex-shrink-0"
            style={{ zIndex: 10 }}
        >
            {/* ── Icon strip ──────────────────────────────────────────── */}
            <div
                className="d-flex flex-column align-items-center gap-1 py-3 px-1"
                style={{
                    pointerEvents: 'auto',
                    width: '48px',
                    background: 'rgba(10,10,20,0.85)',
                    backdropFilter: 'blur(6px)',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '-2px 0 12px rgba(0,0,0,0.5)',
                }}
            >
                {tabs.map(tab => {
                    const active = activePanel === tab.id;
                    return (
                        <button
                            key={tab.id}
                            title={tab.label}
                            onClick={() => toggle(tab.id)}
                            style={{
                                background: active ? `${tab.color}22` : 'transparent',
                                border: active ? `1px solid ${tab.color}66` : '1px solid transparent',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                padding: '8px 6px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                width: '40px',
                                transition: 'all 0.18s ease',
                            }}
                        >
                            <CIcon icon={tab.icon} style={{ color: active ? tab.color : '#aaa', width: '18px', height: '18px' }} />
                            <span style={{
                                fontSize: '0.46rem',
                                color: active ? tab.color : '#777',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                lineHeight: 1.1,
                                textAlign: 'center',
                            }}>
                                {tab.label.split(' ')[0]}
                            </span>
                        </button>
                    );
                })}

                {/* Collapse button */}
                {activePanel && (
                    <button
                        title="Cerrar panel"
                        onClick={() => { setActivePanel(null); onTabChange?.(null); }}
                        style={{
                            marginTop: 'auto',
                            background: 'transparent',
                            border: '1px solid transparent',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            padding: '6px',
                            color: '#555',
                        }}
                    >
                        <CIcon icon={cilChevronRight} style={{ width: '14px', height: '14px' }} />
                    </button>
                )}
            </div>

            {/* ── Slide-in content panel ───────────────────────────────── */}
            {activePanel && activeTab && (
                <div
                    style={{
                        pointerEvents: 'auto',
                        width: activePanel === stationId ? `${panelWidth}px` : '400px',
                        maxHeight: '100%',
                        overflowY: 'auto',
                        background: 'rgba(16,24,48,0.97)',
                        backdropFilter: 'blur(14px)',
                        borderLeft: '1px solid rgba(100,140,255,0.18)',
                        boxShadow: '-6px 0 28px rgba(0,0,0,0.75)',
                        color: '#e2e8f0',
                        animation: 'scSidebarIn 0.18s ease',
                        position: 'relative',
                        flexShrink: 0,
                    }}
                >
                    {/* Panel header */}
                    <div
                        className="d-flex align-items-center gap-2 px-3 py-2"
                        style={{
                            borderBottom: `1px solid ${activeTab.color}44`,
                            background: `${activeTab.color}11`,
                        }}
                    >
                        <CIcon icon={activeTab.icon} style={{ color: activeTab.color, width: '16px' }} />
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: activeTab.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {activeTab.label}
                        </span>
                    </div>

                    {/* Tab content */}
                    <div className="p-2 sc-sidebar-panel">
                        {children[activePanel] ?? null}
                    </div>

                    {/* Resize handle — left edge, only for the resizable tab */}
                    {activePanel === stationId && (
                        <div
                            onMouseDown={startResize}
                            title="Arrastrar para redimensionar"
                            style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: '6px',
                                height: '100%',
                                cursor: 'ew-resize',
                                background: 'rgba(13,202,240,0.15)',
                                transition: 'background 0.15s',
                                zIndex: 20,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,202,240,0.45)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(13,202,240,0.15)'}
                        />
                    )}
                </div>
            )}

            <style>{`
                @keyframes scSidebarIn {
                    from { opacity: 0; transform: translateX(12px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                /* Force light text on all form elements inside the dark panel */
                .sc-sidebar-panel input,
                .sc-sidebar-panel select,
                .sc-sidebar-panel textarea,
                .sc-sidebar-panel .form-control,
                .sc-sidebar-panel .form-select {
                    color: #e2e8f0 !important;
                    background-color: rgba(255,255,255,0.06) !important;
                    border-color: rgba(100,140,255,0.25) !important;
                }
                .sc-sidebar-panel input::placeholder {
                    color: #64748b !important;
                }
                .sc-sidebar-panel label,
                .sc-sidebar-panel .small,
                .sc-sidebar-panel .text-muted {
                    color: #94a3b8 !important;
                }
                .hover-effect:hover { background: rgba(255,255,255,0.06); }
                ::-webkit-scrollbar       { width: 3px; }
                ::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default SceneSidebar;
