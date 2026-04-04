import React, { useState, useCallback, useMemo } from 'react';
import {
    CButton, CBadge,
    CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
    CFormInput,
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilNotes, cilPencil, cilTrash, cilCode } from '@coreui/icons';
import TableHOC from '../../tablas/TableHOC';

/**
 * TrajectoriesPanel
 * Props:
 *   trajectories       — array of trajectory objects from DB
 *   onSendMission      — callback(traj) to emit via socket
 *   onLoadTrajectory   — callback(traj) to render waypoints in 3D scene
 *   onDeleteTrajectory — callback(id) → Promise  (calls service + refreshes parent)
 *   onRenameTrajectory — callback(id, newName) → Promise
 */
const TrajectoriesPanel = ({
    trajectories = [],
    onSendMission,
    onLoadTrajectory,
    onDeleteTrajectory,
    onRenameTrajectory,
}) => {
    const [loadedId, setLoadedId] = useState(null);

    // ── Delete confirm modal ─────────────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState(null);  // traj object
    const [deleting, setDeleting] = useState(false);

    // ── Rename modal ────────────────────────────────────────────────────
    const [editTarget, setEditTarget] = useState(null);  // traj object
    const [editName, setEditName] = useState('');
    const [renaming, setRenaming] = useState(false);

    // ── JSON preview modal ──────────────────────────────────────────────
    const [jsonTarget, setJsonTarget] = useState(null);
    const [showJson, setShowJson] = useState(false);

    const handleRowClick = useCallback((row) => {
        if (onLoadTrajectory) {
            onLoadTrajectory(row);
            setLoadedId(row._id);
        }
    }, [onLoadTrajectory]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        await onDeleteTrajectory?.(deleteTarget._id);
        setDeleting(false);
        setDeleteTarget(null);
    };

    const handleRename = async () => {
        if (!editTarget || !editName.trim()) return;
        setRenaming(true);
        await onRenameTrajectory?.(editTarget._id, editName.trim());
        setRenaming(false);
        setEditTarget(null);
        setEditName('');
    };

    const tableColumns = useMemo(() => [
        {
            key: 'name', label: 'Nombre',
            render: t => (
                <span style={{
                    color: t._id === loadedId ? '#0dcaf0' : 'inherit',
                    fontWeight: t._id === loadedId ? 700 : 400,
                }}>
                    {t.name}
                    {t._id === loadedId && (
                        <CBadge color="info" className="ms-1" style={{ fontSize: '0.55rem' }}>
                            activa
                        </CBadge>
                    )}
                </span>
            )
        },
        { key: 'pts', label: 'Pts', render: t => t.waypoints?.length || 0 },
        {
            key: 'tools', label: '',
            render: t => (
                <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
                    {/* Send */}
                    <CButton
                        color="info" size="sm" variant="ghost"
                        className="py-0 px-1" title="Enviar a drones"
                        onClick={() => onSendMission?.(t)}
                    >
                        <CIcon icon={cilCloudUpload} size="sm" />
                    </CButton>
                    {/* Edit / rename */}
                    <CButton
                        color="warning" size="sm" variant="ghost"
                        className="py-0 px-1" title="Renombrar"
                        onClick={() => { setEditTarget(t); setEditName(t.name); }}
                    >
                        <CIcon icon={cilPencil} size="sm" />
                    </CButton>
                    <CButton
                        color="info" size="sm" variant="ghost"
                        className="py-0 px-1" title="Ver JSON"
                        onClick={() => { setJsonTarget(t); setShowJson(true); }}
                    >
                        <CIcon icon={cilCode} size="sm" />
                    </CButton>
                    {/* Delete */}
                    <CButton
                        color="danger" size="sm" variant="ghost"
                        className="py-0 px-1" title="Eliminar"
                        onClick={() => setDeleteTarget(t)}
                    >
                        <CIcon icon={cilTrash} size="sm" />
                    </CButton>
                </div>
            )
        }
    ], [loadedId, onSendMission]);

    return (
        <div>
            {/* Hint */}
            <div className="small mb-2 d-flex align-items-center gap-2" style={{ color: '#94a3b8' }}>
                <CIcon icon={cilNotes} size="sm" />
                Clic en fila para <strong style={{ color: '#0dcaf0' }}>cargar</strong> en escena 3D
            </div>

            <TableHOC
                data={trajectories}
                columns={tableColumns}
                onRowClick={handleRowClick}
                hideActions={true}
                hiddenColumns={['_id', '__v', 'waypoints', 'defaultAltitude', 'description']}
            />

            {/* ── Delete confirm ───────────────────────────────────────────── */}
            <CModal visible={!!deleteTarget} onClose={() => setDeleteTarget(null)} alignment="center">
                <CModalHeader>
                    <CModalTitle className="text-danger small">Eliminar trayectoria</CModalTitle>
                </CModalHeader>
                <CModalBody className="small">
                    ¿Eliminar <strong>"{deleteTarget?.name}"</strong> permanentemente?
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                        Cancelar
                    </CButton>
                    <CButton color="danger" size="sm" disabled={deleting} onClick={handleDelete}>
                        {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* ── Rename modal ─────────────────────────────────────────────── */}
            <CModal visible={!!editTarget} onClose={() => setEditTarget(null)} alignment="center">
                <CModalHeader>
                    <CModalTitle className="small">Renombrar trayectoria</CModalTitle>
                </CModalHeader>
                <CModalBody>
                    <CFormInput
                        size="sm"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Nuevo nombre…"
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        autoFocus
                    />
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" size="sm" onClick={() => setEditTarget(null)}>
                        Cancelar
                    </CButton>
                    <CButton color="warning" size="sm" disabled={renaming || !editName.trim()} onClick={handleRename}>
                        {renaming ? 'Guardando…' : 'Renombrar'}
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* ── JSON preview ─────────────────────────────────────────────── */}
            <CModal visible={showJson} onClose={() => setShowJson(false)} size="lg" scrollable>
                <CModalHeader>
                    <CModalTitle className="small">JSON: {jsonTarget?.name}</CModalTitle>
                </CModalHeader>
                <CModalBody className="bg-dark text-success p-3">
                    <pre style={{ fontSize: '0.75rem', margin: 0 }}>
                        {JSON.stringify(jsonTarget, null, 2)}
                    </pre>
                </CModalBody>
            </CModal>
        </div>
    );
};

export default TrajectoriesPanel;
