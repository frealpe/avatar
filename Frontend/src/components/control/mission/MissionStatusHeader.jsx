import React from 'react';
import { CBadge } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilHome, cilArrowCircleRight, cilWarning, cilCursor } from '@coreui/icons';

const ModeIcon = ({ mode }) => {
    const iconMap = {
        MISSION: cilArrowCircleRight,
        SAFETY: cilWarning,
        COOPERATIVE: cilCursor,
        EVASION: cilWarning,
        RETURN: cilArrowCircleRight,
        LANDING: cilHome,
        IDLE: cilHome,
        FAULT: cilWarning
    };
    return <CIcon icon={iconMap[mode] || cilHome} size="sm" className="me-1" />;
};

const MissionStatusHeader = ({ missionActive, missionMode, modeColors }) => {
    return (
        <div className="d-flex align-items-center justify-content-between">
            <span className="small text-uppercase fw-bold text-warning d-flex align-items-center gap-1">
                <CIcon icon={cilHome} size="sm" /> Centro de Misión
            </span>
            <CBadge color={modeColors[missionMode] || 'secondary'} className="d-flex align-items-center gap-1 px-2">
                <ModeIcon mode={missionMode} />
                {missionActive ? missionMode : 'IDLE'}
            </CBadge>
        </div>
    );
};

export default MissionStatusHeader;
