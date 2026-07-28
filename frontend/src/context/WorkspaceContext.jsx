import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/services/api'
import { useAuth } from './AuthContext'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null)
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([])
      setActiveWorkspaceId(null)
      setActiveWorkspace(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await api.workspace.list()
      setWorkspaces(data.workspaces)
      setActiveWorkspaceId(data.activeWorkspaceId)
      if (data.activeWorkspaceId) {
        const ws = data.workspaces.find(w => w.id === data.activeWorkspaceId)
        if (ws) {
          setActiveWorkspace(ws)
        } else {
          const detail = await api.workspace.get(data.activeWorkspaceId)
          setActiveWorkspace(detail)
        }
      } else if (data.workspaces.length > 0) {
        const detail = await api.workspace.get(data.workspaces[0].id)
        setActiveWorkspace(detail)
        setActiveWorkspaceId(detail.id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    refreshWorkspaces()
  }, [refreshWorkspaces])

  const switchWorkspace = useCallback(async (workspaceId) => {
    try {
      await api.workspace.switchWorkspace(workspaceId)
      setActiveWorkspaceId(workspaceId)
      const ws = workspaces.find(w => w.id === workspaceId)
      if (ws) {
        setActiveWorkspace(ws)
      } else {
        const detail = await api.workspace.get(workspaceId)
        setActiveWorkspace(detail)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [workspaces])

  const createWorkspace = useCallback(async (data) => {
    const ws = await api.workspace.create(data)
    await refreshWorkspaces()
    return ws
  }, [refreshWorkspaces])

  const refreshActiveWorkspace = useCallback(async () => {
    if (!activeWorkspaceId) return
    try {
      const detail = await api.workspace.get(activeWorkspaceId)
      setActiveWorkspace(detail)
    } catch (err) {
      setError(err.message)
    }
  }, [activeWorkspaceId])

  const value = useMemo(() => ({
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    loading,
    error,
    switchWorkspace,
    createWorkspace,
    refreshWorkspaces,
    refreshActiveWorkspace,
    hasWorkspaces: workspaces.length > 0
  }), [workspaces, activeWorkspaceId, activeWorkspace, loading, error, switchWorkspace, createWorkspace, refreshWorkspaces, refreshActiveWorkspace])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

export default WorkspaceContext
