import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './DashboardPage.css'

type ActivityStatus = 'active' | 'inactive'
type ActiveTab = 'pending' | 'mechanics' | 'drivers'

interface CredentialAsset {
  fileName?: string | null
  uri?: string | null
  webUri?: string | null
}

interface MechanicCredentials {
  identificationType?: string
  identificationNumber?: string
  identificationImage?: CredentialAsset
  certificateDocument?: CredentialAsset
  experienceYears?: number | string
  transportMode?: string
  workingGarage?: string
  garageLocation?: string
}

interface AccountLocation {
  latitude?: number
  longitude?: number
  label?: string
  updatedAt?: string
}

interface Account {
  id: string
  role: string
  password?: string
  profile: {
    fullName: string
    email: string
    phone: string
    profilePhoto?: { uri: string }
  }
  approvalStatus?: string
  createdAt?: string
  activityStatus?: ActivityStatus
  lastSeenAt?: string | null
  lastKnownLocation?: AccountLocation
  mechanicCredentials?: MechanicCredentials
}

interface ServiceRequestSummary {
  requestedByAccountId?: string
  locationLabel?: string
  latitude?: number
  longitude?: number
  createdAt?: string
}

interface OverviewResponse {
  stats?: {
    drivers?: number
    mechanics?: number
    pendingApprovals?: number
    activeDrivers?: number
    inactiveDrivers?: number
    activeMechanics?: number
    inactiveMechanics?: number
  }
  drivers?: Account[]
  mechanics?: Account[]
  pendingMechanics?: Account[]
  requests?: ServiceRequestSummary[]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [pendingMechanics, setPendingMechanics] = useState<Account[]>([])
  const [mechanics, setMechanics] = useState<Account[]>([])
  const [drivers, setDrivers] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [approveLoadingId, setApproveLoadingId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('mechanics')

  const fetchOverview = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      const token = localStorage.getItem('authToken')
      const response = await axios.get('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const payload = response.data as OverviewResponse
      setOverview(payload)
      setPendingMechanics(payload.pendingMechanics || [])
      setMechanics(payload.mechanics || [])
      setDrivers(payload.drivers || [])
      setLastUpdated(new Date())
      setError('')
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch dashboard data.'
      setError(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchOverview(false)

    const intervalId = setInterval(() => {
      void fetchOverview(true)
    }, 10000)

    return () => {
      clearInterval(intervalId)
    }
  }, [fetchOverview])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleApproveMechanic = async (mechanicId: string) => {
    setApproveLoadingId(mechanicId)
    setError('')

    try {
      const token = localStorage.getItem('authToken')
      await axios.post(
        `/api/admin/mechanics/${mechanicId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      await fetchOverview(true)
    } catch (err: any) {
      if (err.response?.status === 404) {
        try {
          const token = localStorage.getItem('authToken')
          await axios.post(
            `/api/admin/approve/${mechanicId}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
          await fetchOverview(true)
          setApproveLoadingId(null)
          return
        } catch (fallbackErr: any) {
          const fallbackMessage = fallbackErr.response?.data?.message || fallbackErr.message || 'Failed to approve mechanic.'
          setError(fallbackMessage)
        }
      } else {
        const message = err.response?.data?.message || err.message || 'Failed to approve mechanic.'
        setError(message)
      }
    } finally {
      setApproveLoadingId(null)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) {
      return 'N/A'
    }

    const timestamp = Date.parse(value)
    if (Number.isNaN(timestamp)) {
      return value
    }

    return new Date(timestamp).toLocaleString()
  }

  const statusBadgeLabel = (account: Account) => {
    if (account.approvalStatus === 'pending') {
      return 'Pending Approval'
    }

    return 'Approved'
  }

  const activityBadgeLabel = (status?: ActivityStatus) => {
    return status === 'active' ? 'Active' : 'Inactive'
  }

  const openCredentialTemplate = (mechanicId: string) => {
    navigate(`/dashboard/mechanics/${mechanicId}/credentials`)
  }

