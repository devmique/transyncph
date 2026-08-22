'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Building2, Pencil } from 'lucide-react'
import { Terminal } from '@/types'
import { Button } from '@/components/ui/button'
import InputField from '@/components/ui/InputField'

// Coordinates are held as strings while editing so the fields can start truly
// empty. Holding them as numbers meant the form defaulted to 0/0, which looked
// filled, satisfied `required`, and let a terminal be saved at Null Island.
type TerminalForm = {
  name: string
  location: string
  lat: string
  lng: string
  facilities: string[]
}

const empty: TerminalForm = { name: '', location: '', lat: '', lng: '', facilities: [] }

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<TerminalForm>(empty)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // null = the form is creating; an id = the form is editing that terminal
  const [editingId, setEditingId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setFormData(empty)
    setFormOpen(true)
  }

  const openEdit = (terminal: Terminal) => {
    setEditingId(terminal._id ?? null)
    setFormData({
      name: terminal.name,
      location: terminal.location,
      lat: String(terminal.lat ?? ''),
      lng: String(terminal.lng ?? ''),
      facilities: terminal.facilities ?? [],
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormData(empty)
  }

  useEffect(() => { fetchTerminals() }, [])

  const fetchTerminals = async () => {
    try {
      setError('')
      const res = await fetch('/api/terminals')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch terminals')
      setTerminals(Array.isArray(data) ? data : [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to fetch terminals') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedName = formData.name.trim()
    const cleanedLocation = formData.location.trim()

    // Empty string parses to NaN rather than 0, so a blank field is caught here
    // instead of silently becoming a coordinate.
    const lat = Number(formData.lat)
    const lng = Number(formData.lng)

    if (!cleanedName || !cleanedLocation) return
    if (formData.lat.trim() === '' || formData.lng.trim() === '' ||
        !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Pick a location on the map, or enter valid coordinates.')
      return
    }
    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90.')
      return
    }
    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180.')
      return
    }

    try {
      setError('')
      const res = await fetch('/api/terminals', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(editingId ? { id: editingId } : {}),
          name: cleanedName,
          location: cleanedLocation,
          lat,
          lng,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save terminal')
      closeForm()
      fetchTerminals()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save terminal') }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      setError('')
      const res = await fetch(`/api/terminals?id=${deletingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete terminal')
      fetchTerminals()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete terminal') }
    finally { setDeletingId(null) }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-1">Terminals</h1>
          <p className="text-sm font-light text-slate-500">Manage your bus terminals and pickup points</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold h-9 px-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Terminal
        </Button>
      </div>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {formOpen && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/8 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-100 mb-5">{editingId ? 'Edit Terminal' : 'Create New Terminal'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Terminal Name"
                name="name"
                placeholder="e.g., Manila Central Terminal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <InputField
                label="Location"
                name="location"
                placeholder="e.g., Quezon City, Metro Manila"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Latitude"
                name="lat"
                type="number"
                placeholder="e.g., 14.5951"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                required
              />
              <InputField
                label="Longitude"
                name="lng"
                type="number"
                placeholder="e.g., 121.0273"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-9 px-4 cursor-pointer">
                {editingId ? 'Update Terminal' : 'Save Terminal'}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}
                className="h-9 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium cursor-pointer">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-900/40 border border-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : terminals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 border border-white/5 rounded-xl">
          <Building2 className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">No terminals yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {terminals.map((terminal) => (
            <div key={terminal._id} className="group bg-slate-900/60 backdrop-blur-sm border border-white/8 rounded-xl px-5 py-4 hover:border-white/12 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100 mb-0.5">{terminal.name}</p>
                  <p className="text-xs text-slate-500 mb-1">{terminal.location}</p>
                  {terminal.lat && terminal.lng && (
                    <p className="text-xs font-mono text-slate-600">
                      {terminal.lat.toFixed(4)}, {terminal.lng.toFixed(4)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" onClick={() => openEdit(terminal)} aria-label={`Edit ${terminal.name}`}
                    className="w-8 h-8 p-0 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/10 cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => terminal._id && setDeletingId(terminal._id)} aria-label={`Delete ${terminal.name}`}
                    className="w-8 h-8 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 text-center mb-2">Delete Terminal</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              Are you sure you want to delete{' '}
              <span className="text-slate-200 font-medium">
                {terminals.find(t => t._id === deletingId)?.name ?? 'this terminal'}
              </span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDeletingId(null)}
                className="flex-1 h-9 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium cursor-pointer">
                Cancel
              </Button>
              <Button onClick={confirmDelete}
                className="flex-1 h-9 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold cursor-pointer">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}