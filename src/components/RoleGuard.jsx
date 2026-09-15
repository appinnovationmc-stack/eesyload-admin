import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// requiredRoles: array like ['owner'] or ['owner','finance']. Omit for "any logged-in admin".
export default function RoleGuard({ children, requiredRoles }) {
  const { session, adminUser, loading } = useAuth()

  if (loading) return <div className="page-loading">Loading…</div>

  if (!session) return <Navigate to="/login" replace />

  if (!adminUser) {
    return (
      <div className="access-denied">
        <h2>No admin access</h2>
        <p>Your account isn't set up as an EesyLoad admin. Ask an owner to add you in admin_users.</p>
      </div>
    )
  }

  if (requiredRoles && !requiredRoles.includes(adminUser.role)) {
    return (
      <div className="access-denied">
        <h2>Restricted</h2>
        <p>Your role ({adminUser.role}) doesn't have access to this page.</p>
      </div>
    )
  }

  return children
}
