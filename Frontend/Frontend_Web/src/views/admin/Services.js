import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CTable } from '@coreui/react-pro'

const Services = () => {
  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Services Management</strong>
          </CCardHeader>
          <CCardBody>
            <CTable hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Service Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Dog Walking</td>
                  <td>30 min dog walking service</td>
                  <td>$15</td>
                  <td>Active</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>AR Interaction Session</td>
                  <td>15 min with the digital pet</td>
                  <td>$10</td>
                  <td>Active</td>
                </tr>
              </tbody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Services
