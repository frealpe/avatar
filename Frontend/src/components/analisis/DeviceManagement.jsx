import React, { useState, useEffect } from 'react';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CButton,
    CTable,
    CTableHead,
    CTableBody,
    CTableRow,
    CTableHeaderCell,
    CTableDataCell,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CForm,
    CFormInput,
    CFormLabel,
    CFormTextarea,
    CBadge,
    CSpinner,
    CFormSelect,
    CFormSwitch,
    CAlert
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilSettings, cilInfo } from '@coreui/icons';
import ControlService from '../../service/control/control.service';
import { SocketContext } from '../../context/SocketContext';
import DeviceControlMap from './DeviceControlMap';

const DeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [formData, setFormData] = useState({
        device_uid: '',
        mac_address: '',
        name: '',
        description: '',
        role: 'slave'  // 'master' o 'slave'
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    // Unified Control Map state
    const { socket } = React.useContext(SocketContext);
    const [expandedDeviceId, setExpandedDeviceId] = useState(null);

    useEffect(() => {
        loadDevices();

        if (socket) {
            const handleStatusUpdate = () => {
                // Background refresh when websocket says device status changed
                loadDevices(false);
            };
            socket.on('device:status_update', handleStatusUpdate);
            return () => socket.off('device:status_update', handleStatusUpdate);
        }
    }, [socket]);

    const loadDevices = async (showSpinner = true) => {
        if (showSpinner) setLoading(true);
        const result = await ControlService.getAllDevices();
        if (result.ok) {
            setDevices(result.data);
        } else {
            setError('Error cargando dispositivos');
        }
        if (showSpinner) setLoading(false);
    };

    const handleOpenModal = (device = null) => {
        if (device) {
            setEditingDevice(device);
            setFormData({
                device_uid: device.device_uid,
                mac_address: device.mac_address,
                name: device.name || '',
                description: device.description || '',
                role: device.role || 'slave'
            });
        } else {
            setEditingDevice(null);
            setFormData({
                device_uid: '',
                mac_address: '',
                name: '',
                description: '',
                role: 'slave'
            });
        }
        setError(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingDevice(null);
        setFormData({
            device_uid: '',
            mac_address: '',
            name: '',
            description: '',
            role: 'slave'
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            let result;
            if (editingDevice) {
                result = await ControlService.updateDevice(editingDevice._id, formData);
            } else {
                result = await ControlService.createDevice(formData);
            }

            if (result.ok) {
                handleCloseModal();
                loadDevices();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Error guardando dispositivo');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (device) => {
        const result = await ControlService.toggleDevice(device._id, !device.isActive);
        if (result.ok) {
            loadDevices(false);
        } else {
            alert('Error al cambiar estado: ' + result.error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este dispositivo?')) {
            return;
        }

        const result = await ControlService.deleteDevice(id);
        if (result.ok) {
            loadDevices();
        } else {
            alert('Error eliminando dispositivo: ' + result.error);
        }
    };

    const toggleControlPanel = (device) => {
        if (expandedDeviceId === device._id) {
            setExpandedDeviceId(null);
        } else {
            setExpandedDeviceId(device._id);
            setError(null);
        }
    };


    const formatMacAddress = (mac) => {
        if (!mac) return '';
        const cleanMac = mac.replace(/[:-]/g, '').toUpperCase();
        return cleanMac.match(/.{1,2}/g)?.join(':') || mac;
    };

    const getRSSIBadge = (rssi) => {
        if (rssi === null || rssi === undefined) return <CBadge color="secondary">N/A</CBadge>;
        // Clasificación estándar de señal WiFi/RF
        if (rssi > -60) return <CBadge color="success">{rssi} dBm</CBadge>;
        if (rssi > -80) return <CBadge color="warning">{rssi} dBm</CBadge>;
        return <CBadge color="danger">{rssi} dBm</CBadge>;
    };

    return (
        <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>📱 Gestión de Dispositivos</strong>
                <CButton color="primary" size="sm" onClick={() => handleOpenModal()}>
                    <CIcon icon={cilPlus} className="me-1" />
                    Agregar Dispositivo
                </CButton>
            </CCardHeader>
            <CCardBody>
                <CAlert color="info" className="mb-4 d-flex align-items-center">
                    <CIcon icon={cilInfo} className="me-2" size="xl" />
                    <div>
                        <strong>Tip de Migración:</strong> Si has cambiado el Master (ej. a M5 Stamp), recuerda que los Slaves deben conocer la nueva dirección MAC del Master (<b>{devices.find(d => d.role === 'master')?.mac_address || '...'}</b>) para comunicarse por ESP-NOW.
                    </div>
                </CAlert>
                {loading ? (
                    <div className="text-center py-4">
                        <CSpinner color="primary" />
                        <p className="mt-2">Cargando dispositivos...</p>
                    </div>
                ) : (
                    <CTable hover responsive>
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell>Rol</CTableHeaderCell>
                                <CTableHeaderCell>UID</CTableHeaderCell>
                                <CTableHeaderCell>MAC Address</CTableHeaderCell>
                                <CTableHeaderCell>Nombre</CTableHeaderCell>
                                <CTableHeaderCell>Habilitar</CTableHeaderCell>
                                <CTableHeaderCell>Señal</CTableHeaderCell>
                                <CTableHeaderCell>Estado</CTableHeaderCell>
                                <CTableHeaderCell>Acciones</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {devices.length === 0 ? (
                                <CTableRow>
                                    <CTableDataCell colSpan="6" className="text-center text-muted">
                                        No hay dispositivos registrados
                                    </CTableDataCell>
                                </CTableRow>
                            ) : (
                                devices.map(device => (
                                    <React.Fragment key={device._id}>
                                        <CTableRow>
                                            <CTableDataCell>
                                                {device.role === 'master' ? (
                                                    <CBadge color="warning" className="text-dark">🌐 Master</CBadge>
                                                ) : (
                                                    <CBadge color="info" className="text-dark">🤖 Slave</CBadge>
                                                )}
                                            </CTableDataCell>
                                            <CTableDataCell>
                                                <code>{device.device_uid}</code>
                                            </CTableDataCell>
                                            <CTableDataCell>
                                                <code>{formatMacAddress(device.mac_address)}</code>
                                            </CTableDataCell>
                                            <CTableDataCell>{device.name || '-'}</CTableDataCell>
                                            <CTableDataCell>
                                                <CFormSwitch
                                                    id={`switch-${device._id}`}
                                                    checked={device.isActive}
                                                    onChange={() => handleToggleActive(device)}
                                                    label={device.isActive ? "Habilitado" : "Deshabilitado"}
                                                    disabled={loading}
                                                />
                                            </CTableDataCell>
                                            <CTableDataCell>
                                                {device.is_active_network ? getRSSIBadge(device.rssi) : '--'}
                                            </CTableDataCell>
                                            <CTableDataCell>
                                                {!device.isActive ? (
                                                    <CBadge color="danger">Deshabilitado</CBadge>
                                                ) : device.is_active_network ? (
                                                    <CBadge color="success">Online</CBadge>
                                                ) : (
                                                    <CBadge color="secondary">Offline</CBadge>
                                                )}
                                            </CTableDataCell>
                                            <CTableDataCell>
                                                <div className="d-flex gap-2">
                                                    <CIcon
                                                        icon={cilPencil}
                                                        size="lg"
                                                        className="text-warning"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => handleOpenModal(device)}
                                                        title="Editar"
                                                    />
                                                    <CIcon
                                                        icon={cilTrash}
                                                        size="lg"
                                                        className="text-danger"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => handleDelete(device._id)}
                                                        title="Eliminar"
                                                    />
                                                    <CIcon
                                                        icon={cilSettings}
                                                        size="lg"
                                                        className={expandedDeviceId === device._id ? "text-primary" : "text-info"}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => toggleControlPanel(device)}
                                                        title="Mapa de Control"
                                                    />
                                                </div>
                                            </CTableDataCell>
                                        </CTableRow>
                                        {expandedDeviceId === device._id && (
                                            <CTableRow key={`expand-${device._id}`}>
                                                <CTableDataCell colSpan="6" className="bg-light p-3">
                                                    <DeviceControlMap
                                                        device={device}
                                                        socket={socket}
                                                    />
                                                </CTableDataCell>
                                            </CTableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </CTableBody>
                    </CTable>
                )}
            </CCardBody>

            {/* Modal for Add/Edit */}
            <CModal visible={showModal} onClose={handleCloseModal}>
                <CModalHeader>
                    <CModalTitle>
                        {editingDevice ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
                    </CModalTitle>
                </CModalHeader>
                <CForm onSubmit={handleSubmit}>
                    <CModalBody>
                        {error && (
                            <div className="alert alert-danger">{error}</div>
                        )}

                        <div className="mb-3">
                            <CFormLabel htmlFor="device_uid">UID del Dispositivo *</CFormLabel>
                            <CFormInput
                                type="text"
                                id="device_uid"
                                value={formData.device_uid}
                                onChange={(e) => setFormData({ ...formData, device_uid: e.target.value })}
                                required
                                disabled={!!editingDevice}
                                placeholder="ESP32XXXXXXXX"
                            />
                            <small className="text-muted">Identificador único del dispositivo</small>
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="mac_address">Dirección MAC *</CFormLabel>
                            <CFormInput
                                type="text"
                                id="mac_address"
                                value={formData.mac_address}
                                onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                                required
                                placeholder="XX:XX:XX:XX:XX:XX"
                            />
                            <small className="text-muted">Formato: AA:BB:CC:DD:EE:FF</small>
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="name">Nombre</CFormLabel>
                            <CFormInput
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Sensor Principal"
                            />
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="role">Tipo de Dispositivo *</CFormLabel>
                            <CFormSelect
                                id="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                required
                            >
                                <option value="master">🌐 Master — Gateway ESP-NOW / MQTT</option>
                                <option value="slave">🤖 Slave — Drone / Nodo sensor</option>
                            </CFormSelect>
                            <small className="text-muted">
                                {formData.role === 'master'
                                    ? 'El Master conecta la red WiFi/MQTT con los Slaves ESP-NOW'
                                    : 'El Slave es un ESP32 controlado por el Master vía ESP-NOW'}
                            </small>
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="description">Descripción</CFormLabel>
                            <CFormTextarea
                                id="description"
                                rows="2"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción opcional del dispositivo"
                            />
                        </div>
                    </CModalBody>
                    <CModalFooter>
                        <CButton color="secondary" onClick={handleCloseModal} disabled={saving}>
                            Cancelar
                        </CButton>
                        <CButton color="primary" type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <CSpinner size="sm" className="me-1" />
                                    Guardando...
                                </>
                            ) : (
                                editingDevice ? 'Actualizar' : 'Crear'
                            )}
                        </CButton>
                    </CModalFooter>
                </CForm>
            </CModal>

            {/* GPIO Modal Removed in favor of expand row */}

        </CCard >
    );
};

export default DeviceManagement;
