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
import { cilPeople, cilTrash, cilPencil } from '@coreui/icons';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../../service/usuariosApi';
import { getProyectos } from '../../service/proyectosApi';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [proyectosDisponibles, setProyectosDisponibles] = useState([]);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [usuarioActualId, setUsuarioActualId] = useState(null);
  
  const [usuarioForm, setUsuarioForm] = useState({
    nombre: '',
    dni: '',
    correo: '',
    password: '',
    rol: 'USER',
    celular: '',
    proyectos: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [uResp, pResp] = await Promise.all([
        getUsuarios(),
        getProyectos()
      ]);
      if (uResp.ok) {
        setUsuarios(uResp.usuarios);
        setTotal(uResp.total);
      }
      if (pResp.ok) {
        setProyectosDisponibles(pResp.proyectos);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleOpenModal = (u = null) => {
    if (u) {
      setIsEdit(true);
      setUsuarioActualId(u.uid);
      setUsuarioForm({
        nombre: u.nombre,
        dni: u.dni,
        correo: u.correo,
        password: '',
        rol: u.rol,
        celular: u.celular || '',
        proyectos: u.proyectos?.map(p => p._id) || []
      });
    } else {
      setIsEdit(false);
      setUsuarioActualId(null);
      setUsuarioForm({ 
        nombre: '', 
        dni: '', 
        correo: '', 
        password: '', 
        rol: 'USER', 
        celular: '', 
        proyectos: [] 
      });
    }
    setModal(true);
  };

  const handleSave = async () => {
    if (!usuarioForm.nombre || !usuarioForm.correo || !usuarioForm.dni || ( !isEdit && !usuarioForm.password)) {
      alert('Por favor complete los campos obligatorios (*)');
      return;
    }

    try {
      let resp;
      if (isEdit) {
        const data = { ...usuarioForm };
        if (!data.password) delete data.password;
        resp = await updateUsuario(usuarioActualId, data);
      } else {
        resp = await createUsuario(usuarioForm);
      }

      if (resp.ok) {
        setModal(false);
        fetchInitialData();
      }
    } catch (err) {
      console.error('Error saving user:', err);
      alert('Error al guardar usuario. Verifique los datos duplicados.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de desactivar este usuario?')) {
      try {
        const resp = await deleteUsuario(id);
        if (resp.ok) {
            fetchInitialData();
        }
      } catch (err) {
        console.error('Error deleting user:', err);
      }
    }
  };

  return (
    <div className="fade-in">
      <CRow className="mb-4">
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="text-white fw-bold">Panel de Administración de Usuarios</h2>
            <CButton color="info" className="text-white" onClick={() => handleOpenModal()}>
              <CIcon icon={cilPeople} className="me-2" />
              Nuevo Usuario
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12} lg={12}>
          <CCard className="mb-4 bg-[#1c2024]/40 backdrop-blur-xl border-[#45484c]/20">
            <CCardHeader className="bg-transparent border-[#45484c]/20 text-white">
              <CIcon icon={cilPeople} className="me-2 text-info" />
              Gestión de Usuarios (Base de Datos)
            </CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border text-white" hover responsive>
                <CTableHead color="dark">
                  <CTableRow>
                    <CTableHeaderCell>Nombre / DNI</CTableHeaderCell>
                    <CTableHeaderCell>Acceso Proyectos</CTableHeaderCell>
                    <CTableHeaderCell>Rol</CTableHeaderCell>
                    <CTableHeaderCell>Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {usuarios.map((u) => (
                    <CTableRow key={u.uid}>
                      <CTableDataCell>
                        <div className="fw-bold">{u.nombre}</div>
                        <div className="small text-info">{u.correo}</div>
                        <div className="small text-secondary">{u.dni}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex flex-wrap gap-1">
                          {u.rol === 'ADMIN_ROLE' ? (
                            <CBadge color="warning" shape="rounded-pill" className="small text-dark">
                              ACCESO TOTAL (SÚPER ADMIN)
                            </CBadge>
                          ) : u.proyectos && u.proyectos.length > 0 ? (
                            u.proyectos.map(p => (
                              <CBadge key={p._id} color="info" shape="rounded-pill" className="small">
                                {p.nombre}
                              </CBadge>
                            ))
                          ) : (
                            <span className="small text-secondary italic">Sin proyectos asignados</span>
                          )}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={u.rol === 'ADMIN_ROLE' || u.rol === 'ADMIN_USER' ? 'danger' : 'success'}>
                          {u.rol}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton size="sm" color="transparent" title="Editar" onClick={() => handleOpenModal(u)}>
                           <CIcon icon={cilPencil} className="text-warning" />
                        </CButton>
                        <CButton size="sm" color="transparent" title="Eliminar" onClick={() => handleDelete(u.uid)}>
                           <CIcon icon={cilTrash} className="text-danger" />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {usuarios.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan="4" className="text-center py-4 text-secondary">
                        No hay usuarios registrados.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Modal CRUD */}
      <CModal visible={modal} onClose={() => setModal(false)} className="backdrop-blur-md" size="lg">
        <CModalHeader className="bg-[#1c2024] border-[#45484c]/20 text-white">
          <CModalTitle>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="bg-[#1c2024] text-white">
          <CForm className="row g-3">
            <CCol md={6}>
              <CFormLabel>Nombre Completo *</CFormLabel>
              <CFormInput 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={usuarioForm.nombre} 
                onChange={(e) => setUsuarioForm({...usuarioForm, nombre: e.target.value})}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>DNI / Documento *</CFormLabel>
              <CFormInput 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={usuarioForm.dni} 
                onChange={(e) => setUsuarioForm({...usuarioForm, dni: e.target.value})}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Correo Electrónico *</CFormLabel>
              <CFormInput 
                type="email"
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={usuarioForm.correo} 
                onChange={(e) => setUsuarioForm({...usuarioForm, correo: e.target.value})}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>{isEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña *'}</CFormLabel>
              <CFormInput 
                type="password"
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={usuarioForm.password} 
                onChange={(e) => setUsuarioForm({...usuarioForm, password: e.target.value})}
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Rol *</CFormLabel>
              <CFormSelect 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={usuarioForm.rol}
                onChange={(e) => setUsuarioForm({...usuarioForm, rol: e.target.value})}
              >
                <option value="USER">Usuario (Punto de Venta)</option>
                <option value="ADMIN_USER">Administrador de Operador</option>
                <option value="ADMIN_ROLE">Súper Administrador</option>
              </CFormSelect>
            </CCol>

            {usuarioForm.rol !== 'ADMIN_ROLE' && (
              <CCol md={6}>
                <CFormLabel>Asociación a Proyectos (Tiendas)</CFormLabel>
                <CFormSelect 
                  multiple
                  size="4"
                  className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                  value={usuarioForm.proyectos}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setUsuarioForm({...usuarioForm, proyectos: values});
                  }}
                >
                  {proyectosDisponibles.map(p => (
                    <option key={p._id} value={p._id}>{p.nombre}</option>
                  ))}
                </CFormSelect>
                <div className="small text-secondary mt-1">Usa Ctrl/Cmd + click para selección múltiple</div>
              </CCol>
            )}

            {usuarioForm.rol === 'ADMIN_ROLE' && (
               <CCol md={6} className="d-flex align-items-center">
                  <div className="p-3 border border-warning/30 bg-warning/10 rounded w-100 text-warning small italic">
                     Los Súper Administradores tienen acceso a todos los proyectos por defecto. No se requiere selección manual.
                  </div>
               </CCol>
            )}

            <CCol md={6}>
              <CFormLabel>Celular</CFormLabel>
              <CFormInput 
                className="bg-[#2a2e33] border-[#45484c]/30 text-white"
                value={usuarioForm.celular} 
                onChange={(e) => setUsuarioForm({...usuarioForm, celular: e.target.value})}
              />
            </CCol>
          </CForm>
        </CModalBody>
        <CModalFooter className="bg-[#1c2024] border-[#45484c]/20 text-white">
          <CButton color="secondary" onClick={() => setModal(false)}>Cerrar</CButton>
          <CButton color="info" className="text-white" onClick={handleSave}>
            {isEdit ? 'Actualizar Usuario' : 'Crear Usuario'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default Usuarios;
