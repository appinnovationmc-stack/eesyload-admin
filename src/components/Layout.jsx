import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from './Logo'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', roles: null },
  { to: '/live-ops', label: 'Live Ops', icon: '◎', roles: null },
  { to: '/trips', label: 'Trips', icon: '▤', roles: null },
  { to: '/drivers', label: 'Drivers', icon: '🚚', roles: null },
  { to: '/riders', label: 'Users', icon: '◍', roles: null },
  { to: '/pricing', label: 'Pricing', icon: '₦', roles: ['owner', 'finance'] },
  { to: '/addons', label: 'Add-ons', icon: '+', roles: ['owner', 'finance'] },
  { to: '/commission', label: 'Commission', icon: '%', roles: ['owner', 'finance'] },
  { to: '/promotions', label: 'Promotions', icon: '★', roles: ['owner', 'finance'] },
  { to: '/payouts', label: 'Payouts', icon: '⇄', roles: ['owner', 'finance', 'support'] },
  { to: '/support', label: 'Support', icon: '✆', roles: null },
  { to: '/team', label: 'Team', icon: '◈', roles: ['owner'] },
  { to: '/audit-log', label: 'Audit Log', icon: '☰', roles: ['owner'] },
]

export default function Layout({ children }) {
  const { adminUser, signOut } = useAuth()
  const navigate = useNavigate()

  const visibleNav = NAV.filter(item => !item.roles || item.roles.includes(adminUser?.role))

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Logo size={20} wordmarkColor="#000" /></span>
          <span className="brand-name">EesyLoad<span className="brand-sub">Admin</span></span>
        </div>

        <nav className="nav">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{adminUser?.email?.[0]?.toUpperCase()}</div>
            <div className="user-info">
              <div className="user-email">{adminUser?.email}</div>
              <div className="user-role">{adminUser?.role}</div>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  )
}
