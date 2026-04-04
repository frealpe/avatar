import React from 'react';
import { CProgress, CRow, CCol } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilSignalCellular4 } from '@coreui/icons';

const SignalBars = ({ devices = [] }) => {
    const getSignalColor = (rssi) => {
        if (rssi > -60) return 'success';
        if (rssi > -80) return 'warning';
        return 'danger';
    };

    const calculatePercentage = (rssi) => {
        // Map -100..-30 to 0..100
        return Math.min(100, Math.max(0, (rssi + 100) * 1.42));
    };

    return (
        <div className="p-2 overflow-auto" style={{ maxHeight: '150px' }}>
            {devices.map((dev) => (
                <div key={dev.id} className="mb-2 border-bottom pb-1">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className={`fw-bold ${dev.isMaster ? 'text-warning' : 'text-info'}`} style={{ fontSize: '0.7rem' }}>
                            {dev.name} ({dev.id.slice(-4)})
                        </small>
                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                            {dev.rssi || -100} dBm
                        </small>
                    </div>
                    <div className="d-flex align-items-center">
                        <CIcon
                            icon={cilSignalCellular4}
                            size="sm"
                            className={`me-2 text-${getSignalColor(dev.rssi || -100)}`}
                        />
                        <CProgress
                            height={8}
                            value={calculatePercentage(dev.rssi || -100)}
                            color={getSignalColor(dev.rssi || -100)}
                            className="flex-grow-1"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SignalBars;
