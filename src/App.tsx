import { HashRouter, Route, Routes } from 'react-router-dom'
import { AccessGate } from '@/components/AccessGate'
import { AccountGate } from '@/components/AccountGate'
import { IdentityBar } from '@/components/IdentityBar'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { TripPage } from '@/pages/TripPage'

function AppContent() {
  const { member } = useAuth()

  if (!member) {
    return <AccountGate />
  }

  return (
    <>
      <IdentityBar />
      <Routes>
        <Route path="/" element={<TripPage />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <AccessGate>
      <AuthProvider>
        <HashRouter>
          <AppContent />
          <Toaster />
        </HashRouter>
      </AuthProvider>
    </AccessGate>
  )
}

export default App
