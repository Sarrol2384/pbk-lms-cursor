'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Initial = {
  institution_name: string
  logo_url: string
  seal_url: string
  signature1_url: string
  signature1_name: string
  signature1_title: string
  signature2_url: string
  signature2_name: string
  signature2_title: string
}

export function CertificateSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [institutionName, setInstitutionName] = useState(initial.institution_name)
  const [logoUrl, setLogoUrl] = useState(initial.logo_url)
  const [sealUrl, setSealUrl] = useState(initial.seal_url)
  const [sig1Url, setSig1Url] = useState(initial.signature1_url)
  const [sig1Name, setSig1Name] = useState(initial.signature1_name)
  const [sig1Title, setSig1Title] = useState(initial.signature1_title)
  const [sig2Url, setSig2Url] = useState(initial.signature2_url)
  const [sig2Name, setSig2Name] = useState(initial.signature2_name)
  const [sig2Title, setSig2Title] = useState(initial.signature2_title)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function uploadFile(type: 'logo' | 'signature1' | 'signature2' | 'seal', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(type)
    setMessage(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', type)
      const res = await fetch('/api/admin/certificate-assets/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Upload failed')
      }
      const { url } = await res.json()
      if (type === 'logo') setLogoUrl(url)
      else if (type === 'seal') setSealUrl(url)
      else if (type === 'signature1') setSig1Url(url)
      else setSig2Url(url)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/certificate-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_name: institutionName.trim() || 'PBK Management and Leadership Institute',
          logo_url: logoUrl.trim() || null,
          seal_url: sealUrl.trim() || null,
          signature1_url: sig1Url.trim() || null,
          signature1_name: sig1Name.trim() || null,
          signature1_title: sig1Title.trim() || null,
          signature2_url: sig2Url.trim() || null,
          signature2_name: sig2Name.trim() || null,
          signature2_title: sig2Title.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Save failed')
      }
      setMessage({ type: 'success', text: 'Settings saved.' })
      router.refresh()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setLoading(false)
    }
  }

  const fileInput = (type: 'logo' | 'signature1' | 'signature2' | 'seal') => (
    <input
      type="file"
      accept=".png,.jpg,.jpeg"
      onChange={e => uploadFile(type, e)}
      disabled={!!uploading}
      className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:cursor-pointer"
    />
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Institution name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Institution name</label>
        <p className="text-xs text-gray-500 mb-1">Shown at the top of the certificate.</p>
        <input
          type="text"
          value={institutionName}
          onChange={e => setInstitutionName(e.target.value)}
          placeholder="PBK Management and Leadership Institute"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
        <p className="text-xs text-gray-500 mb-2">Centred below the institution name. PNG or JPG, max 2MB. Use a transparent PNG for best results.</p>
        {logoUrl && (
          <div className="mb-2 p-2 bg-gray-50 rounded border inline-block">
            <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
          </div>
        )}
        {fileInput('logo')}
        {uploading === 'logo' && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}
      </div>

      {/* Seal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Official seal</label>
        <p className="text-xs text-gray-500 mb-2">Placed in the centre between the two signatures. Use a transparent PNG, max 2MB.</p>
        {sealUrl && (
          <div className="mb-2 p-2 bg-gray-50 rounded border inline-block">
            <img src={sealUrl} alt="Seal" className="h-16 object-contain" />
          </div>
        )}
        {fileInput('seal')}
        {uploading === 'seal' && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}
      </div>

      {/* Signatures */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Signature 1</label>
          <p className="text-xs text-gray-500 mb-2">Upload image, then add name and title.</p>
          {sig1Url && (
            <div className="mb-2 p-2 bg-gray-50 rounded border inline-block">
              <img src={sig1Url} alt="Sig 1" className="h-14 object-contain" />
            </div>
          )}
          {fileInput('signature1')}
          {uploading === 'signature1' && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}
          <input type="text" value={sig1Name} onChange={e => setSig1Name(e.target.value)} placeholder="Name (e.g. Prof. Hans Kajiba Kuzanga)" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          <input type="text" value={sig1Title} onChange={e => setSig1Title(e.target.value)} placeholder="Title (e.g. Founder and President)" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Signature 2</label>
          <p className="text-xs text-gray-500 mb-2">Optional second signatory.</p>
          {sig2Url && (
            <div className="mb-2 p-2 bg-gray-50 rounded border inline-block">
              <img src={sig2Url} alt="Sig 2" className="h-14 object-contain" />
            </div>
          )}
          {fileInput('signature2')}
          {uploading === 'signature2' && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}
          <input type="text" value={sig2Name} onChange={e => setSig2Name(e.target.value)} placeholder="Name (e.g. Prof. Neave Kannemeyer)" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          <input type="text" value={sig2Title} onChange={e => setSig2Title(e.target.value)} placeholder="Title (e.g. Chancellor)" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
      </div>

      {message && <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>}
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-5 rounded-lg text-sm">
        {loading ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