  const formatCoordinates = (latitude?: number, longitude?: number) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return ''
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return ''
    }

    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
  }

  const findLatestRequestLocation = (accountId: string) => {
    const requests = overview?.requests || []
    const byAccount = requests.filter((request) => request.requestedByAccountId === accountId)

    if (!byAccount.length) {
      return ''
    }

    const sorted = [...byAccount].sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || '')
      const rightTime = Date.parse(right.createdAt || '')

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return 0
      }

      return rightTime - leftTime
    })

    const newest = sorted[0]
    const label = newest.locationLabel?.trim() || ''

    if (label) {
      return label
    }

    return formatCoordinates(newest.latitude, newest.longitude)
  }

  const resolveKnownLocation = (account: Account) => {
    const explicitLabel = account.lastKnownLocation?.label?.trim() || ''
    if (explicitLabel) {
      return explicitLabel
    }

    const coordinates = formatCoordinates(account.lastKnownLocation?.latitude, account.lastKnownLocation?.longitude)
    if (coordinates) {
      return coordinates
    }

    if (account.role === 'driver') {
      const latestRequestLocation = findLatestRequestLocation(account.id)
      if (latestRequestLocation) {
        return latestRequestLocation
      }
    }

    const garageLocation = account.mechanicCredentials?.garageLocation?.trim() || ''
    if (garageLocation) {
      return garageLocation
    }

    return 'Location not shared yet'
  }

  const renderMechanicCredentialTemplate = (mechanic: Account) => {
    return (
      <div className="credential-template">
        <div className="template-section">
          <h4>Mechanic Name</h4>
          <p className="name-inline">
            <span className="name-row-label">Name:</span>
            <strong className="name-row-value">{mechanic.profile.fullName || 'N/A'}</strong>
          </p>
        </div>

        <div className="template-section">
          <h4>Details</h4>
          <p className="template-note">Open View Credential Template to see full profile, email, phone, ID details, and documents.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="loader">Loading dashboard...</div>
  }

  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>FixNow Admin Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="user-info">{user?.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-toolbar">
        <div className="toolbar-meta">
          <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'N/A'}</span>
          {isRefreshing && <span className="refreshing-state">Refreshing...</span>}
        </div>
        <button type="button" className="refresh-button" onClick={() => void fetchOverview(true)} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
        </button>
      </div>

      <nav className="dashboard-nav">
        <button
          className={`nav-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Mechanics ({pendingMechanics.length})
        </button>
        <button
          className={`nav-button ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          Drivers ({drivers.length})
        </button>
        <button
          className={`nav-button ${activeTab === 'mechanics' ? 'active' : ''}`}
          onClick={() => setActiveTab('mechanics')}
        >
          Mechanics ({mechanics.length})
        </button>
      </nav>

      <main className="dashboard-main">
        {error && <div className="error-banner">{error}</div>}

        {activeTab === 'pending' && (
          <div className="pending-section">
            <h2>Pending Mechanic Approvals</h2>
            {pendingMechanics.length === 0 ? (
              <p className="empty-state">No pending mechanics</p>
            ) : (
              <div className="accounts-grid">
                {pendingMechanics.map((mechanic) => (
                  <div key={mechanic.id} className="account-card">
                    <div className="account-header">
                      <div className="account-identity">
                        <div className="account-avatar">
                          {mechanic.profile.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3>{mechanic.profile.fullName}</h3>
                          <p>{mechanic.profile.email}</p>
                        </div>
                      </div>
                      <div className="badge-row">
                        <span className="badge pending">{statusBadgeLabel(mechanic)}</span>
                        <span className={`badge ${mechanic.activityStatus === 'active' ? 'approved' : 'inactive'}`}>
                          {activityBadgeLabel(mechanic.activityStatus)}
                        </span>
                      </div>
                    </div>
                    <div className="account-details">
                      {renderMechanicCredentialTemplate(mechanic)}
                    </div>
                    <button
                      onClick={() => handleApproveMechanic(mechanic.id)}
                      className="approve-button"
                      disabled={approveLoadingId === mechanic.id}
                    >
                      {approveLoadingId === mechanic.id ? 'Approving...' : 'Approve Mechanic'}
                    </button>
                    <button
                      type="button"
                      className="view-template-button"
                      onClick={() => openCredentialTemplate(mechanic.id)}
                    >
                      View Credential Template
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mechanics' && (
          <div className="drivers-section">
            <h2>All Mechanics</h2>
            {mechanics.length === 0 ? (
              <p className="empty-state">No mechanics available</p>
            ) : (
              <div className="accounts-grid">
                {mechanics.map((mechanic) => (
                  <div key={mechanic.id} className="account-card">
                    <div className="account-header">
                      <div className="account-identity">
                        <div className="account-avatar">
                          {mechanic.profile.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3>{mechanic.profile.fullName}</h3>
                          <p>{mechanic.profile.email}</p>
                        </div>
                      </div>
                      <div className="badge-row">
                        <span className={`badge ${mechanic.approvalStatus === 'pending' ? 'pending' : 'approved'}`}>
                          {statusBadgeLabel(mechanic)}
                        </span>
                        <span className={`badge ${mechanic.activityStatus === 'active' ? 'approved' : 'inactive'}`}>
                          {activityBadgeLabel(mechanic.activityStatus)}
                        </span>
                      </div>
                    </div>
                    <div className="account-details">
                      {renderMechanicCredentialTemplate(mechanic)}
                    </div>
                    {mechanic.approvalStatus === 'pending' && (
                      <button
                        onClick={() => handleApproveMechanic(mechanic.id)}
                        className="approve-button"
                        disabled={approveLoadingId === mechanic.id}
                      >
                        {approveLoadingId === mechanic.id ? 'Approving...' : 'Approve Mechanic'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="view-template-button"
                      onClick={() => openCredentialTemplate(mechanic.id)}
                    >
                      View Credential Template
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="drivers-section">
            <h2>Registered Drivers</h2>
            {drivers.length === 0 ? (
              <p className="empty-state">No drivers registered</p>
            ) : (
              <div className="accounts-grid">
                {drivers.map((driver) => (
                  <div key={driver.id} className="account-card">
                    <div className="account-header">
                      <div className="account-identity">
                        <div className="account-avatar">
                          {driver.profile.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3>{driver.profile.fullName}</h3>
                          <p>{driver.profile.email}</p>
                          <p className="account-password-line">Password: {driver.password || 'N/A'}</p>
                        </div>
                      </div>
                      <span className={`badge ${driver.activityStatus === 'active' ? 'approved' : 'inactive'}`}>
                        {activityBadgeLabel(driver.activityStatus)}
                      </span>
                    </div>
                    <div className="account-details">
                      <div className="detail-grid">
                        <div className="detail-row">
                          <span>Phone</span>
                          <strong>{driver.profile.phone || 'N/A'}</strong>
                        </div>
                        <div className="detail-row">
                          <span>Joined</span>
                          <strong>{formatDate(driver.createdAt)}</strong>
                        </div>
                        <div className="detail-row">
                          <span>Last Known Location</span>
                          <strong>{resolveKnownLocation(driver)}</strong>
                        </div>
                        <div className="detail-row">
                          <span>Last Seen</span>
                          <strong>{formatDate(driver.lastSeenAt || driver.lastKnownLocation?.updatedAt)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
