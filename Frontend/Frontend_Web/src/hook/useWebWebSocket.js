import { useState, useEffect, useCallback } from 'react'
import io from 'socket.io-client'

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000'

const useWebWebSocket = () => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [deviceData, setDeviceData] = useState(null)

  useEffect(() => {
    const newSocket = io(BACKEND_URL)

    newSocket.on('connect', () => {
      console.log('Connected to backend WebSocket')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from backend WebSocket')
      setIsConnected(false)
    })

    newSocket.on('iot:data', (data) => {
      if (data && data.payload) {
        setDeviceData(data.payload)
      }
    })

    newSocket.on('iot:status', (status) => {
      console.log('Device status changed:', status)
    })

    setSocket(newSocket)

    return () => newSocket.close()
  }, [])

  const sendCommand = useCallback(
    (deviceId, commandType, payload = {}) => {
      if (socket && isConnected) {
        socket.emit('iot:command', {
          device_id: deviceId,
          command: {
            type: 'event',
            action: commandType,
            payload,
          },
        })
      }
    },
    [socket, isConnected],
  )

  return {
    isConnected,
    deviceData,
    sendCommand,
  }
}

export default useWebWebSocket
