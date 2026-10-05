import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Logo from './Logo'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', roles: null },
  { to: '/live-ops', label: 'Live Ops', icon: '◎', roles: null },
  { to: '/sos', label: 'SOS Alerts', icon: '⚠', roles: null, badge: 'sos' },
  { to: '/trips', label: 'Trips', icon: '▤', roles: null },
  { to: '/drivers', label: 'Drivers', icon: '🚚', roles: null },
  { to: '/riders', label: 'Users', icon: '◍', roles: null },
  { to: '/dispatch', label: 'Dispatch', icon: '⌖', roles: ['owner'] },
  { to: '/pricing', label: 'Pricing', icon: '₦', roles: ['owner', 'finance'] },
  { to: '/payment-methods', label: 'Payment Methods', icon: '💳', roles: ['owner', 'finance'] },
  { to: '/addons', label: 'Add-ons', icon: '+', roles: ['owner', 'finance'] },
  { to: '/commission', label: 'Commission', icon: '%', roles: ['owner', 'finance'] },
  { to: '/promotions', label: 'Promotions', icon: '★', roles: ['owner', 'finance'] },
  { to: '/payouts', label: 'Payouts', icon: '⇄', roles: ['owner', 'finance', 'support'] },
  { to: '/cash-commission', label: 'Cash Commission', icon: 'R', roles: ['owner', 'finance'] },
  { to: '/support', label: 'Support', icon: '✆', roles: null },
  { to: '/deletion-requests', label: 'Deletion Requests', icon: '⌫', roles: null, badge: 'deletions' },
  { to: '/team', label: 'Team', icon: '◈', roles: ['owner'] },
  { to: '/audit-log', label: 'Audit Log', icon: '☰', roles: ['owner'] },
]

export default function Layout({ children }) {
  const { adminUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ sos: 0, deletions: 0 })

  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      const [sos, del] = await Promise.all([
        supabase.from('sos_alerts').select('id', { count: 'exact', head: true }).is('resolved_at', null),
        supabase.from('account_deletion_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed']),
      ])
      if (!cancelled) setCounts({ sos: sos.count ?? 0, deletions: del.count ?? 0 })
    }
    loadCounts()
    const t = setInterval(loadCounts, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

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
              {item.badge && counts[item.badge] > 0 && (
                <span className={'nav-count' + (item.badge === 'sos' ? ' nav-count-alert' : '')}>{counts[item.badge]}</span>
              )}
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
