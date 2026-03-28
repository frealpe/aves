import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CFormInput,
  CFormLabel,
} from '@coreui/react-pro'
import useWebWebSocket from '../../hook/useWebWebSocket'

const DeviceControl = () => {
  const { sendCommand, isConnected } = useWebWebSocket()
  const [deviceId, setDeviceId] = useState('esp32_001')
  const [message, setMessage] = useState('')

  const handleAvatar = (state) => {
    sendCommand(deviceId, 'display_avatar', { state })
  }

  const handleMessage = () => {
    sendCommand(deviceId, 'show_message', { text: message })
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Device Control Panel</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol sm={4}>
                <CFormLabel>Target Device ID</CFormLabel>
                <CFormInput
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="e.g. esp32_001"
                />
              </CCol>
            </CRow>

            <CRow className="mb-4">
              <CCol sm={12}>
                <h5>Avatar Actions</h5>
                <CButton
                  color="primary"
                  className="me-2"
                  onClick={() => handleAvatar('JUMP')}
                  disabled={!isConnected}
                >
                  Jump
                </CButton>
                <CButton
                  color="success"
                  className="me-2"
                  onClick={() => handleAvatar('WALK')}
                  disabled={!isConnected}
                >
                  Walk
                </CButton>
                <CButton
                  color="secondary"
                  onClick={() => handleAvatar('IDLE')}
                  disabled={!isConnected}
                >
                  Idle
                </CButton>
              </CCol>
            </CRow>

            <CRow>
              <CCol sm={6}>
                <h5>Send Message</h5>
                <div className="d-flex">
                  <CFormInput
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type message here..."
                    className="me-2"
                  />
                  <CButton color="info" onClick={handleMessage} disabled={!isConnected || !message}>
                    Send
                  </CButton>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default DeviceControl
