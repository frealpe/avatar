import React from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CFormInput,
  CButton,
  CInputGroup,
  CListGroup,
  CListGroupItem,
  CSpinner
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilSend } from '@coreui/icons';
import { useAgent } from '../../hook/control/useAgent';

const Agent = () => {
  const {
    messages,
    input,
    setInput,
    loading,
    handleSend,
    handleKeyPress,
    endOfMessagesRef
  } = useAgent();

  return (
    <CRow className="justify-content-center">
      <CCol xs={12} md={8} lg={6}>
        <CCard className="mb-4 shadow-sm border-0">
          <CCardHeader className="bg-dark text-white d-flex align-items-center">
            <h5 className="mb-0">🤖 IA Mission Control (Co-Piloto)</h5>
          </CCardHeader>
          <CCardBody className="d-flex flex-column" style={{ height: '60vh' }}>
            <div className="flex-grow-1 overflow-auto mb-3 p-3 bg-light rounded">
              <CListGroup flush>
                {messages.map((msg, idx) => (
                  <CListGroupItem 
                    key={idx} 
                    className={`border-0 bg-transparent d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                  >
                    <div 
                      className={`p-2 rounded-3 text-white ${msg.sender === 'user' ? 'bg-primary' : 'bg-secondary'}`}
                      style={{ maxWidth: '80%', wordWrap: 'break-word' }}
                    >
                      {msg.text}
                    </div>
                  </CListGroupItem>
                ))}
                <div ref={endOfMessagesRef} />
              </CListGroup>
              {loading && (
                <div className="d-flex justify-content-start mt-2 ms-3">
                  <CSpinner size="sm" color="secondary" />
                </div>
              )}
            </div>
            <CInputGroup>
              <CFormInput 
                placeholder="Ej. Haz que el drone Slave_D8 vuele a 1, 2, 0"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              <CButton color="primary" onClick={handleSend} disabled={loading}>
                <CIcon icon={cilSend} /> Enviar
              </CButton>
            </CInputGroup>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default Agent;
