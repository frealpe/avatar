import React from 'react';
import { CSpinner } from '@coreui/react-pro';
import HistoryCard from './HistoryCard';

const HistoryTab = ({
    mac,
    loadHistory,
    loadingHistory,
    history,
    sensorOptions
}) => {
    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-secondary text-uppercase" style={{ fontSize: '0.65rem' }}>
                    Historial {mac ? `· ${mac.slice(-8)}` : ''}
                </small>
                {mac && (
                    <button onClick={() => loadHistory(mac)} disabled={loadingHistory}
                        className="btn btn-sm btn-outline-secondary py-0" style={{ fontSize: '0.65rem' }}>
                        {loadingHistory ? <CSpinner size="sm" /> : '↻ Actualizar'}
                    </button>
                )}
            </div>
            {!mac ? (
                <small className="text-muted">Selecciona un drone en la pestaña Calibrar primero.</small>
            ) : loadingHistory ? (
                <div className="text-center py-3"><CSpinner color="info" /></div>
            ) : history.length === 0 ? (
                <small className="text-muted">No hay registros de calibración para este drone.</small>
            ) : (
                history.map((rec, i) => <HistoryCard key={rec._id || i} rec={rec} sensorOptions={sensorOptions} />)
            )}
        </>
    );
};

export default HistoryTab;
