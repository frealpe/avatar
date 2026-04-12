import React from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilUser, cilPhone, cilNotes } from '@coreui/icons';

const Clientes = () => {
  // Datos de ejemplo para la tabla de clientes
  const clientes = [
    { id: 1, nombre: 'Ethereal Fashion', contacto: '3113449655', tipo: 'Empresa', estado: 'VIP' },
    { id: 2, nombre: 'Moda Corp', contacto: '3106708468', tipo: 'Empresa', estado: 'Normal' },
    { id: 3, nombre: 'Persona X', contacto: '3217488744', tipo: 'Individual', estado: 'Nuevo' },
  ];

  return (
    <div className="fade-in">
      <CRow className="mb-4">
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="text-white fw-bold">Cartera de Clientes</h2>
            <CButton color="success" className="text-white">
              <CIcon icon={cilUser} className="me-2" />
              Nuevo Cliente
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 bg-[#1c2024]/40 backdrop-blur-xl border-[#45484c]/20">
            <CCardHeader className="bg-transparent border-[#45484c]/20 text-white">
              Director Hill de Clientes
            </CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border text-white" hover responsive>
                <CTableHead color="dark">
                  <CTableRow>
                    <CTableHeaderCell>Nombre / Empresa</CTableHeaderCell>
                    <CTableHeaderCell>Contacto</CTableHeaderCell>
                    <CTableHeaderCell>Tipo</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {clientes.map((c) => (
                    <CTableRow key={c.id}>
                      <CTableDataCell>{c.nombre}</CTableDataCell>
                      <CTableDataCell>
                        <CIcon icon={cilPhone} className="me-2 text-info" />
                        {c.contacto}
                      </CTableDataCell>
                      <CTableDataCell>{c.tipo}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={c.estado === 'VIP' ? 'warning' : c.estado === 'Nuevo' ? 'info' : 'secondary'}>
                          {c.estado}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton size="sm" color="transparent">
                           <CIcon icon={cilNotes} className="text-success" />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default Clientes;
