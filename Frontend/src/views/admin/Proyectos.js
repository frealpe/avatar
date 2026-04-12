import React, { useState, useEffect } from 'react';
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
  CBadge,
  CAvatar,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilFolder, cilSettings, cilIndustry, cilPencil, cilTrash } from '@coreui/icons';
import { getProyectos, createProyecto, updateProyecto, deleteProyecto } from '../../service/proyectosApi';
import { getOperadores } from '../../service/operadoresApi';
import { getMunicipios } from '../../service/municipiosApi';
import { getDepartamentos } from '../../service/departamentosApi';

const Proyectos = () => {
  const [proyectos, setProyectos] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [proyectoActualId, setProyectoActualId] = useState(null);
  
  const [nuevoProyecto, setNuevoProyecto] = useState({
    nombre: '',
    municipio: '',
    operador: ''
  });

  const [dptoSeleccionado, setDptoSeleccionado] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
  const SERVER_URL = API_BASE.replace('/api/', '');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (dptoSeleccionado) {
      fetchMunicipios(dptoSeleccionado);
    } else {
      setMunicipios([]);
    }
  }, [dptoSeleccionado]);

  const fetchInitialData = async () => {
    try {
      const [projResp, opResp, depResp] = await Promise.all([
        getProyectos(),
        getOperadores(),
        getDepartamentos()
      ]);
      
      if (projResp.ok) setProyectos(projResp.proyectos);
      if (opResp.ok) setOperadores(opResp.operadores);
      if (depResp.ok) setDepartamentos(depResp.departamentos);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const fetchMunicipios = async (codigoDpto) => {
    try {
      const resp = await getMunicipios(codigoDpto);
      if (resp.ok) {
        setMunicipios(resp.municipios);
      }
    } catch (err) {
      console.error('Error fetching municipios:', err);
    }
  };

  const handleOpenModal = (p = null) => {
    if (p) {
      setIsEdit(true);
      setProyectoActualId(p._id);
      setNuevoProyecto({
        nombre: p.nombre,
        municipio: p.municipio?._id || '',
        operador: p.operador?._id || ''
      });
      setDptoSeleccionado(p.departamento?.codigoDepartamento || '');
    } else {
      setIsEdit(false);
      setProyectoActualId(null);
      setNuevoProyecto({ nombre: '', municipio: '', operador: '' });
      setDptoSeleccionado('');
    }
    setModal(true);
  };

  const handleSave = async () => {
    if (!nuevoProyecto.nombre || !nuevoProyecto.municipio || !nuevoProyecto.operador) {
      alert('Por favor complete todos los campos marcados con *');
      return;
    }

    const data = {
        nombre: nuevoProyecto.nombre,
        idPiloto: nuevoProyecto.nombre,
        municipio: nuevoProyecto.municipio,
        operador: nuevoProyecto.operador,
        departamento: departamentos.find(d => d.codigoDepartamento === dptoSeleccionado)?._id
    };

    try {
      let resp;
      if (isEdit) {
        resp = await updateProyecto(proyectoActualId, data);
      } else {
        resp = await createProyecto(data);
      }

      if (resp.ok) {
        setModal(false);
        fetchInitialData();
      }
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error al guardar el proyecto.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este proyecto?')) {
      try {
        const resp = await deleteProyecto(id);
        if (resp.ok) {
            fetchInitialData();
        }
      } catch (err) {
        console.error('Error deleting:', err);
      }
    }
  };

  const getLogoSrc = (logo) => {
    if (!logo) return null;
    if (logo.startsWith('data:image') || logo.startsWith('http')) return logo;
    return `${SERVER_URL}${logo}`;
  };

  return (
    <div className="fade-in">
      <CRow className="mb-4">
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="text-white fw-bold">Gestión de Proyectos (Tiendas)</h2>
            <CButton color="primary" onClick={() => handleOpenModal()}>
              <CIcon icon={cilFolder} className="me-2" />
              Nuevo Proyecto
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 bg-[#1c2024]/40 backdrop-blur-xl border-[#45484c]/20">
            <CCardHeader className="bg-transparent border-[#45484c]/20 text-white d-flex align-items-center">
              <CIcon icon={cilIndustry} className="me-2 text-info" />
              Proyectos Registrados en la Plataforma
            </CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border text-white" hover responsive>
                <CTableHead color="dark">
                  <CTableRow>
                    <CTableHeaderCell>Operador</CTableHeaderCell>
                    <CTableHeaderCell>Tienda / Proyecto</CTableHeaderCell>
                    <CTableHeaderCell>Ubicación</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {proyectos.map((p) => (
                    <CTableRow key={p._id}>
                      <CTableDataCell>
                        <div className="d-flex align-items-center">
                          <CAvatar size="md" src={getLogoSrc(p.operador?.logo)} className="me-3" color="info">
                            {p.operador?.nombre.charAt(0) || 'P'}
                          </CAvatar>
                          <div className="fw-bold">{p.operador?.nombre || 'N/A'}</div>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="fw-semibold">{p.nombre}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        {p.municipio?.nombre}, {p.departamento?.nombre}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="success">Activo</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton size="sm" color="transparent" onClick={() => handleOpenModal(p)}>
                           <CIcon icon={cilPencil} className="text-warning" />
                        </CButton>
                        <CButton size="sm" color="transparent" onClick={() => handleDelete(p._id)}>
                           <CIcon icon={cilTrash} className="text-danger" />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {proyectos.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan="5" className="text-center py-4 text-secondary">
                        No hay proyectos registrados.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Modal Crear/Editar Registro */}
      <CModal visible={modal} onClose={() => setModal(false)} className="backdrop-blur-md">
        <CModalHeader className="bg-[#1c2024] border-[#45484c]/20 text-white">
          <CModalTitle>{isEdit ? 'Editar registro' : 'Crear registro'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="bg-[#1c2024] text-white">
          <CForm>
            <div className="mb-3">
              <CFormLabel>Piloto *</CFormLabel>
              <CFormInput 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={nuevoProyecto.nombre} 
                onChange={(e) => setNuevoProyecto({...nuevoProyecto, nombre: e.target.value})}
                placeholder="Nombre del proyecto/tienda"
              />
            </div>

            <div className="mb-3">
              <CFormLabel>Departamento *</CFormLabel>
              <CFormSelect 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={dptoSeleccionado}
                onChange={(e) => {
                  setDptoSeleccionado(e.target.value);
                  setNuevoProyecto({...nuevoProyecto, municipio: ''});
                }}
              >
                <option value="">Seleccione...</option>
                {departamentos.map(d => (
                  <option key={d._id} value={d.codigoDepartamento}>{d.nombre}</option>
                ))}
              </CFormSelect>
            </div>

            <div className="mb-3">
              <CFormLabel>Municipio *</CFormLabel>
              <CFormSelect 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={nuevoProyecto.municipio}
                onChange={(e) => setNuevoProyecto({...nuevoProyecto, municipio: e.target.value})}
                disabled={!dptoSeleccionado}
              >
                <option value="">Seleccione...</option>
                {municipios.map(m => (
                  <option key={m._id} value={m._id}>{m.nombre}</option>
                ))}
              </CFormSelect>
            </div>

            <div className="mb-3">
              <CFormLabel>Operador *</CFormLabel>
              <CFormSelect 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={nuevoProyecto.operador}
                onChange={(e) => setNuevoProyecto({...nuevoProyecto, operador: e.target.value})}
              >
                <option value="">Seleccione...</option>
                {operadores.map(o => (
                  <option key={o._id} value={o._id}>{o.nombre}</option>
                ))}
              </CFormSelect>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className="bg-[#1c2024] border-[#45484c]/20 justify-content-between">
          <CButton color="secondary" onClick={() => setModal(false)}>Cancelar</CButton>
          <CButton color="primary" onClick={handleSave}>
            {isEdit ? 'Actualizar cambios' : 'Guardar cambios'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default Proyectos;
