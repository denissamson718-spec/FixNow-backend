import { useState } from 'react'
import axios from 'axios'
import './LoginPage.css'

interface LoginPageProps {
  setIsAuthenticated: (value: boolean) => void
}

export default function LoginPage({ setIsAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log('Attempting login with:', email)
      
      const response = await axios.post('/api/auth/login', {
        email,
        password
      })

      console.log('Login response:', response.data)

      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setIsAuthenticated(true)
      } else if (response.data.success === false) {
        setError(response.data.message || 'Login failed')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      const message = err.response?.data?.message || err.message || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>FixNow Admin</h1>
          <p>Dashboard Login</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isLoading} className="login-button">
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo credentials:</p>
          <p>Email: <code>admin@fixnow.local</code></p>
          <p>Password: <code>Admin@12345</code></p>
        </div>
      </div>
    </div>
  )
}
