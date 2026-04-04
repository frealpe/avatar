import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import * as THREE from 'three';
import CIcon from '@coreui/icons-react';
import { cilDevices, cilNotes, cilHome, cilSettings } from '@coreui/icons';

import { ThreeSceneHelper } from './ThreeSceneHelper';
import ControlService from '../../../service/control/control.service';
import { SocketContext } from '../../../context/SocketContext';

import SceneSidebar from './SceneSidebar';
import StationPanel from './StationPanel';
import TrajectoriesPanel from './TrajectoriesPanel';
import MissionControl from '../mission/MissionControl';
import SwarmMonitor from '../mission/SwarmMonitor';
import AvionicsHUD from './AvionicsHUD';
import CalibrationPanel from './CalibrationPanel';
import CalibrationWorkspace from './calibration/CalibrationWorkspace';

// ── Sidebar tab definitions ────────────────────────────────────────────────────
const TABS = [
    { id: 'mission', label: 'Centro de Misión', icon: cilHome, color: '#ffc107' },
    { id: 'station', label: 'Estación', icon: cilDevices, color: '#0dcaf0' },
    { id: 'calibration', label: 'Calibración', icon: cilSettings, color: '#20c997' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const normalizeMac = (m) => m ? m.replace(/:/g, '').toLowerCase() : '';

// ── ThreeTrajectoryScene ───────────────────────────────────────────────────────
const ThreeTrajectoryScene = () => {
    const mountRef = useRef(null);
    const helperRef = useRef(null);
    const { socket } = useContext(SocketContext);

    // ── Devices ────────────────────────────────────────────────────────────────
    const [devices, setDevices] = useState([]);
    const [selectedSlaveIds, setSelectedSlaveIds] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

    // ── Saved trajectories ───────────────────────────────────────────────────
    const [trajectories, setTrajectories] = useState([]);
    const [newTrajectoryName, setNewTrajectoryName] = useState('');
    const [activeTrajectoryName, setActiveTrajectoryName] = useState('Circular (Generada)');

    // ── Swarm & Mission State (Lifts from MissionControl) ─────────────────────
    const [missionActive, setMissionActive] = useState(false);
    const [swarmState, setSwarmState] = useState({});
    const [rtTelemetry, setRtTelemetry] = useState({}); // Realtime telemetry for HUD
    const msgCountRef = useRef(0);

    // ── Grid ──────────────────────────────────────────────────────────────────
    const [gridSize, setGridSize] = useState(20);
    const [gridDivisions, setGridDivisions] = useState(20);
    const [gridHeight, setGridHeight] = useState(1.5);

    // ── Trajectory params ─────────────────────────────────────────────────────
    const [trajectoryType, setTrajectoryType] = useState('circular');
    const [radius, setRadius] = useState(6);
    const [zAmplitude, setZAmplitude] = useState(1);
    const [numPoints, setNumPoints] = useState(36);   // curve resolution
    const [phaseDist, setPhaseDist] = useState(1.2);
    const [petals, setPetals] = useState(2);
    const [droneAltitudes, setDroneAltitudes] = useState({});
    const [droneOscillation, setDroneOscillation] = useState({});
    const [relativeSpread, setRelativeSpread] = useState(0);
    const [oppositeStart, setOppositeStart] = useState(true);
    const [bases, setBases] = useState({});

    // ── Directional Offsets ──────────────────────────────────────────────────
    const [globalControl, setGlobalControl] = useState(true);
    const [routeOffsets, setRouteOffsets] = useState({
        global: { x: 0, y: 0, z: 0 },
        individual: {} // { mac: { x, y, z } }
    });

    // ── Internal ──────────────────────────────────────────────────────────────
    const [isSimulating, setIsSimulating] = useState(false);
    const [simSpeed, setSimSpeed] = useState(1);
    const [activeSideTab, setActiveSideTab] = useState('mission'); // track sidebar tab
    const isCalibTab = activeSideTab === 'calibration';

    // ── Calibration State (Lifts from CalibrationPanel) ─────────────────────
    const [selectedCalibSlave, setSelectedCalibSlave] = useState('');
    const [selectedCalibSensor, setSelectedCalibSensor] = useState('full');
    const [rawCalibSignals, setRawCalibSignals] = useState({
        gx: [], gy: [], gz: [],
        ax: [], ay: [], az: [],
        mx: [], my: [], mz: []
    });
    const [calibTestActive, setCalibTestActive] = useState(false);
    const [rawStreamActive, setRawStreamActive] = useState(false);

    // ── Load devices ──────────────────────────────────────────────────────────
    const loadDevices = useCallback(async () => {
        setLoadingDevices(true);
        const res = await ControlService.getDevices();
        if (res.ok) {
            const devs = res.data || [];
            setDevices(devs);
            // Auto-select slaves if none selected
            if (selectedSlaveIds.length === 0) {
                const slaves = devs.filter(d => d.role !== 'master');
                setSelectedSlaveIds(slaves.map(s => s._id));
            }
        }
        setLoadingDevices(false);
    }, [selectedSlaveIds.length]);

    const loadTrajectories = async () => {
        const res = await ControlService.getTrajectories();
        if (res.ok) setTrajectories([...(res.data || [])].reverse());
    };

    useEffect(() => {
        loadDevices();
        loadTrajectories();
    }, []); // Run once on mount

    // ── Auto-select calibration slave ─────────────────────────────────────────
    useEffect(() => {
        if (isCalibTab && !selectedCalibSlave && devices.length > 0) {
            const firstSlave = devices.find(d => d.role !== 'master');
            if (firstSlave) {
                setSelectedCalibSlave(normalizeMac(firstSlave.mac_address || firstSlave.mac));
            }
        }
    }, [isCalibTab, selectedCalibSlave, devices]);

    // ── Socket Events (Lifts from MissionControl) ───────────────────────────
    useEffect(() => {
        if (!socket) return;
        const onStart = () => { setMissionActive(true); };
        const onStop = () => { setMissionActive(false); };
        const onCoreUpdate = (data) => setSwarmState(prev => ({ ...prev, [data.mac]: data }));

        const onMqttMessage = (data) => {
            if (data?.topic?.includes('telemetry') || data?.topic?.includes('data')) {
                const rawMac = data.data?.slaveId || data.data?.droneId || data.topic.split('/')[2];
                if (rawMac) {
                    const mac = normalizeMac(rawMac);
                    setRtTelemetry(prev => ({ ...prev, [mac]: data.data }));

                    msgCountRef.current++;

                    // If we are in calibration tab and this is the selected drone, capture raw signals
                    const selectedMac = normalizeMac(selectedCalibSlave);

                    // Filter match
                    const isMatch = selectedMac && (mac === selectedMac || mac.includes(selectedMac) || selectedMac.includes(mac));

                    if (isCalibTab && isMatch) {
                        const payload = data.data || {};

                        if (msgCountRef.current % 10 === 0) {
                            console.log(`[CALIB MATCH] Data from ${mac}. First values: gx=${payload.gx}, ax=${payload.ax}`);
                        }

                        // Extract with fallback for multiple naming conventions
                        // Also support qx, qy, qz as fallback for gx, gy, gz if user is using it that way
                        const gx = payload.gx ?? payload.gyro_x ?? payload.qx ?? (Array.isArray(payload.g) ? payload.g[0] : null);
                        const gy = payload.gy ?? payload.gyro_y ?? payload.qy ?? (Array.isArray(payload.g) ? payload.g[1] : null);
                        const gz = payload.gz ?? payload.gyro_z ?? payload.qz ?? (Array.isArray(payload.g) ? payload.g[2] : null);

                        const ax = payload.ax ?? payload.acc_x ?? (Array.isArray(payload.a) ? payload.a[0] : null);
                        const ay = payload.ay ?? payload.acc_y ?? (Array.isArray(payload.a) ? payload.a[1] : null);
                        const az = payload.az ?? payload.acc_z ?? (Array.isArray(payload.a) ? payload.a[2] : null);

                        const mx = payload.mx ?? payload.mag_x ?? (Array.isArray(payload.m) ? payload.m[0] : null);
                        const my = payload.my ?? payload.mag_y ?? (Array.isArray(payload.m) ? payload.m[1] : null);
                        const mz = payload.mz ?? payload.mag_z ?? (Array.isArray(payload.m) ? payload.m[2] : null);

                        // Parse to float if value exists
                        const parse = (v) => {
                            if (v === null || v === undefined || v === '') return null;
                            const n = parseFloat(v);
                            return isNaN(n) ? null : n;
                        };

                        const gx_val = parse(gx);
                        const gy_val = parse(gy);
                        const gz_val = parse(gz);
                        const ax_val = parse(ax);
                        const ay_val = parse(ay);
                        const az_val = parse(az);
                        const mx_val = parse(mx);
                        const my_val = parse(my);
                        const mz_val = parse(mz);

                        // If at least one valid value arrived, update the signals
                        if (gx_val !== null || gy_val !== null || gz_val !== null ||
                            ax_val !== null || ay_val !== null || az_val !== null ||
                            mx_val !== null || my_val !== null || mz_val !== null) {

                            setRawCalibSignals(prev => {
                                const add = (arr, val) => {
                                    const safeArr = Array.isArray(arr) ? arr : [];
                                    const nextVal = val !== null ? val : (safeArr[safeArr.length - 1] ?? 0);
                                    return [...safeArr.slice(-159), nextVal];
                                };
                                return {
                                    gx: add(prev.gx, gx_val),
                                    gy: add(prev.gy, gy_val),
                                    gz: add(prev.gz, gz_val),
                                    ax: add(prev.ax, ax_val),
                                    ay: add(prev.ay, ay_val),
                                    az: add(prev.az, az_val),
                                    mx: add(prev.mx, mx_val),
                                    my: add(prev.my, my_val),
                                    mz: add(prev.mz, mz_val),
                                };
                            });
                            // Expose for debugging if needed
                            window.lastRawCalib = payload;
                        }
                    } else if (isCalibTab && selectedMac && msgCountRef.current % 100 === 0) {
                        console.log(`[CALIB MISMATCH] Recv: ${mac}, Wanted: ${selectedMac}`);
                    }
                }
            }
        };

        // Patch device status in-memory when the server emits a status change
        const onDeviceStatus = ({ mac, status }) => {
            if (!mac || !status) return;
            setDevices(prev => prev.map(d =>
                (d.mac === mac || d.mac_address === mac) ? { ...d, status } : d
            ));
        };

        socket.on('mission:start', onStart);
        socket.on('mission:stop', onStop);
        socket.on('core:update', onCoreUpdate);
        socket.on('mqtt:message', onMqttMessage);
        socket.on('device:status_update', onDeviceStatus);

        return () => {
            socket.off('mission:start', onStart);
            socket.off('mission:stop', onStop);
            socket.off('core:update', onCoreUpdate);
            socket.off('mqtt:message', onMqttMessage);
            socket.off('device:status_update', onDeviceStatus);
        };
    }, [socket, isCalibTab, selectedCalibSlave]);

    // ── Effect: Sync with helper ──────────────────────────────────────────────
    useEffect(() => {
        if (!mountRef.current) return;
        const helper = new ThreeSceneHelper(mountRef.current, {
            swarmCount: devices.filter(d => d.role !== 'master').length,
            masterColor: 0x00ff00
        });
        helperRef.current = helper;

        // Restore Waypoints
        helper.createWaypoints([
            new THREE.Vector3(-4, 1.5, -4),
            new THREE.Vector3(-2, 1.5, 0),
            new THREE.Vector3(2, 1.5, 2),
            new THREE.Vector3(4, 1.5, 4),
        ]);
        const slaves = devices.filter(d => d.role !== 'master');
        helper.updateSwarm(slaves);

        // Sync Initial State
        helper.setTrajectoryType(trajectoryType, {
            radius, zAmplitude, numPoints, phaseDist, petals,
            droneAltitudes, droneOscillation,
            width: gridSize * 0.8, length: gridSize * 0.8, spacing: 2,
            relativeSpread, oppositeStart, bases, routeOffsets
        });
        helper.applyAltitudeShift(gridHeight);

        const animate = () => {
            if (helperRef.current) helperRef.current.render();
            requestAnimationFrame(animate);
        };
        const requestID = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(requestID);
            helper.dispose();
        };
    }, [devices, gridHeight]);

    // ── Helper constants for SwarmMonitor ──
    const DRONE_COLORS_HEX = [
        '#00ffff', '#ff00ff', '#ffff00', '#00ff00',
        '#ff8800', '#88ff00', '#0088ff', '#ff0088'
    ];
    const MODE_COLORS = {
        MISSION: 'success', EVASION: 'danger', SAFETY: 'danger',
        COOPERATIVE: 'info', RETURN: 'warning', LANDING: 'warning',
        FAULT: 'dark', IDLE: 'secondary', TRAJECTORY: 'success'
    };

    // ── Reactive 3D updates ───────────────────────────────────────────────────
    useEffect(() => {
        const slaves = devices.filter(d => d.role !== 'master');
        helperRef.current?.updateSwarm(slaves);
    }, [devices]);

    useEffect(() => { helperRef.current?.updateGrid(gridSize, gridDivisions); }, [gridSize, gridDivisions]);

    useEffect(() => { helperRef.current?.applyAltitudeShift(gridHeight); }, [gridHeight]);

    useEffect(() => {
        helperRef.current?.setTrajectoryType(trajectoryType, {
            radius, zAmplitude, numPoints, phaseDist, petals,
            droneAltitudes, droneOscillation,
            width: gridSize * 0.8, length: gridSize * 0.8, spacing: 2,
            relativeSpread, oppositeStart, bases, routeOffsets
        });
        if (trajectoryType === 'circular') setActiveTrajectoryName('Circular (Generada)');
        if (trajectoryType === 'flower') setActiveTrajectoryName('Flor (Generada)');
        if (trajectoryType === 'spiral') setActiveTrajectoryName('Espiral Cónica (Generada)');
    }, [trajectoryType, radius, zAmplitude, numPoints, phaseDist, petals, droneAltitudes, droneOscillation, gridSize, relativeSpread, oppositeStart, bases, routeOffsets]);

    useEffect(() => { helperRef.current?.toggleSimulation(isSimulating, simSpeed); }, [isSimulating, simSpeed]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleGridHeightChange = val => {
        setGridHeight(val);
        helperRef.current?.applyAltitudeShift(val);
    };

    const handleSaveTrajectory = async () => {
        if (!helperRef.current) return;
        const name = newTrajectoryName.trim();
        if (!name) return;
        const data = helperRef.current.getDroneTrajectories();
        if (!data?.length) { alert('No hay trayectorias generadas.'); return; }
        const waypoints = data[0].map(p => ({
            lat: parseFloat(p.x.toFixed(4)),
            lon: parseFloat(p.z.toFixed(4)),
            altitude: parseFloat(p.y.toFixed(4)),
        }));
        const res = await ControlService.saveTrajectory({
            name,
            description: `Patrón ${trajectoryType}`,
            waypoints,
            defaultAltitude: 0,
            // Save current pattern type and params for later restore
            patternType: trajectoryType,
            params: { radius, zAmplitude, petals, phaseDist, numPoints },
        });
        if (res.ok) { alert('Trayectoria guardada.'); setNewTrajectoryName(''); loadTrajectories(); }
        else alert('Error: ' + res.error);
    };

    const handleSendSavedMission = traj => {
        const activeSlaves = devices.filter(d => selectedSlaveIds.includes(d._id));
        if (activeSlaves.length === 0) { alert('Selecciona al menos un Slave.'); return; }
        if (!socket) { alert('Sin conexión WebSocket.'); return; }
        socket.emit('mqtt:command', {
            topic: 'drone/all/mission',
            payload: {
                id_mision: `DB_MISSION_${traj._id}_${Date.now()}`,
                num_drones: activeSlaves.length,
                drones: activeSlaves.map(d => {
                    return {
                        id_dron: d.mac || d.mac_address,
                        device_name: d.name || 'Drone',
                        waypoints: traj.waypoints.map(p => ({
                            x: parseFloat(p.lat.toFixed(3)),
                            y: parseFloat(p.altitude.toFixed(3)),
                            z: parseFloat(p.lon.toFixed(3)),
                        })),
                    };
                }),
            },
        });
        alert(`Misión "${traj.name}" enviada.`);
    };

    const toggleSlaveSelection = id =>
        setSelectedSlaveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleDroneAltitudeChange = (id, val) =>
        setDroneAltitudes(prev => {
            const next = { ...prev };
            if (val === '' || val === undefined || isNaN(val)) delete next[id];
            else next[id] = Number(val);
            return next;
        });

    const toggleDroneOscillation = id =>
        setDroneOscillation(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));

    const handleLoadTrajectory = (traj) => {
        if (!traj) return;

        // Determine the effective type:
        // 1. Explicit patternType field (new saves)
        // 2. Fallback: parse description "Patrón spiral" / "Patrón circular" / "Patrón flower" (old saves)
        // 3. Keep current type
        let type = traj.patternType;
        if (!type && traj.description) {
            const desc = traj.description.toLowerCase();
            if (desc.includes('spiral') || desc.includes('espiral')) type = 'spiral';
            else if (desc.includes('flower') || desc.includes('flor')) type = 'flower';
            else if (desc.includes('circular')) type = 'circular';
        }
        type = type || trajectoryType;

        // Build params — start from current values, override with saved ones if present
        const p = traj.params || {};
        const newRadius = p.radius !== undefined ? p.radius : radius;
        const newZAmp = p.zAmplitude !== undefined ? p.zAmplitude : zAmplitude;
        const newPetals = p.petals !== undefined ? p.petals : petals;
        const newPhaseDist = p.phaseDist !== undefined ? p.phaseDist : phaseDist;
        const newNumPts = p.numPoints !== undefined ? p.numPoints : numPoints;

        // Update React state (for sliders etc.)
        setTrajectoryType(type);
        if (p.radius !== undefined) setRadius(newRadius);
        if (p.zAmplitude !== undefined) setZAmplitude(newZAmp);
        if (p.petals !== undefined) setPetals(newPetals);
        if (p.phaseDist !== undefined) setPhaseDist(newPhaseDist);
        if (p.numPoints !== undefined) setNumPoints(newNumPts);
        setActiveTrajectoryName(traj.name || 'Cargada');

        // Force immediate scene redraw — React may skip the useEffect
        // if the type/params haven't changed from current state
        helperRef.current?.setTrajectoryType(type, {
            radius: newRadius, zAmplitude: newZAmp, numPoints: newNumPts,
            phaseDist: newPhaseDist, petals: newPetals,
            droneAltitudes, droneOscillation,
            width: gridSize * 0.8, length: gridSize * 0.8, spacing: 2,
            relativeSpread, oppositeStart, bases, routeOffsets,
        });
    };


    const resetWaypoints = () => {
        // Disable oscillation for every known slave
        const slaves = devices.filter(d => d.role !== 'master');
        const noOscillation = Object.fromEntries(slaves.map(d => [d._id, false]));

        setTrajectoryType('circular');
        setDroneOscillation(noOscillation);   // disable oscillation for all
        setDroneAltitudes({});                // clear per-drone altitude overrides
        setRouteOffsets({ global: { x: 0, y: 0, z: 0 }, individual: {} }); // clear D-Pad offsets
        setActiveTrajectoryName('Circular (Generada)');

        helperRef.current?.applyAltitudeShift(gridHeight);
    };


    const handleDeleteTrajectory = async (id) => {
        const res = await ControlService.deleteTrajectory(id);
        if (res.ok) loadTrajectories();
        else alert('Error al eliminar: ' + res.error);
    };

    const handleRenameTrajectory = async (id, newName) => {
        const res = await ControlService.updateTrajectory(id, { name: newName });
        if (res.ok) loadTrajectories();
        else alert('Error al renombrar: ' + res.error);
    };

    const handleUpdateHomeBases = useCallback((basesMap) => {
        setBases(basesMap);
        const slaves = devices.filter(d => d.role !== 'master');
        helperRef.current?.updateHomeBases(basesMap, slaves);
    }, [devices]);

    const getMissionWaypoints = () =>
        helperRef.current
            ? helperRef.current.getWaypointPositions().map(p => ({
                x: parseFloat(p.x.toFixed(3)),
                y: parseFloat(p.y.toFixed(3)),
                z: parseFloat(p.z.toFixed(3)),
            }))
            : [];

    const handleRouteOffset = (axis, amount) => {
        setRouteOffsets(prev => {
            const next = { ...prev, individual: { ...prev.individual } };
            if (globalControl) {
                next.global = { ...next.global, [axis]: next.global[axis] + amount };
            } else {
                // Apply to selected slaves or all slaves if none selected
                const targetSlaves = selectedSlaveIds.length > 0
                    ? devices.filter(d => selectedSlaveIds.includes(d._id))
                    : devices.filter(d => d.role !== 'master');

                targetSlaves.forEach(d => {
                    const mac = d.mac_address || d.mac;
                    if (!next.individual[mac]) next.individual[mac] = { x: 0, y: 0, z: 0 };
                    next.individual[mac] = {
                        ...next.individual[mac],
                        [axis]: next.individual[mac][axis] + amount
                    };
                });
            }
            return next;
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="d-flex w-100 h-100 overflow-hidden rounded shadow border border-dark">
            {/* ── Main Content Area ─────────────────────────────────────────── */}
            <div className="flex-grow-1 position-relative h-100 overflow-hidden">
                {/* HUD Overlays — ocultas en modo Calibración */}
                {!isCalibTab && (
                    <div className="position-absolute d-flex flex-column gap-2" style={{ top: '20px', left: '20px', zIndex: 1000, pointerEvents: 'none' }}>
                        {/* Swarm Monitor Overlay */}
                        <SwarmMonitor
                            missionActive={missionActive}
                            activeSlaves={devices.filter(d => selectedSlaveIds.includes(d._id))}
                            swarmState={swarmState}
                            droneColors={DRONE_COLORS_HEX}
                            modeColors={MODE_COLORS}
                        />
                        {/* Avionics HUD Overlay */}
                        <AvionicsHUD
                            activeSlaves={devices.filter(d => {
                                const mac = d.mac_address || d.mac;
                                return d.role !== 'master' && mac && rtTelemetry[normalizeMac(mac)];
                            })}
                            telemetry={rtTelemetry}
                        />
                    </div>
                )}

                {/* 3D canvas / Calibration Workspace */}
                <div className="w-100 h-100 bg-black" style={{ minHeight: '650px', display: isCalibTab ? 'none' : 'block' }}>
                    <div ref={mountRef} className="w-100 h-100" />
                </div>

                {isCalibTab && (
                    <div className="w-100 h-100 p-3" style={{ background: '#f8f9fa', minHeight: '650px' }}>
                        <CalibrationWorkspace
                            data={rawCalibSignals}
                            sensorType={selectedCalibSensor}
                            selectedSlaveName={devices.find(d => normalizeMac(d.mac_address || d.mac) === normalizeMac(selectedCalibSlave))?.name}
                        />
                    </div>
                )}
            </div>

            {/* Right sidebar */}
            <SceneSidebar tabs={TABS} initial="mission" stationId="station"
                onTabChange={id => setActiveSideTab(id || 'mission')}>
                {{
                    mission: (
                        <MissionControl
                            devices={devices}
                            selectedSlaveIds={selectedSlaveIds}
                            trajectoryWaypoints={getMissionWaypoints()}
                            onUpdateHomeBases={handleUpdateHomeBases}
                            activeTrajectoryName={activeTrajectoryName}
                            // Trajectory props
                            trajectories={trajectories}
                            onSendMission={handleSendSavedMission}
                            onLoadTrajectory={handleLoadTrajectory}
                            onDeleteTrajectory={handleDeleteTrajectory}
                            onRenameTrajectory={handleRenameTrajectory}
                            // Lifted state props
                            missionActive={missionActive}
                            swarmState={swarmState}
                        />
                    ),
                    station: (
                        <StationPanel
                            trajectoryType={trajectoryType} setTrajectoryType={setTrajectoryType}
                            gridHeight={gridHeight} onGridHeightChange={handleGridHeightChange}
                            radius={radius} setRadius={setRadius}
                            zAmplitude={zAmplitude} setZAmplitude={setZAmplitude}
                            petals={petals} setPetals={setPetals}
                            phaseDist={phaseDist} setPhaseDist={setPhaseDist}
                            numPoints={numPoints} setNumPoints={setNumPoints}
                            isSimulating={isSimulating} setIsSimulating={setIsSimulating}
                            simSpeed={simSpeed} setSimSpeed={setSimSpeed}
                            gridSize={gridSize} setGridSize={setGridSize}
                            gridDivisions={gridDivisions} setGridDivisions={setGridDivisions}
                            devices={devices} loadingDevices={loadingDevices}
                            selectedSlaveIds={selectedSlaveIds}
                            onToggleSlave={toggleSlaveSelection}
                            droneAltitudes={droneAltitudes}
                            onDroneAltitudeChange={handleDroneAltitudeChange}
                            droneOscillation={droneOscillation}
                            onToggleDroneOscillation={(id) => setDroneOscillation(prev => ({ ...prev, [id]: prev[id] === false }))}
                            relativeSpread={relativeSpread}
                            setRelativeSpread={setRelativeSpread}
                            oppositeStart={oppositeStart}
                            setOppositeStart={setOppositeStart}
                            newTrajectoryName={newTrajectoryName}
                            setNewTrajectoryName={setNewTrajectoryName}
                            onSaveTrajectory={handleSaveTrajectory}
                            onResetWaypoints={resetWaypoints}
                            // Route Offset Controls
                            globalControl={globalControl}
                            setGlobalControl={setGlobalControl}
                            handleRouteOffset={handleRouteOffset}
                        />
                    ),
                    calibration: (
                        <CalibrationPanel
                            devices={devices}
                            swarmState={swarmState}
                            rtTelemetry={rtTelemetry}
                            selectedSlave={selectedCalibSlave}
                            setSelectedSlave={setSelectedCalibSlave}
                            selectedSensor={selectedCalibSensor}
                            setSelectedSensor={setSelectedCalibSensor}
                            testActive={calibTestActive}
                            setTestActive={setCalibTestActive}
                            rawSignals={rawCalibSignals}
                            setRawSignals={setRawCalibSignals}
                            rawStreamActive={rawStreamActive}
                            setRawStreamActive={setRawStreamActive}
                        />
                    ),
                }}
            </SceneSidebar>

            <style>{`
                .hover-effect:hover { background: rgba(255,255,255,0.06); }
                ::-webkit-scrollbar       { width: 3px; }
                ::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ThreeTrajectoryScene;
