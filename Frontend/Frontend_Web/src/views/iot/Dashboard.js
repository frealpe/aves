import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CWidgetStatsA } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer, cilSignalCellular4, cilBatteryFull, cilStorage } from '@coreui/icons'
import useWebWebSocket from '../../hook/useWebWebSocket'

const Dashboard = () => {
  const { deviceData, isConnected } = useWebWebSocket()
  const latestData = deviceData || {}

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>IoT Global Dashboard</strong> - {isConnected ? 'Live' : 'Offline'}
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol sm={6} lg={3}>
                <CWidgetStatsA
                  className="mb-4"
                  color="primary"
                  value={
                    <>{latestData.uptime ? `${Math.round(latestData.uptime / 1000)}s` : 'N/A'}</>
                  }
                  title="Uptime"
                  icon={<CIcon icon={cilSpeedometer} height={24} />}
                />
              </CCol>
              <CCol sm={6} lg={3}>
                <CWidgetStatsA
                  className="mb-4"
                  color="info"
                  value={<>{latestData.signal ? `${latestData.signal} dBm` : 'N/A'}</>}
                  title="Signal Strength"
                  icon={<CIcon icon={cilSignalCellular4} height={24} />}
                />
              </CCol>
              <CCol sm={6} lg={3}>
                <CWidgetStatsA
                  className="mb-4"
                  color="warning"
                  value={<>{latestData.bat ? `${latestData.bat}%` : 'N/A'}</>}
                  title="Battery Level"
                  icon={<CIcon icon={cilBatteryFull} height={24} />}
                />
              </CCol>
              <CCol sm={6} lg={3}>
                <CWidgetStatsA
                  className="mb-4"
                  color="danger"
                  value={
                    <>
                      {latestData.free_heap
                        ? `${Math.round(latestData.free_heap / 1024)} KB`
                        : 'N/A'}
                    </>
                  }
                  title="Free Memory"
                  icon={<CIcon icon={cilStorage} height={24} />}
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Dashboard
