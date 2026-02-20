'use client'
import { useState } from 'react'
import AgentSidebar from './AgentSidebar'
import ChatInterface from './ChatInterface'

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-landing)' }}>
      <AgentSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(p => !p)}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <ChatInterface />
      </main>
    </div>
  )
}
