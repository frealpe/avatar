import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import CIcon from '@coreui/icons-react';
import { cilSettings, cilHistory } from '@coreui/icons';
import { SocketContext } from '../../../context/SocketContext';
import ControlService from '../../../service/control/control.service';

// ─── Sub-Components ──────────────────────────────────────────────────────────
import CalibrationTab from './calibration/CalibrationTab';
import HistoryTab from './calibration/HistoryTab';
import { SENSOR_OPTIONS, STEP_DEFS } from './calibration/CalibrationConstants';

const normalizeMac = (m) => m ? m.replace(/:/g, '').toLowerCase() : '';

// ─── Main Component ───────────────────────────────────────────────────────────
const CalibrationPanel = ({
    devices,
    swarmState = {},
    rtTelemetry = {},
    selectedSlave,
    setSelectedSlave,
    selectedSensor,
    setSelectedSensor,
    testActive,
    setTestActive,
    rawSignals,
    setRawSignals,
    rawStreamActive,
    setRawStreamActive
}) => {
    const { socket } = useContext(SocketContext);

    // ── State ──────────────────────────────────────────────────────────────────
    // ── State ──────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('calibrate');
    const [calibActive, setCalibActive] = useState(false);
    const [calibDone, setCalibDone] = useState(null);
    const [stepToast, setStepToast] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [chartData, setChartData] = useState({ cg: [], ca: [], cm: [], cs: [] });
    // Live calib stats from direct socket — avoids prop-chain delay
    const [liveStats, setLiveStats] = useState({ cs: 0, cg: 0, ca: 0, cm: 0 });

    // ── Refs ───────────────────────────────────────────────────────────────────
    const prevCalib = useRef({ cg: 0, ca: 0, cm: 0 });
    const startTimeRef = useRef(null);
    const animT = useRef(0);
    const animFrame = useRef(null);
    const macRef = useRef('');
    const [animTick, setAnimTick] = useState(0);

    // ── Keep macRef in sync ────────────────────────────────────────────────────
    useEffect(() => { macRef.current = selectedSlave; }, [selectedSlave]);

    // ── Direct socket listener for calibration stats ───────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handler = ({ topic, data }) => {
            const parts = topic?.split('/') || [];
            const rawMac = data?.slaveId || data?.droneId || parts[2] || '';
            const msgMac = normalizeMac(rawMac);
            if (!msgMac || msgMac !== normalizeMac(macRef.current)) return;
            // Pick calibration fields wherever they are in the payload
            const cs = data?.cs ?? data?.sys_calib ?? null;
            const cg = data?.cg ?? data?.gyro_calib ?? null;
            const ca = data?.ca ?? data?.acc_calib ?? null;
            const cm = data?.cm ?? data?.mag_calib ?? null;
            if (cs === null && cg === null && ca === null && cm === null) return;
            setLiveStats(prev => ({
                cs: cs !== null ? cs : prev.cs,
                cg: cg !== null ? cg : prev.cg,
                ca: ca !== null ? ca : prev.ca,
                cm: cm !== null ? cm : prev.cm,
            }));
        };
        socket.on('mqtt:message', handler);
        return () => socket.off('mqtt:message', handler);
    }, [socket]);

    // ── Derived ────────────────────────────────────────────────────────────────
    const mac = selectedSlave;
    const slaves = devices.filter(d => d.role !== 'master' && (d.status === 'online' || d.is_active));

    // Prefer liveStats (direct socket) over rtTelemetry prop passthrough
    const telRaw = rtTelemetry[normalizeMac(mac)] || {};
    const calibStats = {
        cs: liveStats.cs || telRaw.cs || telRaw.sys_calib || 0,
        cg: liveStats.cg || telRaw.cg || telRaw.gyro_calib || 0,
        ca: liveStats.ca || telRaw.ca || telRaw.acc_calib || 0,
        cm: liveStats.cm || telRaw.cm || telRaw.mag_calib || 0,
    };

    const sensorDef = SENSOR_OPTIONS.find(s => s.id === selectedSensor) || SENSOR_OPTIONS[0];
    const activeSteps = sensorDef.steps.map(k => ({ ...STEP_DEFS[k], id: k }));
    const currentStepIdx = activeSteps.findIndex(s => calibStats[s.key] < 3);
    const currentStep = currentStepIdx >= 0 ? activeSteps[currentStepIdx] : null;
    const allDone = activeSteps.every(s => calibStats[s.key] >= 3);

    // ── Animation loop ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!calibActive) { if (animFrame.current) cancelAnimationFrame(animFrame.current); return; }
        const tick = () => {
            animT.current += 0.05;
            setAnimTick(t => t + 1);
            animFrame.current = requestAnimationFrame(tick);
        };
        animFrame.current = requestAnimationFrame(tick);
        return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); };
    }, [calibActive]);

    // ── Chart ring buffer ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!calibActive) return;
        setChartData(prev => {
            const add = (arr, val) => [...arr.slice(-59), val];
            return {
                cs: add(prev.cs, calibStats.cs),
                cg: add(prev.cg, calibStats.cg),
                ca: add(prev.ca, calibStats.ca),
                cm: add(prev.cm, calibStats.cm),
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveStats.cs, liveStats.cg, liveStats.ca, liveStats.cm, calibActive]);

    // ── Toast on sensor reaching 3 ────────────────────────────────────────────
    useEffect(() => {
        if (!calibActive) return;
        const prev = prevCalib.current;
        const checks = [
            { key: 'cg', emoji: '📐', msg: '¡Giroscopio calibrado! Pasa al siguiente paso.' },
            { key: 'ca', emoji: '🔄', msg: '¡Acelerómetro calibrado!' + (selectedSensor === 'full' ? ' Ahora dibuja una figura de 8.' : '') },
            { key: 'cm', emoji: '🧭', msg: '¡Magnetómetro calibrado! Esperando confirmación...' },
        ];
        for (const c of checks) {
            if (prev[c.key] < 3 && calibStats[c.key] >= 3) {
                setStepToast({ msg: c.msg, emoji: c.emoji });
                setTimeout(() => setStepToast(null), 5000);
                break;
            }
        }
        prevCalib.current = { cg: calibStats.cg, ca: calibStats.ca, cm: calibStats.cm };
    }, [calibStats.cg, calibStats.ca, calibStats.cm, calibActive]);

    // ── Auto-complete ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (calibActive && allDone && mac) setCalibActive(false);
    }, [allDone, calibActive, mac]);

    // ── Socket: calib:complete ────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            if (!mac || data.mac !== mac) return;
            const dur = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
            setCalibDone({ ...data, durationMs: dur });
            setCalibActive(false);
            loadHistory(mac);
        };
        socket.on('calib:complete', handler);
        return () => socket.off('calib:complete', handler);
    }, [socket, mac]);

    // ── History ───────────────────────────────────────────────────────────────
    const loadHistory = useCallback(async (m) => {
        if (!m) return;
        setLoadingHistory(true);
        try {
            const res = await ControlService.getCalibrationHistory(m, 20);
            setHistory(res.data || []);
        } catch (error) {
            console.error('Error loading calibration history:', error);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'history' && mac) loadHistory(mac);
    }, [activeTab, mac, loadHistory]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleStart = (resetOnly = false) => {
        if (resetOnly === null) { setCalibDone(null); return; } // Reset calibDone
        if (!mac || !socket) return;
        setCalibDone(null);
        setLiveStats({ cs: 0, cg: 0, ca: 0, cm: 0 });
        setChartData({ cg: [], ca: [], cm: [], cs: [] });
        setRawSignals({ gx: [], gy: [], gz: [], ax: [], ay: [], az: [], mx: [], my: [], mz: [] });
        prevCalib.current = { cg: 0, ca: 0, cm: 0 };
        startTimeRef.current = Date.now();
        setCalibActive(true);
        socket.emit('mqtt:command', {
            topic: `drone/slave/${mac}/commands`,
            payload: { cmd: 'start_calib', sensor: selectedSensor },
        });
    };

    const handleCancel = () => {
        setCalibActive(false);
        if (mac && socket) {
            socket.emit('mqtt:command', {
                topic: `drone/slave/${mac}/commands`,
                payload: { cmd: 'stop_calib' },
            });
        }
    };

    const handleToggleRawStream = () => {
        const nextState = !rawStreamActive;
        setRawStreamActive(nextState);
        if (mac && socket) {
            socket.emit('mqtt:command', {
                topic: `drone/slave/${mac}/commands`,
                payload: { cmd: 'imu_stream', active: nextState },
            });
        }
    };

    const onSlaveChange = e => {
        setSelectedSlave(e.target.value);
        setCalibActive(false);
        setTestActive(false);
        setCalibDone(null);
        setLiveStats({ cs: 0, cg: 0, ca: 0, cm: 0 });
        setRawSignals({ gx: [], gy: [], gz: [], ax: [], ay: [], az: [], mx: [], my: [], mz: [] });
        setHistory([]);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Internal tabs ───────────────────────────────────────────── */}
            <div className="d-flex gap-1 mb-3">
                {[
                    { id: 'calibrate', label: 'Calibrar', icon: cilSettings },
                    { id: 'history', label: 'Historial', icon: cilHistory },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className="d-flex align-items-center gap-1 px-3 py-1 rounded small fw-bold"
                        style={{
                            background: activeTab === tab.id ? 'rgba(32,201,151,0.15)' : 'rgba(255,255,255,0.04)',
                            border: activeTab === tab.id ? '1px solid #20c99766' : '1px solid rgba(255,255,255,0.08)',
                            color: activeTab === tab.id ? '#20c997' : '#94a3b8',
                            cursor: 'pointer', transition: 'all 0.18s',
                        }}>
                        <CIcon icon={tab.icon} style={{ width: 12 }} /> {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'calibrate' ? (
                <CalibrationTab
                    selectedSlave={selectedSlave}
                    onSlaveChange={onSlaveChange}
                    calibActive={calibActive}
                    testActive={testActive}
                    setTestActive={setTestActive}
                    slaves={slaves}
                    selectedSensor={selectedSensor}
                    setSelectedSensor={setSelectedSensor}
                    sensorOptions={SENSOR_OPTIONS}
                    sensorDef={sensorDef}
                    currentStep={currentStep}
                    activeSteps={activeSteps}
                    calibStats={calibStats}
                    stepToast={stepToast}
                    chartData={chartData}
                    rawSignals={rawSignals}
                    handleCancel={handleCancel}
                    allDone={allDone}
                    calibDone={calibDone}
                    handleStart={handleStart}
                    t={animT.current}
                    stepDefs={STEP_DEFS}
                    rawStreamActive={rawStreamActive}
                    handleToggleRawStream={handleToggleRawStream}
                />
            ) : (
                <HistoryTab
                    mac={mac}
                    loadHistory={loadHistory}
                    loadingHistory={loadingHistory}
                    history={history}
                    sensorOptions={SENSOR_OPTIONS}
                />
            )}
        </div>
    );
};

export default CalibrationPanel;
