import React from 'react';
import { CRow, CCol, CButton, CFormInput } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilSave } from '@coreui/icons';

const HomeBasesManager = ({
    activeSlaves,
    bases,
    editingBases,
    onBaseChange,
    onSetBase,
    onToggleEdit
}) => {
    return (
        <div className="mb-3 border-bottom border-secondary pb-3">
            <div className="small text-muted fw-bold mb-2 d-flex align-items-center gap-2">
                <CIcon icon={cilPencil} size="sm" />
                Configurar Bases (Home)
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="pe-2">
                {activeSlaves.length === 0 ? (
                    <div className="small text-muted italic">No hay drones activos</div>
                ) : (
                    activeSlaves.map((device) => {
                        const mac = device.mac_address || device.mac;
                        const base = bases[mac] || { x: 0, y: 1.5, z: 0 };
                        const isEditing = editingBases[mac];

                        return (
                            <div key={mac} className="mb-3 p-2 rounded bg-dark border border-secondary shadow-sm">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="small fw-bold text-info">
                                        {device.name || mac.slice(-5)}
                                    </span>
                                    <div className="d-flex gap-1">
                                        <CButton
                                            size="sm" color="warning" variant="ghost" className="p-0"
                                            onClick={(e) => { e.stopPropagation(); onToggleEdit(mac); }}
                                            title="Editar coordenadas"
                                        >
                                            <CIcon icon={cilPencil} size="sm" />
                                        </CButton>
                                        <CButton
                                            size="sm" color="info" variant="ghost" className="p-0"
                                            onClick={(e) => { e.stopPropagation(); onSetBase(device); }}
                                            title="Guardar base en servidor"
                                            disabled={!!(!isEditing && bases[mac])}
                                        >
                                            <CIcon icon={cilSave} size="sm" />
                                        </CButton>
                                    </div>
                                </div>

                                <CRow className="g-1 align-items-end">
                                    {[
                                        { axis: 'x', label: 'X', min: '-15', max: '15' },
                                        { axis: 'z', label: 'Z', min: '-15', max: '15' },
                                        { axis: 'y', label: 'Alt Y', min: '1.0', max: '10.0' },
                                    ].map(({ axis, label, min, max }) => (
                                        <CCol xs={4} key={axis}>
                                            <div className="text-muted" style={{ fontSize: '0.55rem' }}>{label}</div>
                                            {isEditing ? (
                                                <CFormInput
                                                    type="number" size="sm"
                                                    step="0.1" min={min} max={max}
                                                    value={base[axis] ?? (axis === 'y' ? 1.5 : 0)}
                                                    className="bg-dark border-secondary text-info px-1 py-0"
                                                    style={{ fontSize: '0.75rem', height: '24px' }}
                                                    onChange={e => { e.stopPropagation(); onBaseChange(mac, axis, e.target.value); }}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                <div
                                                    className="text-white fw-bold px-1 border border-transparent"
                                                    style={{ fontSize: '0.85rem' }}
                                                >
                                                    {(base[axis] ?? (axis === 'y' ? 1.5 : 0)).toFixed(1)}m
                                                </div>
                                            )}
                                        </CCol>
                                    ))}
                                </CRow>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default HomeBasesManager;
