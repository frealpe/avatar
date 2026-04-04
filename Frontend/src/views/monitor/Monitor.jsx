import { useEffect, useState, useContext, useCallback } from 'react';
import { CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilMonitor, cilSignalCellular4, cilCompass, cilChartLine, cilList } from '@coreui/icons';
import { SocketContext } from '../../context/SocketContext';
import OrientationView from './OrientationView';
import AdcRealtimeChartVega from '../../components/graficos/AdcRealtimeChartVega';
import TableHOC from '../../components/tablas/TableHOC';
import SignalBars from './SignalBars';
import ControlService from '../../service/control/control.service';

const Monitor = () => {
    const { socket, online } = useContext(SocketContext);
    const [messages, setMessages] = useState([]);
    const [devices, setDevices] = useState([]);
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [telemetryData, setTelemetryData] = useState([]);

    // 1. Fetch initially from DB
    useEffect(() => {
        const fetchDevices = async () => {
            const res = await ControlService.getAllDevices();
            if (res.ok) {
                setDevices(res.data.map(d => ({
                    id: d.mac || d.mac_address || d.device_uid,
                    device_uid: d.uid || d.device_uid,
                    mac_address: d.mac || d.mac_address,   // Device schema usa 'mac'
                    name: d.name,
                    isMaster: d.role === 'master',
                    status: d.status || 'offline',     // 'status' no 'is_active'
                    rssi: d.rssi ?? -60,
                    timestamp: d.lastSeen ? new Date(d.lastSeen) : new Date(),
                    data: null,
                    topic: ''
                })));
            }
        };
        fetchDevices();
    }, []);

    // 2. Listen to WebSocket
    useEffect(() => {
        if (!socket) return;

        const handler = (data) => {
            const timestamp = new Date();
            const tsStr = timestamp.toLocaleTimeString();
            const id = Math.random().toString(16).slice(2);
            const newMsg = { ...data, ts: tsStr, id, timestamp };

            setMessages(prev => [newMsg, ...prev.slice(0, 49)]);

            // Identify device (Master or Slave)
            let deviceId = data.data?.slaveId || data.data?.droneId;

            // If it's a slave topic, extract deviceId from topic: drone/slave/{mac}/data
            if (!deviceId && data.topic?.includes('drone/slave/')) {
                const parts = data.topic.split('/');
                if (parts.length >= 3) deviceId = parts[2];
            }

            // Fallback to other possible IDs
            if (!deviceId) {
                deviceId = data.data?.masterId || data.data?.mac || data.topic || 'unknown';
            }

            const isMaster = data.topic?.includes('master') || (deviceId === data.data?.masterId);
            const deviceName = data.data?.name || (isMaster ? 'Master' : 'Slave');

            // Update devices list (upsert)
            setDevices(prev => {
                const existingIdx = prev.findIndex(d =>
                    d.id === deviceId ||
                    d.mac_address === deviceId ||
                    (d.device_uid && d.device_uid === deviceId)
                );

                if (existingIdx >= 0) {
                    const next = [...prev];
                    const existingDevice = next[existingIdx];
                    next[existingIdx] = {
                        ...existingDevice,
                        status: data.data?.status || 'online',
                        rssi: data.data?.rssi || existingDevice.rssi || -60,
                        timestamp: timestamp,
                        data: data.data,
                        topic: data.topic
                    };
                    return next;
                }

                const updatedDevice = {
                    id: deviceId,
                    device_uid: deviceId,
                    mac_address: deviceId,
                    name: deviceName,
                    isMaster: isMaster,
                    status: data.data?.status || 'online',
                    rssi: data.data?.rssi || -60,
                    timestamp: timestamp,
                    data: data.data,
                    topic: data.topic
                };
                return [...prev, updatedDevice];
            });

            // If it's telemetry, update telemetry state for chart
            if (data.topic?.includes('telemetry') || data.data?.telemetry || data.data?.qw !== undefined || data.topic?.includes('data')) {
                const val = data.data?.b || data.data?.bat || data.data?.telemetry?.dynamics?.battery_level || data.data?.voltage || Math.random() * 10;
                setTelemetryData(prev => [
                    ...prev.slice(-19),
                    { timestamp, voltage: val }
                ]);
            }
        };

        const statusHandler = (payload) => {
            if (payload && payload.mac && payload.status) {
                setDevices(prev => {
                    const next = [...prev];
                    const idx = next.findIndex(d =>
                        d.mac_address === payload.mac ||
                        d.id === payload.mac ||
                        d.mac === payload.mac   // por si el objeto tiene .mac
                    );
                    if (idx >= 0) {
                        next[idx] = { ...next[idx], status: payload.status, timestamp: new Date() };
                        return next;
                    }
                    return prev;
                });
            }
        };

        socket.on('mqtt:message', handler);
        socket.on('device:status_update', statusHandler);

        return () => {
            socket.off('mqtt:message', handler);
            socket.off('device:status_update', statusHandler);
        };
    }, [socket]);

    // Heartbeat check: mark devices as offline if no message for 15s
    useEffect(() => {
        const interval = setInterval(() => {
            setDevices(prev => {
                let changed = false;
                const next = prev.map(d => {
                    const diff = Date.now() - new Date(d.timestamp).getTime();
                    if (d.status !== 'offline' && diff > 15000) {
                        changed = true;
                        return { ...d, status: 'offline' };
                    }
                    return d;
                });
                return changed ? next : prev;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const getOrientation = () => {
        const targetData = selectedMsg?.data || selectedMsg; // Handle both direct msg and device object

        // Support new short ESP-NOW JSON keys
        if (targetData?.qw !== undefined) {
            return { x: Number(targetData.qx), y: Number(targetData.qy), z: Number(targetData.qz), w: Number(targetData.qw) };
        }

        if (targetData?.telemetry?.orientation) {
            const { quat_x, quat_y, quat_z, quat_w } = targetData.telemetry.orientation;
            return { x: quat_x, y: quat_y, z: quat_z, w: quat_w };
        }
        return { x: 0, y: 0, z: 0, w: 1 };
    };

    const handleRowClick = useCallback((dev) => {
        setSelectedMsg(dev);
    }, []);

    return (
        <CRow>
            {/* Q1: Device Centric Table (Top Left) */}
            <CCol md={6} className="mb-4">
                <CCard className="h-100 shadow-sm">
                    <CCardHeader className="bg-dark text-white d-flex justify-content-between align-items-center">
                        <strong><CIcon icon={cilMonitor} className="me-2" /> Connected Devices</strong>
                        <span className={`badge ${online ? 'bg-success' : 'bg-danger'}`}>{online ? 'Websocket OK' : 'Offline'}</span>
                    </CCardHeader>
                    <CCardBody style={{ height: '400px', padding: '0' }}>
                        <TableHOC
                            data={devices}
                            onRowClick={handleRowClick}
                            hideActions={true}
                            hiddenColumns={[]}
                        />
                    </CCardBody>
                </CCard>
            </CCol>

            {/* Q2: 3D Visualization (Top Right) */}
            <CCol md={6} className="mb-4">
                <CCard className="h-100 shadow-sm">
                    <CCardHeader className="bg-dark text-white">
                        <strong><CIcon icon={cilCompass} className="me-2" /> 3D Orientation</strong>
                    </CCardHeader>
                    <CCardBody className="p-0 bg-light" style={{ minHeight: '300px' }}>
                        <OrientationView orientation={getOrientation()} />
                    </CCardBody>
                </CCard>
            </CCol>

            {/* Q3: Telemetry & Signal (Bottom Left) */}
            <CCol md={6} className="mb-4">
                <CCard className="h-100 shadow-sm">
                    <CCardHeader className="bg-dark text-white">
                        <strong><CIcon icon={cilChartLine} className="me-2" /> Telemetry & Signal</strong>
                    </CCardHeader>
                    <CCardBody className="p-2">
                        <CRow>
                            <CCol sm={7}>
                                <div className="border rounded p-1 mb-2">
                                    <AdcRealtimeChartVega data={telemetryData} height={200} compact={true} />
                                </div>
                            </CCol>
                            <CCol sm={5}>
                                <div className="border rounded p-1" style={{ backgroundColor: '#f8f9fa' }}>
                                    <h6 className="text-center small fw-bold mb-2">Device RSSI</h6>
                                    <SignalBars devices={devices} />
                                </div>
                            </CCol>
                        </CRow>
                    </CCardBody>
                </CCard>
            </CCol>

            {/* Q4: Selection Details (Bottom Right) */}
            <CCol md={6} className="mb-4">
                <CCard className="h-100 shadow-sm">
                    <CCardHeader className="bg-dark text-white">
                        <strong><CIcon icon={cilList} className="me-2" /> Status Details</strong>
                    </CCardHeader>
                    <CCardBody style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {selectedMsg ? (
                            <div>
                                <h6 className={selectedMsg.isMaster ? 'text-warning' : 'text-info'}>
                                    {selectedMsg.topic || selectedMsg.name}
                                </h6>
                                <pre className="bg-light p-2 border rounded" style={{ fontSize: '0.7rem' }}>
                                    {JSON.stringify(selectedMsg.data || selectedMsg, null, 2)}
                                </pre>
                            </div>
                        ) : (
                            <div className="text-center text-muted py-5">
                                <p>Select a device to view detailed JSON</p>
                            </div>
                        )}
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default Monitor;
