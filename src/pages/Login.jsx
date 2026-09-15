import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError(error.message)
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <Logo size={28} wordmarkColor="#000" />
          <span>EesyLoad Admin</span>
        </div>
        <p className="login-sub">Sign in to manage pricing, commission and payouts.</p>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </label>

        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
