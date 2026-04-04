import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    CTable,
    CTableHead,
    CTableBody,
    CTableRow,
    CTableHeaderCell,
    CTableDataCell,
    CPagination,
    CPaginationItem,
    CButton,
    CFormCheck
} from "@coreui/react-pro";
import CIcon from '@coreui/icons-react';
import { cilChartLine, cilChevronRight, cilChevronBottom } from '@coreui/icons';

const getDate = (item) => {
    const val = item.timestamp || item.prueba || item.fecha || item.date || item.createdAt || item.created_at || item.time;
    if (!val) return "N/A";
    try {
        const dateObj = new Date(val);
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
        }
    } catch (e) { }
    return val;
};

const safeStringify = (obj) => {
    try {
        const cache = new Set();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) return; // Circular reference found, discard key
                if (value.$$typeof) return;   // React Element, discard
                cache.add(value);
            }
            return value;
        }, 2);
    } catch (err) {
        return "[Error stringifying details]";
    }
};

const TableHOC = ({
    data,
    onRowClick,
    selectedIds = [],
    onSelectionChange,
    renderExpandable,
    hideActions = false,
    hiddenColumns = [],
    columns = null // New: [{key, label, render}]
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedRows, setExpandedRows] = useState([]);
    const itemsPerPage = 5;

    const getRowId = useCallback((item, index) => {
        return item.id || item._id || item.prueba || `item-${index}`;
    }, []);

    const totalPages = useMemo(() => {
        return data && data.length > 0 ? Math.ceil(data.length / itemsPerPage) : 0;
    }, [data, itemsPerPage]);

    const currentItems = useMemo(() => {
        if (!data || data.length === 0) return [];
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return data.slice(indexOfFirstItem, indexOfLastItem);
    }, [data, currentPage, itemsPerPage]);

    const handlePageChange = useCallback((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }, [totalPages]);

    const toggleRow = useCallback((id) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    }, []);

    const handleInternalRowClick = useCallback((item) => {
        if (onRowClick) onRowClick(item);
    }, [onRowClick]);

    const handleSelect = useCallback((item, index) => {
        const identifier = getRowId(item, index);
        if (!onSelectionChange) return;
        if (selectedIds.includes(identifier)) {
            onSelectionChange(selectedIds.filter(id => id !== identifier));
        } else {
            onSelectionChange([...selectedIds, identifier]);
        }
    }, [getRowId, onSelectionChange, selectedIds]);

    const isSelected = useCallback((item, index) => {
        return selectedIds.includes(getRowId(item, index));
    }, [getRowId, selectedIds]);

    if (!data || data.length === 0) return <div className="text-muted p-2">Sin datos disponibles</div>;

    return (
        <div className="d-flex flex-column h-100">
            <div className="flex-grow-1 overflow-auto">
                <CTable hover responsive>
                    <CTableHead>
                        <CTableRow>
                            <CTableHeaderCell scope="col" style={{ width: '40px' }}></CTableHeaderCell>
                            <CTableHeaderCell scope="col" style={{ width: '40px' }}>Sel</CTableHeaderCell>

                            {columns ? (
                                columns.map(col => (
                                    <CTableHeaderCell key={col.key} scope="col">{col.label}</CTableHeaderCell>
                                ))
                            ) : (
                                <>
                                    <CTableHeaderCell scope="col">Dispositivo</CTableHeaderCell>
                                    <CTableHeaderCell scope="col">Estado</CTableHeaderCell>
                                    {!hiddenColumns.includes('id') && <CTableHeaderCell scope="col">ID</CTableHeaderCell>}
                                    <CTableHeaderCell scope="col">Fecha</CTableHeaderCell>
                                </>
                            )}

                            {!hideActions && <CTableHeaderCell scope="col" className="text-end">Acciones</CTableHeaderCell>}
                        </CTableRow>
                    </CTableHead>
                    <CTableBody>
                        {currentItems.map((item, index) => {
                            const identifier = getRowId(item, index);
                            const expanded = expandedRows.includes(identifier);

                            return (
                                <React.Fragment key={identifier}>
                                    <CTableRow active={isSelected(item, index)}>
                                        <CTableDataCell>
                                            <CButton
                                                color="transparent"
                                                size="sm"
                                                className="p-0 border-0 text-secondary"
                                                onClick={() => toggleRow(identifier)}
                                            >
                                                <CIcon icon={expanded ? cilChevronBottom : cilChevronRight} />
                                            </CButton>
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            <CFormCheck
                                                checked={isSelected(item, index)}
                                                onChange={() => handleSelect(item, index)}
                                            />
                                        </CTableDataCell>

                                        {columns ? (
                                            columns.map(col => (
                                                <CTableDataCell key={col.key} onClick={() => handleInternalRowClick(item)} style={{ cursor: 'pointer' }}>
                                                    {col.render ? col.render(item) : item[col.key]}
                                                </CTableDataCell>
                                            ))
                                        ) : (
                                            <>
                                                <CTableDataCell>
                                                    <small className={`fw-bold ${item.isMaster ? 'text-warning' : 'text-info'}`}>
                                                        {item.device_uid ? item.device_uid.slice(-4) : (item.id && typeof item.id === 'string' && item.id.length > 5 ? item.id.slice(-4) : 'N/A')}
                                                    </small>
                                                </CTableDataCell>
                                                <CTableDataCell>
                                                    <span className={`badge ${item.status === 'offline' ? 'bg-danger' : 'bg-success'}`} style={{ fontSize: '0.65rem' }}>
                                                        {item.status === 'offline' ? 'OFFLINE' : 'ONLINE'}
                                                    </span>
                                                </CTableDataCell>
                                                {!hiddenColumns.includes('id') && (
                                                    <CTableDataCell style={{ wordBreak: 'break-all', maxWidth: '120px', fontSize: '0.75rem', lineHeight: '1.2' }}>
                                                        {item.id}
                                                    </CTableDataCell>
                                                )}
                                                <CTableDataCell onClick={() => handleInternalRowClick(item)} style={{ cursor: 'pointer' }}>
                                                    {getDate(item)}
                                                </CTableDataCell>
                                            </>
                                        )}

                                        {!hideActions && (
                                            <CTableDataCell className="text-end">
                                                <CButton
                                                    color="info"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleInternalRowClick(item)}
                                                    title="Ver Gráfica"
                                                >
                                                    <CIcon icon={cilChartLine} />
                                                </CButton>
                                            </CTableDataCell>
                                        )}
                                    </CTableRow>
                                    {expanded && (
                                        <CTableRow>
                                            <CTableDataCell colSpan={columns ? columns.length + 3 : 7} className="bg-light p-3">
                                                <div className="small border rounded bg-white p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                    {renderExpandable ? renderExpandable(item) : (
                                                        <>
                                                            <strong>Detalles del Registro:</strong>
                                                            <pre className="mt-2 text-muted" style={{ fontSize: '0.85em' }}>
                                                                {safeStringify(item)}
                                                            </pre>
                                                        </>
                                                    )}
                                                </div>
                                            </CTableDataCell>
                                        </CTableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </CTableBody>
                </CTable>
            </div>

            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-2">
                    <CPagination aria-label="Page navigation">
                        <CPaginationItem
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            style={{ cursor: currentPage === 1 ? 'default' : 'pointer' }}
                        >
                            &laquo;
                        </CPaginationItem>
                        {[...Array(totalPages)].map((_, i) => (
                            <CPaginationItem
                                key={i + 1}
                                active={i + 1 === currentPage}
                                onClick={() => handlePageChange(i + 1)}
                                style={{ cursor: 'pointer' }}
                            >
                                {i + 1}
                            </CPaginationItem>
                        ))}
                        <CPaginationItem
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                            style={{ cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                        >
                            &raquo;
                        </CPaginationItem>
                    </CPagination>
                </div>
            )}
        </div>
    );
};

TableHOC.propTypes = {
    data: PropTypes.array,
    onRowClick: PropTypes.func,
    selectedIds: PropTypes.array,
    onSelectionChange: PropTypes.func,
    renderExpandable: PropTypes.func,
    hideActions: PropTypes.bool,
    hiddenColumns: PropTypes.array,
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            render: PropTypes.func
        })
    )
};

export default React.memo(TableHOC);
