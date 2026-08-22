'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, MapPin, Pencil } from 'lucide-react'
import { Route, Terminal } from '@/types'
import { Button } from '@/components/ui/button'
import InputField from '@/components/ui/InputField'

const empty: Route = {
  routeNumber: '',
  startPoint: '',
  endPoint: '',
  distance: 0,
  estimatedTime: '',
  startTerminalId: '',
  endTerminalId: '',
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<Route>(empty)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // null = the form is creating; an id = the form is editing that route
  const [editingId, setEditingId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setFormData(empty)
    setFormOpen(true)
  }

  const openEdit = (route: Route) => {
    setEditingId(route._id ?? null)
    setFormData({
      routeNumber: route.routeNumber,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      distance: route.distance,
      estimatedTime: route.estimatedTime,
      startTerminalId: route.startTerminalId,
      endTerminalId: route.endTerminalId,
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormData(empty)
  }

  useEffect(() => {
    fetchRoutes()
    fetch('/api/terminals')
      .then(r => r.json())
      .then(d => setTerminals(Array.isArray(d) ? d : []))
  }, [])

  const fetchRoutes = async () => {
    try {
      setError('')
      const res = await fetch('/api/routes')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch routes')
      setRoutes(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch routes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedRouteNumber   = formData.routeNumber.trim()
    const cleanedStartPoint    = formData.startPoint.trim()
    const cleanedEndPoint      = formData.endPoint.trim()
    const cleanedEstimatedTime = formData.estimatedTime.trim()
    const hasValidDistance     = Number.isFinite(formData.distance) && formData.distance > 0

    if (
      !cleanedRouteNumber || !cleanedStartPoint || !cleanedEndPoint ||
      !cleanedEstimatedTime || !hasValidDistance ||
      !formData.startTerminalId || !formData.endTerminalId
    ) return

    try {
      setError('')
      const res = await fetch('/api/routes', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(editingId ? { id: editingId } : {}),
          routeNumber:   cleanedRouteNumber,
          startPoint:    cleanedStartPoint,
          endPoint:      cleanedEndPoint,
          estimatedTime: cleanedEstimatedTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save route')
      closeForm()
      fetchRoutes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save route')
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      setError('')
      const res = await fetch(`/api/routes?id=${deletingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete route')
      fetchRoutes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete route')
    } finally {
      setDeletingId(null)
    }
  }

  const selectClass = "w-full h-10 px-3.5 bg-white/5 border border-white/10 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-600 transition"

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-1">Routes</h1>
          <p className="text-sm font-light text-slate-500">Manage your bus routes and stops</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold h-9 px-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Route
        </Button>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {formOpen && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/8 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-100 mb-5">{editingId ? 'Edit Route' : 'Create New Route'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Route Number"
                name="routeNumber"
                placeholder="e.g., RT-001"
                value={formData.routeNumber}
                onChange={(e) => setFormData({ ...formData, routeNumber: e.target.value })}
                required
              />
              <InputField
                label="Distance (km)"
                name="distance"
                type="number"
                placeholder="e.g., 45.5"
                value={String(formData.distance)}
                onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) })}
                required
              />
            </div>

            {/* Terminal dropdowns — drive startPoint/endPoint automatically */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-slate-400 mb-1.5">
                  Start Terminal
                </label>
                <select
                  value={formData.startTerminalId ?? ''}
                  onChange={(e) => {
                    const t = terminals.find(t => t._id === e.target.value)
                    setFormData({
                      ...formData,
                      startTerminalId: e.target.value,
                      startPoint: t?.name ?? '',
                    })
                  }}
                  required
                  className={selectClass}
                >
                  <option value="" className="bg-slate-900">Select start terminal</option>
                  {terminals.map(t => (
                    <option key={t._id} value={t._id} className="bg-slate-900">
                      {t.name} — {t.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-slate-400 mb-1.5">
                  End Terminal
                </label>
                <select
                  value={formData.endTerminalId ?? ''}
                  onChange={(e) => {
                    const t = terminals.find(t => t._id === e.target.value)
                    setFormData({
                      ...formData,
                      endTerminalId: e.target.value,
                      endPoint: t?.name ?? '',
                    })
                  }}
                  required
                  className={selectClass}
                >
                  <option value="" className="bg-slate-900">Select end terminal</option>
                  {terminals.map(t => (
                    <option key={t._id} value={t._id} className="bg-slate-900">
                      {t.name} — {t.location}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <InputField
              label="Estimated Time"
              name="estimatedTime"
              placeholder="e.g., 2 hours 30 minutes"
              value={formData.estimatedTime}
              onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
              required
            />

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-9 px-4 cursor-pointer">
                {editingId ? 'Update Route' : 'Save Route'}
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
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-900/40 border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 border border-white/5 rounded-xl">
          <MapPin className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">No routes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route._id} className="group bg-slate-900/60 backdrop-blur-sm border border-white/8 rounded-xl px-5 py-4 hover:border-white/12 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-base font-bold text-blue-400 tracking-tight">{route.routeNumber}</span>
                    <span className="text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      {route.distance} km
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-1">
                    {route.startPoint}
                    <span className="text-slate-600 mx-2">→</span>
                    {route.endPoint}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Est. {route.estimatedTime}</span>
                    {route.startTerminal && route.endTerminal && (
                      <span className="flex items-center gap-1 text-emerald-500/60">
                        <MapPin className="w-3 h-3" />
                        Map linked
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" onClick={() => openEdit(route)} aria-label={`Edit route ${route.routeNumber}`}
                    className="w-8 h-8 p-0 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/10 cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => route._id && setDeletingId(route._id)} aria-label={`Delete route ${route.routeNumber}`}
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
            <h3 className="text-base font-semibold text-slate-100 text-center mb-2">Delete Route</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              Are you sure you want to delete route{' '}
              <span className="text-slate-200 font-medium">
                {routes.find(r => r._id === deletingId)?.routeNumber ?? 'this route'}
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