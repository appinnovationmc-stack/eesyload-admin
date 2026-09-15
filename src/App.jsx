import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RoleGuard from './components/RoleGuard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PricingConfig from './pages/PricingConfig'
import Addons from './pages/Addons'
import CommissionRules from './pages/CommissionRules'
import Payouts from './pages/Payouts'
import Drivers from './pages/Drivers'
import LiveOps from './pages/LiveOps'
import Trips from './pages/Trips'
import Riders from './pages/Riders'
import Promotions from './pages/Promotions'
import Support from './pages/Support'
import Team from './pages/Team'
import AuditLog from './pages/AuditLog'

function Page({ children }) {
  return (
    <RoleGuard>
      <Layout>{children}</Layout>
    </RoleGuard>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Page><Dashboard /></Page>} />
          <Route path="/drivers" element={<Page><Drivers /></Page>} />
          <Route path="/live-ops" element={<Page><LiveOps /></Page>} />
          <Route path="/pricing" element={<Page><PricingConfig /></Page>} />
          <Route path="/addons" element={<Page><Addons /></Page>} />
          <Route path="/commission" element={<Page><CommissionRules /></Page>} />
          <Route path="/payouts" element={<Page><Payouts /></Page>} />
          <Route path="/trips" element={<Page><Trips /></Page>} />
          <Route path="/riders" element={<Page><Riders /></Page>} />
          <Route path="/promotions" element={<Page><Promotions /></Page>} />
          <Route path="/support" element={<Page><Support /></Page>} />
          <Route path="/team" element={<Page><Team /></Page>} />
          <Route path="/audit-log" element={<Page><AuditLog /></Page>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
