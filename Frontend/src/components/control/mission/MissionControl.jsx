import React, { useState, useEffect, useContext, useRef } from 'react';
import {
    CCard, CCardHeader, CCardBody, CButton,
    CBadge, CAlert
} from '@coreui/react-pro';
import {
    cilMediaPlay, cilMediaStop, cilNotes
} from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import ControlService from '../../../service/control/control.service';
import { SocketContext } from '../../../context/SocketContext';
import TrajectoriesPanel from '../three/TrajectoriesPanel';

// Modular Components
import MissionStatusHeader from './MissionStatusHeader';
import HomeBasesManager from './HomeBasesManager';
import SecurityConsole from './SecurityConsole';

// ── Constants ─────────────────────────────────────────────────────────────────
const MODE_COLORS = {
    MISSION: 'success',
    EVASION: 'danger',
    SAFETY: 'danger',
    COOPERATIVE: 'info',
    RETURN: 'warning',
    LANDING: 'warning',
    FAULT: 'dark',
    IDLE: 'secondary',
    TRAJECTORY: 'success'
};

const DRONE_COLORS_HEX = [
    '#00ffff', '#ff00ff', '#ffff00', '#00ff00',
    '#ff8800', '#88ff00', '#0088ff', '#ff0088'
];

/**
 * MissionControl Component
 * Refactored modular version.
 */
