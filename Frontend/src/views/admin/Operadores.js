import React, { useState, useEffect, useRef } from 'react';
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
  CAvatar,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSwitch
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilSettings, cilIndustry, cilTrash, cilPencil, cilCloudUpload } from '@coreui/icons';
import { getOperadores, createOperador, updateOperador, deleteOperador } from '../../service/operadoresApi';

const Operadores = () => {
  const [operadores, setOperadores] = useState([]);
  const [modal, setModal] = useState(false);
  const [operadorActual, setOperadorActual] = useState({ nombre: '', logo: '', estado: true });
  const [isEdit, setIsEdit] = useState(false);
  const fileInputRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
  const SERVER_URL = API_BASE.replace('/api/', '');

  useEffect(() => {
    fetchOperadores();
  }, []);

  const fetchOperadores = async () => {
    try {
      const resp = await getOperadores();
      if (resp.ok) {
        setOperadores(resp.operadores);
      }
    } catch (err) {
      console.error('Error fetching:', err);
    }
  };

  const handleOpenModal = (operador = { nombre: '', logo: '', estado: true }, edit = false) => {
    setOperadorActual(operador);
    setIsEdit(edit);
    setModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOperadorActual({ ...operadorActual, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!operadorActual.nombre || operadorActual.nombre.trim() === '') {
      alert('El nombre del operador es obligatorio');
      return;
    }

    try {
      if (isEdit) {
        await updateOperador(operadorActual._id, operadorActual);
      } else {
        await createOperador(operadorActual);
      }
      setModal(false);
      fetchOperadores();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error al guardar el operador. Por favor revise los datos o la conexión.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este operador? Esto podría afectar a los proyectos vinculados.')) {
      try {
        await deleteOperador(id);
        fetchOperadores();
      } catch (err) {
        console.error('Error deleting:', err);
      }
    }
  };

  const getLogoSrc = (logo) => {
    if (!logo) return null;
    if (logo.startsWith('data:image')) return logo;
    return `${SERVER_URL}${logo}`;
  };

  return (
    <div className="fade-in">
      <CRow className="mb-4">
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="text-white fw-bold">Gestión de Operadores</h2>
            <CButton color="primary" onClick={() => handleOpenModal()}>
              <CIcon icon={cilPlus} className="me-2" />
              Nuevo Operador
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 bg-[#1c2024]/40 backdrop-blur-xl border-[#45484c]/20">
            <CCardHeader className="bg-transparent border-[#45484c]/20 text-white d-flex align-items-center">
              <CIcon icon={cilIndustry} className="me-2 text-info" />
              Operadores del Sistema
            </CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border text-white" hover responsive>
                <CTableHead color="dark">
                  <CTableRow>
                    <CTableHeaderCell>Operador</CTableHeaderCell>
                    <CTableHeaderCell>ID Interno</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {operadores.map((o) => (
                    <CTableRow key={o._id}>
                      <CTableDataCell>
                        <div className="d-flex align-items-center">
                          <CAvatar size="md" src={getLogoSrc(o.logo)} className="me-3" color="info">
                            {!o.logo && o.nombre.charAt(0)}
                          </CAvatar>
                          <div className="fw-bold">{o.nombre}</div>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <code className="text-info small">{o._id}</code>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={o.estado ? "success" : "danger"} shape="rounded-pill">
                          {o.estado ? 'Activo' : 'Inactivo'}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton 
                          size="sm" 
                          color="transparent" 
                          className="me-2"
                          onClick={() => handleOpenModal(o, true)}
                        >
                           <CIcon icon={cilPencil} className="text-warning" />
                        </CButton>
                        <CButton 
                          size="sm" 
                          color="transparent"
                          onClick={() => handleDelete(o._id)}
                        >
                           <CIcon icon={cilTrash} className="text-danger" />
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

      {/* Modal CRUD */}
      <CModal visible={modal} onClose={() => setModal(false)} className="backdrop-blur-md">
        <CModalHeader className="bg-[#1c2024] border-[#45484c]/20 text-white">
          <CModalTitle>{isEdit ? 'Editar Operador' : 'Nuevo Operador'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="bg-[#1c2024] text-white">
          <CForm>
            <div className="mb-3">
              <CFormLabel>Nombre del Operador</CFormLabel>
              <CFormInput 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={operadorActual.nombre} 
                onChange={(e) => setOperadorActual({...operadorActual, nombre: e.target.value})}
                placeholder="Ej. Vanti"
              />
            </div>
            <div className="mb-3 d-flex align-items-center">
              <CFormLabel className="me-3 mb-0">Estado del Operador</CFormLabel>
              <CFormSwitch 
                size="xl" 
                label={operadorActual.estado ? 'Activo' : 'Inactivo'} 
                checked={operadorActual.estado}
                onChange={(e) => setOperadorActual({...operadorActual, estado: e.target.checked})}
              />
            </div>
            
            {isEdit && (
              <div className="mb-4 text-center">
                <CFormLabel className="d-block text-start mb-3">Logo del Operador</CFormLabel>
                
                <div className="d-flex flex-column align-items-center p-4 border-2 border-dashed border-[#45484c]/50 rounded-lg bg-[#2a2e33]/50">
                  {operadorActual.logo ? (
                    <img 
                      src={getLogoSrc(operadorActual.logo)} 
                      alt="Preview" 
                      style={{ maxHeight: '100px', maxWidth: '200px', objectFit: 'contain' }}
                      className="mb-3 rounded shadow-lg"
                    />
                  ) : (
                    <CIcon icon={cilIndustry} size="xl" className="mb-3 text-secondary opacity-30" />
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  <CButton 
                    color="info" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <CIcon icon={cilCloudUpload} className="me-2" />
                    Seleccionar Imagen desde Disco Local
                  </CButton>
                </div>
                <small className="text-secondary mt-2 d-block">Recomendado: 200x100px PNG/JPG</small>
              </div>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter className="bg-[#1c2024] border-[#45484c]/20">
          <CButton color="secondary" onClick={() => setModal(false)}>Cancelar</CButton>
          <CButton color="primary" onClick={handleSave}>
            {isEdit ? 'Actualizar Cambios' : 'Crear Operador'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default Operadores;
