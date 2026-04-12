import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilUser } from '@coreui/icons';
import authApi from '../../service/authApi';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = React.useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login(correo, password);
      login(data.usuario, data.token);
      navigate('/avatar/probador');
    } catch (err) {
      setError(err.msg || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-light min-vh-100 d-flex flex-row align-items-center" style={{
      backgroundImage: 'url("/login_bg.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }}>
      {/* Overlay para efecto glassmorphism */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(5px)',
        zIndex: 1
      }}></div>

      <CContainer style={{ zIndex: 10 }}>
        <CRow className="justify-content-center">
          <CCol md={5}>
            <CCard className="p-4 shadow-lg border-0" style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px'
            }}>
              <CCardBody className="text-white">
                <CForm onSubmit={handleLogin}>
                  <div className="text-center mb-4">
                    <h1 className="fw-bold mb-0" style={{ color: '#00e5ff', textShadow: '0 0 15px rgba(0, 229, 255, 0.5)' }}>
                      ModAvatar
                    </h1>
                    <p className="text-white-50">Inicia sesión en tu laboratorio personal</p>
                  </div>

                  {error && <CAlert color="danger" className="py-2 small">{error}</CAlert>}

                  <CInputGroup className="mb-3">
                    <CInputGroupText style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)', borderRadius: 0 }}>
                      <CIcon icon={cilUser} style={{ color: '#00e5ff' }} />
                    </CInputGroupText>
                    <CFormInput 
                      placeholder="Correo Electrónico" 
                      autoComplete="username" 
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        borderBottom: '1px solid rgba(255,255,255,0.3)', 
                        color: 'white',
                        borderRadius: 0,
                        paddingLeft: '15px'
                      }}
                      className="login-input"
                    />
                  </CInputGroup>

                  <CInputGroup className="mb-4">
                    <CInputGroupText style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)', borderRadius: 0 }}>
                      <CIcon icon={cilLockLocked} style={{ color: '#00e5ff' }} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Contraseña"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        borderBottom: '1px solid rgba(255,255,255,0.3)', 
                        color: 'white',
                        borderRadius: 0,
                        paddingLeft: '15px'
                      }}
                    />
                  </CInputGroup>

                  <CRow>
                    <CCol xs={12}>
                      <CButton 
                        type="submit"
                        color="primary" 
                        className="w-100 py-2 fw-bold" 
                        disabled={loading}
                        style={{
                          background: 'linear-gradient(45deg, #00e5ff, #007bff)',
                          border: 'none',
                          borderRadius: '10px',
                          boxShadow: '0 5px 15px rgba(0, 229, 255, 0.3)'
                        }}
                      >
                        {loading ? 'INGRESANDO...' : 'INICIAR SESIÓN'}
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-input::placeholder { color: rgba(255,255,255,0.5); }
        .login-input:focus { 
          background: transparent !important; 
          color: white !important;
          box-shadow: none !important;
          border-bottom: 1px solid #00e5ff !important;
        }
      `}} />
    </div>
  );
};

export default Login;