const MissionControl = ({
    devices = [],
    trajectoryWaypoints = [],
    selectedSlaveIds = [],
    onUpdateHomeBases,
    activeTrajectoryName,
    trajectories = [],
    onSendMission,
    onLoadTrajectory,
    onDeleteTrajectory,
    onRenameTrajectory,
    // New Props for lifted state
    missionActive,
    swarmState,
}) => {
    const { socket } = useContext(SocketContext);

    // -- Local State (Remaining) --
    const [missionMode, setMissionMode] = useState('IDLE');
    const [bases, setBases] = useState({});
    const [editingBases, setEditingBases] = useState({});
    const [corrections, setCorrections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const logContainerRef = useRef(null);

    // -- Lifecycle: Load Bases --
    useEffect(() => {
        (async () => {
            const res = await ControlService.getHomeBases();
            if (res.ok && res.data) {
                const map = {};
                res.data.forEach(b => { map[b.droneMac] = { x: b.x, y: b.y, z: b.z }; });
                setBases(map);
                onUpdateHomeBases?.(map);
            }
        })();
    }, [onUpdateHomeBases]);

    // -- Socket Event Listeners (Security Log focus) --
    useEffect(() => {
        if (!socket) return;

        const onCorrection = (data) => {
            setMissionMode(data.type || 'TRAJECTORY');
            setCorrections(prev => [{ ...data, ts: new Date() }, ...prev].slice(0, 10));
        };
        const onCoreLog = (data) => {
            setCorrections(prev => [{ type: 'CORE', msg: data.msg, droneMac: data.mac, ts: new Date() }, ...prev].slice(0, 20));
        };

        socket.on('mission:correction', onCorrection);
        socket.on('core:log', onCoreLog);

        return () => {
            socket.off('mission:correction', onCorrection);
            socket.off('core:log', onCoreLog);
        };
    }, [socket]);

    // -- Handlers --
    const handleToggleEdit = (mac) => {
        setEditingBases(prev => ({ ...prev, [mac]: !prev[mac] }));
    };

    const handleBaseChange = (mac, axis, value) => {
        const newBases = {
            ...bases,
            [mac]: { ...(bases[mac] || { x: 0, y: 1.5, z: 0 }), [axis]: Number(value) }
        };
        setBases(newBases);
        onUpdateHomeBases?.(newBases);
    };

    const handleSetBase = async (device) => {
        const mac = device.mac_address || device.mac;
        const b = bases[mac] || { x: 0, y: 1.5, z: 0 };
        const res = await ControlService.setHomeBase(mac, device.droneId || mac, b.x, b.y, b.z);
        if (!res.ok) setErrorMsg(`Error guardando base: ${res.error}`);
        else setEditingBases(prev => ({ ...prev, [mac]: false }));
    };

    const handleStart = async () => {
        setLoading(true); setErrorMsg('');

        // Map selected _id values → real MAC addresses from devices array
        const slaveDevices = selectedSlaveIds.length > 0
            ? devices.filter(d => selectedSlaveIds.includes(d._id) && (d.role === 'slave' || !d.role))
            : devices.filter(d => d.role === 'slave' || !d.role);
        const macs = slaveDevices.map(d => d.mac || d.mac_address).filter(Boolean);

        if (macs.length === 0) {
            setErrorMsg('No hay slaves disponibles con MAC registrada.');
            setLoading(false); return;
        }

        const wps = trajectoryWaypoints.map(wp => ({ x: wp.x ?? 0, y: Math.max(1.0, Math.min(10.0, wp.y ?? 1.5)), z: wp.z ?? 0 }));

        if (wps.length === 0) {
            setErrorMsg('No hay trayectoria cargada.');
            setLoading(false); return;
        }

        const res = await ControlService.startMission(wps, macs);
        if (!res.ok) setErrorMsg(`Error al iniciar: ${res.error}`);
        setLoading(false);
    };

    const handleStop = async () => {
        const res = await ControlService.stopMission();
        if (!res.ok) setErrorMsg(`Error al detener: ${res.error}`);
    };

    // -- Filter active slaves --
    const activeSlaves = devices.filter(d => d.role === 'slave' || !d.role);

    return (
        <CCard className="border-0 bg-transparent">
            <CCardHeader className="bg-transparent border-bottom border-secondary px-0 pt-0 pb-2">
                <MissionStatusHeader
                    missionActive={missionActive}
                    missionMode={missionMode}
                    modeColors={MODE_COLORS}
                />
            </CCardHeader>

            <CCardBody className="px-0 pb-0">
                <div className="mb-3 border-bottom border-secondary pb-3">
                    <div className="small text-muted fw-bold mb-2 d-flex align-items-center gap-2">
                        <CIcon icon={cilNotes} size="sm" /> Seleccionar Trayectoria
                    </div>
                    <TrajectoriesPanel
                        trajectories={trajectories}
                        onSendMission={onSendMission}
                        onLoadTrajectory={onLoadTrajectory}
                        onDeleteTrajectory={onDeleteTrajectory}
                        onRenameTrajectory={onRenameTrajectory}
                    />
                </div>

                {errorMsg && <CAlert color="danger" className="py-2 small">{errorMsg}</CAlert>}

                <HomeBasesManager
                    activeSlaves={activeSlaves}
                    bases={bases}
                    editingBases={editingBases}
                    onBaseChange={handleBaseChange}
                    onSetBase={handleSetBase}
                    onToggleEdit={handleToggleEdit}
                />

                <div className="mb-2">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="small text-muted fw-bold">Ruta activa:</span>
                        <CBadge color="dark" className="border border-secondary text-info">
                            {activeTrajectoryName || 'Ninguna'}
                        </CBadge>
                    </div>
                    <div className="d-flex gap-2">
                        <CButton
                            color={missionActive ? 'secondary' : 'success'} size="sm" variant="outline"
                            className="flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                            onClick={handleStart}
                            disabled={missionActive || loading || activeSlaves.length === 0}
                        >
                            <CIcon icon={cilMediaPlay} size="sm" /> {loading ? '...' : 'Iniciar'}
                        </CButton>
                        <CButton
                            color="danger" size="sm" variant="outline"
                            className="flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                            onClick={handleStop}
                            disabled={loading}
                        >
                            <CIcon icon={cilMediaStop} size="sm" /> Stop
                        </CButton>
                    </div>
                </div>

                <SecurityConsole corrections={corrections} logContainerRef={logContainerRef} />
            </CCardBody>
        </CCard>
    );
};

export default MissionControl;
