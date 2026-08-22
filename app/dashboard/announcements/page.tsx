'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Megaphone, Pencil } from 'lucide-react'
import { Announcement } from '@/types'
import { Button } from '@/components/ui/button'
import InputField from '@/components/ui/InputField'

const empty: Announcement = { title: '', message: '', type: 'info', affectedRoutes: [] }

const typeMeta = {
  info:    { label: 'Info',    cls: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  warning: { label: 'Warning', cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  alert:   { label: 'Alert',   cls: 'bg-red-500/10 border-red-500/20 text-red-400' },
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<Announcement>(empty)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // null = the form is creating; an id = the form is editing that announcement
  const [editingId, setEditingId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setFormData(empty)
    setFormOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingId(a._id ?? null)
    setFormData({
      title: a.title,
      message: a.message,
      type: a.type,
      affectedRoutes: a.affectedRoutes ?? [],
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormData(empty)
  }

  useEffect(() => { fetchAnnouncements() }, [])

  const fetchAnnouncements = async () => {
    try {
      setError('')
      const res = await fetch('/api/announcements')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch announcements')
      setAnnouncements(Array.isArray(data) ? data : [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to fetch announcements') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedTitle = formData.title.trim()
    const cleanedMessage = formData.message.trim()
    const cleanedRoutes = formData.affectedRoutes.map((r) => r.trim()).filter(Boolean)

    if (!cleanedTitle || !cleanedMessage || cleanedRoutes.length === 0) return

    try {
      setError('')
      const res = await fetch('/api/announcements', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(editingId ? { id: editingId } : {}),
          title: cleanedTitle,
          message: cleanedMessage,
          affectedRoutes: cleanedRoutes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save announcement')
      closeForm()
      fetchAnnouncements()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save announcement') }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      setError('')
      const res = await fetch(`/api/announcements?id=${deletingId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete announcement')
      fetchAnnouncements()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete announcement') }
    finally { setDeletingId(null) }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-1">Announcements</h1>
          <p className="text-sm font-light text-slate-500">Notify commuters about updates and delays</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold h-9 px-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </Button>
      </div>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {formOpen && (
        <div className="bg-slate-900/60 border border-white/8 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-100 mb-5">{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Title"
              name="title"
              placeholder="e.g., Route 5 Temporary Reroute"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-slate-400 mb-1.5">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={4}
                placeholder="Detailed message for commuters…"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-100 text-sm font-light placeholder:text-slate-600 focus:outline-none focus:border-blue-600 focus:bg-blue-600/5 transition resize-none"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-slate-400 mb-1.5">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Announcement['type'] })}
                  required
                  className="w-full h-10 px-3.5 bg-white/5 border border-white/10 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-600 transition"
                >
                  <option value="info" className="bg-slate-900">Information</option>
                  <option value="warning" className="bg-slate-900">Warning</option>
                  <option value="alert" className="bg-slate-900">Alert</option>
                </select>
              </div>
              <InputField
                label="Affected Routes (comma-separated)"
                name="affectedRoutes"
                placeholder="e.g., RT-001, RT-002"
                value={formData.affectedRoutes.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  affectedRoutes: e.target.value.split(',').map((r) => r.trim()),
                })}
                required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-9 px-4 cursor-pointer">
                {editingId ? 'Update Announcement' : 'Create Announcement'}
              </Button>
              <Button
                type="button"
                onClick={closeForm}
                className="h-9 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium cursor-pointer"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-900/40 border border-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 border border-white/5 rounded-xl">
          <Megaphone className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">No announcements yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const meta = typeMeta[a.type]
            return (
              <div key={a._id} className="group bg-slate-900/60 border border-white/8 rounded-xl px-5 py-4 hover:border-white/12 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-sm font-semibold text-slate-100">{a.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="text-sm text-slate-400 font-light leading-relaxed mb-2">{a.message}</p>
                    {a.affectedRoutes?.length > 0 && a.affectedRoutes[0] !== '' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-slate-600">Affected:</span>
                        {a.affectedRoutes.map((r) => (
                          <span key={r} className="text-xs font-mono bg-white/5 border border-white/8 text-slate-400 px-1.5 py-0.5 rounded">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => openEdit(a)}
                      aria-label={`Edit ${a.title}`}
                      className="w-8 h-8 p-0 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/10 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => a._id && setDeletingId(a._id)}
                      aria-label={`Delete ${a.title}`}
                      className="w-8 h-8 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 text-center mb-2">Delete Announcement</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              Are you sure you want to delete{' '}
              <span className="text-slate-200 font-medium">
                "{announcements.find(a => a._id === deletingId)?.title ?? 'this announcement'}"
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