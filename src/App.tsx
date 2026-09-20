import { HashRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TripPage } from '@/pages/TripPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TripPage />} />
      </Routes>
      <Toaster />
    </HashRouter>
  )
}

export default App
