import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import './MechanicCredentialPage.css'

type ActivityStatus = 'active' | 'inactive'
type DocumentKey = 'identification' | 'certificate'

interface CredentialAsset {
  fileName?: string | null
  uri?: string | null
  webUri?: string | null
  mimeType?: string | null
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
  label?: string
  updatedAt?: string
}

interface MechanicAccount {
  id: string
  password?: string
  profile: {
    fullName: string
    email: string
    phone: string
  }
  approvalStatus?: string
  createdAt?: string
  activityStatus?: ActivityStatus
  lastSeenAt?: string | null
  lastKnownLocation?: AccountLocation
  mechanicCredentials?: MechanicCredentials
}

interface OverviewResponse {
  mechanics?: MechanicAccount[]
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'N/A'
  }

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return value
  }

  return new Date(timestamp).toLocaleString()
}

function normalizeIdType(value?: string) {
  if (!value) {
    return 'N/A'
  }

  const normalized = value.toLowerCase()
  if (normalized.includes('voter')) {
    return "Voter's ID"
  }
  if (normalized.includes('nida')) {
    return 'NIDA'
  }
  if (normalized.includes('driver')) {
    return "Driver's License"
  }
  return value
}

function resolveAssetUri(asset?: CredentialAsset) {
  return asset?.webUri || asset?.uri || ''
}

