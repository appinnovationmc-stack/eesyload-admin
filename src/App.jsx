import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RoleGuard from './components/RoleGuard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PricingConfig from './pages/PricingConfig'
import PaymentMethods from './pages/PaymentMethods'
import Addons from './pages/Addons'
import CommissionRules from './pages/CommissionRules'
import Payouts from './pages/Payouts'
import CashCommission from './pages/CashCommission'
import Drivers from './pages/Drivers'
import LiveOps from './pages/LiveOps'
import Trips from './pages/Trips'
import Riders from './pages/Riders'
import Promotions from './pages/Promotions'
import Support from './pages/Support'
import SosAlerts from './pages/SosAlerts'
import DeletionRequests from './pages/DeletionRequests'
import Dispatch from './pages/Dispatch'
import Team from './pages/Team'
import AuditLog from './pages/AuditLog'

const FINANCE = ['owner', 'finance']
const OWNER = ['owner']

function Page({ children, roles }) {
  return (
    <RoleGuard requiredRoles={roles}>
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
          <Route path="/sos" element={<Page><SosAlerts /></Page>} />
          <Route path="/dispatch" element={<Page roles={OWNER}><Dispatch /></Page>} />
          <Route path="/pricing" element={<Page roles={FINANCE}><PricingConfig /></Page>} />
          <Route path="/payment-methods" element={<Page roles={FINANCE}><PaymentMethods /></Page>} />
          <Route path="/addons" element={<Page roles={FINANCE}><Addons /></Page>} />
          <Route path="/commission" element={<Page roles={FINANCE}><CommissionRules /></Page>} />
          <Route path="/payouts" element={<Page><Payouts /></Page>} />
          <Route path="/cash-commission" element={<Page roles={FINANCE}><CashCommission /></Page>} />
          <Route path="/trips" element={<Page><Trips /></Page>} />
          <Route path="/riders" element={<Page><Riders /></Page>} />
          <Route path="/promotions" element={<Page roles={FINANCE}><Promotions /></Page>} />
          <Route path="/support" element={<Page><Support /></Page>} />
          <Route path="/deletion-requests" element={<Page><DeletionRequests /></Page>} />
          <Route path="/team" element={<Page roles={OWNER}><Team /></Page>} />
          <Route path="/audit-log" element={<Page roles={OWNER}><AuditLog /></Page>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