export default function MechanicCredentialPage() {
  const navigate = useNavigate()
  const { mechanicId } = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [mechanic, setMechanic] = useState<MechanicAccount | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentKey>('identification')
  const [showPassword, setShowPassword] = useState(false)

  const fetchMechanic = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const token = localStorage.getItem('authToken')
      try {
        const response = await axios.get(`/api/admin/mechanics/${mechanicId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        setMechanic(response.data?.mechanic || null)
      } catch (directErr: any) {
        if (directErr?.response?.status !== 404) {
          throw directErr
        }

        const overviewResponse = await axios.get('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const overviewData = overviewResponse.data as OverviewResponse
        const matchedMechanic = overviewData.mechanics?.find((account) => account.id === mechanicId) || null

        if (!matchedMechanic) {
          setMechanic(null)
          setError('Mechanic account was not found in overview data.')
          return
        }

        setMechanic(matchedMechanic)
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load mechanic credentials.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [mechanicId])

  useEffect(() => {
    if (!mechanicId) {
      setError('Mechanic id is missing.')
      setIsLoading(false)
      return
    }

    void fetchMechanic()
  }, [fetchMechanic, mechanicId])

  const selectedAsset = useMemo(() => {
    if (!mechanic?.mechanicCredentials) {
      return undefined
    }

    return selectedDocument === 'identification'
      ? mechanic.mechanicCredentials.identificationImage
      : mechanic.mechanicCredentials.certificateDocument
  }, [mechanic, selectedDocument])

  const selectedUri = resolveAssetUri(selectedAsset)
  const selectedMimeType = selectedAsset?.mimeType || ''
  const canOpen = Boolean(selectedUri && (/^(https?:|file:|data:)/i.test(selectedUri) || selectedUri.startsWith('/')))
  const canPreviewImage =
    selectedMimeType.startsWith('image/') ||
    selectedUri.startsWith('data:image/') ||
    /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(selectedUri)
  const canPreviewPdf =
    selectedMimeType.includes('pdf') ||
    selectedUri.startsWith('data:application/pdf') ||
    /\.pdf(\?.*)?$/i.test(selectedUri)

  if (isLoading) {
    return <div className="credential-page-loader">Loading credentials...</div>
  }

  return (
    <div className="credential-page">
      <header className="credential-page-header">
        <button type="button" className="back-button" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
        <h1>Mechanic Credential Viewer</h1>
      </header>

      {error && <div className="credential-page-error">{error}</div>}

      {!error && !mechanic && <div className="credential-page-error">Mechanic details are not available.</div>}

      {mechanic && (
        <main className="credential-page-main">
          <section className="credential-summary-card">
            <h2>Template Summary</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <span>Full Name</span>
                <strong>{mechanic.profile.fullName || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Email</span>
                <strong>{mechanic.profile.email || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Phone</span>
                <strong>{mechanic.profile.phone || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Password</span>
                <div className="password-line">
                  <strong className="password-value">
                    {showPassword ? mechanic.password || 'N/A' : mechanic.password ? '••••••••••' : 'N/A'}
                  </strong>
                  {mechanic.password && (
                    <button
                      type="button"
                      className="toggle-password-button"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
              <div className="summary-item">
                <span>ID Type</span>
                <strong>{normalizeIdType(mechanic.mechanicCredentials?.identificationType)}</strong>
              </div>
              <div className="summary-item">
                <span>ID Number</span>
                <strong>{mechanic.mechanicCredentials?.identificationNumber || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Experience</span>
                <strong>{mechanic.mechanicCredentials?.experienceYears || 'N/A'} years</strong>
              </div>
              <div className="summary-item">
                <span>Garage</span>
                <strong>{mechanic.mechanicCredentials?.workingGarage || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Garage Location</span>
                <strong>{mechanic.mechanicCredentials?.garageLocation || mechanic.lastKnownLocation?.label || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Transport</span>
                <strong>{mechanic.mechanicCredentials?.transportMode || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>Approval Status</span>
                <strong>{mechanic.approvalStatus === 'pending' ? 'Pending Approval' : 'Approved'}</strong>
              </div>
              <div className="summary-item">
                <span>Activity</span>
                <strong>{mechanic.activityStatus === 'active' ? 'Active' : 'Inactive'}</strong>
              </div>
              <div className="summary-item">
                <span>Joined</span>
                <strong>{formatDate(mechanic.createdAt)}</strong>
              </div>
              <div className="summary-item">
                <span>Last Seen</span>
                <strong>{formatDate(mechanic.lastSeenAt || mechanic.lastKnownLocation?.updatedAt)}</strong>
              </div>
            </div>
          </section>

          <section className="document-viewer-card">
            <h2>Document Viewer</h2>

            <div className="doc-tabs">
              <button
                type="button"
                className={`doc-tab ${selectedDocument === 'identification' ? 'active' : ''}`}
                onClick={() => setSelectedDocument('identification')}
              >
                Identification
              </button>
              <button
                type="button"
                className={`doc-tab ${selectedDocument === 'certificate' ? 'active' : ''}`}
                onClick={() => setSelectedDocument('certificate')}
              >
                Certificate
              </button>
            </div>

            <div className="doc-meta-grid">
              <div className="summary-item">
                <span>File Name</span>
                <strong>{selectedAsset?.fileName || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>MIME Type</span>
                <strong>{selectedAsset?.mimeType || 'N/A'}</strong>
              </div>
              <div className="summary-item">
                <span>File Path</span>
                <strong className="doc-uri">{selectedUri || 'N/A'}</strong>
              </div>
            </div>

            <div className="doc-actions">
              {canOpen && (
                <a href={selectedUri} target="_blank" rel="noreferrer" className="open-doc-button">
                  Open Document
                </a>
              )}
            </div>

            {selectedUri.startsWith('file://') && (
              <div className="doc-note">This legacy document path cannot be previewed from admin web. Ask the mechanic to re-upload credentials once.</div>
            )}

            <div className="doc-preview">
              {!selectedUri && <p>No document was uploaded for this field.</p>}
              {selectedUri && canPreviewImage && <img src={selectedUri} alt="Mechanic credential" className="doc-preview-image" />}
              {selectedUri && !canPreviewImage && canPreviewPdf && (
                <iframe src={selectedUri} title="Credential PDF preview" className="doc-preview-frame" />
              )}
              {selectedUri && !canPreviewImage && !canPreviewPdf && (
                <p>Preview is not available for this file type. Use Open Document to view it directly.</p>
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  )
}
