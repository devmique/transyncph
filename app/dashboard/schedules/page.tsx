'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Clock, Copy, Check } from 'lucide-react'
import { Route, Schedule } from '@/types'
import { Button } from '@/components/ui/button'
import InputField from '@/components/ui/InputField'
import { to12Hour, to24Hour } from '@/utils/format'
import { useToast } from '@/hooks/use-toast'
import { useApi } from '@/lib/useApi'

// 0 = Sunday, matching JS getDay() and the daysOfWeek stored on a schedule.
const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKENDS = [0, 6]

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((d, i) => d === [...b].sort()[i])

/** Human summary for a schedule row. A schedule saved before daysOfWeek existed
 *  has no value and runs every day, so it reads the same as an explicit Daily. */
const describeDays = (days?: number[]) => {
  if (!days?.length) return 'Daily'
  if (sameDays(days, EVERY_DAY)) return 'Daily'
  if (sameDays(days, WEEKDAYS)) return 'Weekdays'
  if (sameDays(days, WEEKENDS)) return 'Weekends'
  return [...days].sort().map((d) => DAYS[d].label).join(', ')
}

const empty: Schedule = {
  routeId: '',
  departureTime: '',
  arrivalTime: '',
  fare: 0,
  driverName: '',
  vehicleNumber: '',
  status: 'active',
  daysOfWeek: EVERY_DAY,
}

export default function SchedulesPage() {
  const { toast } = useToast()
  const { data: schedules, isLoading: loading, error: fetchError, mutate } =
    useApi<Schedule[]>('/api/schedules', [])
  const { data: routes } = useApi<Route[]>('/api/routes', [])
  // Mutation failures only - list fetch failures arrive as fetchError.
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Schedule>(empty)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const hasValidFare = Number.isFinite(formData.fare) && formData.fare > 0
    if (
      !formData.routeId ||
      !formData.departureTime.trim() ||
      !formData.arrivalTime.trim() ||
      !formData.driverName.trim() ||
      !formData.vehicleNumber.trim() ||
      !hasValidFare
    ) return

    if (!formData.daysOfWeek?.length) {
      setError('Pick at least one day this trip runs.')
      return
    }

    try {
      setError('')
      const payload = editingId ? { id: editingId, ...formData } : formData
      const res = await fetch('/api/schedules', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule')
      setFormData(empty)
      setEditingId(null)
      setFormOpen(false)
      mutate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save schedule')
    }
  }

  const handleCopyDriverLink = async (scheduleId: string | undefined) => {
    if (!scheduleId) return
    try {
      // The link carries a signed, 12-hour trip token. It is the driver's only
      // credential, so it is minted server-side per schedule rather than being
      // a guessable /driver?scheduleId=<id> URL.
      const res = await fetch('/api/schedules/trip-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create driver link')

      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}${data.path}`
      await navigator.clipboard.writeText(link)
      setCopiedId(scheduleId)
      toast({
        title: 'Driver link copied',
        description: 'Send it to your driver. It expires in 12 hours.',
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (e) {
      toast({
        title: 'Failed to copy',
        description: e instanceof Error ? e.message : 'Could not copy to clipboard.',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (s: Schedule) => {
    // A schedule saved before daysOfWeek existed has no value. Make the
    // implied "runs every day" explicit so the picker reflects reality and the
    // submit guard does not reject an untouched legacy row.
    setFormData({ ...s, daysOfWeek: s.daysOfWeek?.length ? s.daysOfWeek : EVERY_DAY })
    setEditingId(s._id || null)
    setFormOpen(true)
  }

  const toggleDay = (day: number) => {
    setFormData((prev) => {
      const current = prev.daysOfWeek ?? EVERY_DAY
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort()
      return { ...prev, daysOfWeek: next }
    })
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      setError('')
      const res = await fetch(`/api/schedules?id=${deletingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete schedule')
      mutate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete schedule')
    } finally {
      setDeletingId(null)
    }
  }

  const deletingSchedule = schedules.find(s => s._id === deletingId)
  const deletingLabel = deletingSchedule?.route
    ? `${deletingSchedule.route.routeNumber} · ${deletingSchedule.route.startPoint} → ${deletingSchedule.route.endPoint}`
    : 'this schedule'

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-1">Schedules</h1>
          <p className="text-sm font-light text-slate-500">Manage your bus schedules and assignments</p>
        </div>
        <Button
          onClick={() => { setEditingId(null); setFormData(empty); setFormOpen(!formOpen) }}
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold h-9 px-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </Button>
      </div>

      {(error || fetchError) && <p className="text-sm text-red-400 mb-4">{error || fetchError}</p>}

      {/* ── FORM ── */}
      {formOpen && (
        <div className="bg-slate-900/60 border border-white/8 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-5">
            {editingId ? 'Edit Schedule' : 'Create New Schedule'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Route dropdown */}
            <div>
              <label htmlFor="routeId" className="block text-xs font-medium tracking-wider uppercase text-slate-400 mb-1.5">
                Route
              </label>
              <select
                id="routeId"
                value={formData.routeId}
                onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                required
                className="w-full h-10 px-3.5 bg-white/5 border border-white/10 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-600 transition"
              >
                <option value="" className="bg-slate-900">Select a route</option>
                {routes.map(r => (
                  <option key={r._id} value={r._id} className="bg-slate-900">
                    {r.routeNumber} · {r.startPoint} → {r.endPoint}
                  </option>
                ))}
              </select>
            </div>

            {/* Times */}
            <div className="grid md:grid-cols-2 gap-4">
                 <InputField
                  label="Departure Time"
                  name="departureTime"
                  type="time"
                  value={to24Hour(formData.departureTime)}   // convert to 24h for the input
                  onChange={(e) => setFormData({ ...formData, departureTime: to12Hour(e.target.value) })}
                  required
                />
                <InputField
                  label="Arrival Time"
                  name="arrivalTime"
                  type="time"
                  value={to24Hour(formData.arrivalTime)}     // convert to 24h for the input
                  onChange={(e) => setFormData({ ...formData, arrivalTime: to12Hour(e.target.value) })}
                  required
                />
            </div>

            {/* Driver + Vehicle */}
            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Driver Name"
                name="driverName"
                placeholder="e.g., Juan Dela Cruz"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                required
              />
              <InputField
                label="Vehicle Number"
                name="vehicleNumber"
                placeholder="e.g., TSP-001"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                required
              />
            </div>

            {/* Fare + Status */}
            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Fare (₱)"
                name="fare"
                type="number"
                placeholder="e.g., 250"
                value={formData.fare > 0 ? String(formData.fare) : ''}
                onChange={(e) => setFormData({ ...formData, fare: parseFloat(e.target.value) })}
                required
              />
              <div>
                <label htmlFor="status" className="block text-xs font-medium tracking-wider uppercase text-slate-400 mb-1.5">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  required
                  className="w-full h-10 px-3.5 bg-white/5 border border-white/10 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-600 transition"
                >
                  <option value="active" className="bg-slate-900">Active</option>
                  <option value="inactive" className="bg-slate-900">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-xs font-medium tracking-wider uppercase text-slate-400">
                  Runs on
                </label>
                <div className="flex items-center gap-1">
                  {([
                    ['Daily', EVERY_DAY],
                    ['Weekdays', WEEKDAYS],
                    ['Weekends', WEEKENDS],
                  ] as const).map(([label, days]) => {
                    const active = sameDays(formData.daysOfWeek ?? [], [...days])
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFormData({ ...formData, daysOfWeek: [...days] })}
                        className={`h-6 px-2 rounded text-[11px] font-medium transition cursor-pointer border ${
                          active
                            ? 'bg-blue-600/15 border-blue-600/30 text-blue-400'
                            : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(({ value, label }) => {
                  const on = (formData.daysOfWeek ?? []).includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      aria-pressed={on}
                      className={`h-9 w-12 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                        on
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-100 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {!formData.daysOfWeek?.length && (
                <p className="text-xs text-amber-400 mt-2">
                  Pick at least one day this trip runs.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold h-9 px-4 cursor-pointer">
                {editingId ? 'Update Schedule' : 'Save Schedule'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}
                className="h-9 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100 text-sm font-medium cursor-pointer">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── LIST ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-900/40 border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/40 border border-white/5 rounded-xl">
          <Clock className="w-10 h-10 text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">No schedules yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule._id}
              className="group bg-slate-900/60 border border-white/8 rounded-xl px-5 py-4 hover:border-white/12 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Route name + status */}
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-lg font-bold text-blue-400 tracking-tight">
                      {schedule.route
                        ? `${schedule.route.routeNumber} · ${schedule.route.startPoint} → ${schedule.route.endPoint}`
                        : '—'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                      schedule.status === 'active'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-500'
                    }`}>
                      {schedule.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {describeDays(schedule.daysOfWeek)}
                    </span>
                  </div>
                  {/* Times + fare */}
                  <p className="text-sm text-slate-100 font-medium mb-1">
                    {schedule.departureTime}
                    <span className="text-slate-500 mx-2">→</span>
                    {schedule.arrivalTime}
                    <span className="text-slate-500 mx-2">·</span>
                    <span className="text-emerald-400 font-semibold">₱{schedule.fare}</span>
                  </p>
                  {/* Driver + vehicle */}
                  <p className="text-xs text-slate-500">
                    {schedule.driverName} · {schedule.vehicleNumber}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" onClick={() => handleCopyDriverLink(schedule._id)}
                    aria-label={`Copy driver link for ${schedule.vehicleNumber}`}
                    className="w-8 h-8 p-0 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/10 cursor-pointer">
                    {copiedId === schedule._id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => handleEdit(schedule)}
                    aria-label={`Edit schedule for ${schedule.vehicleNumber}`}
                    className="w-8 h-8 p-0 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/10 cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" onClick={() => schedule._id && setDeletingId(schedule._id)}
                    aria-label={`Delete schedule for ${schedule.vehicleNumber}`}
                    className="w-8 h-8 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 text-center mb-2">Delete Schedule</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              Are you sure you want to delete the schedule for{' '}
              <span className="text-slate-100 font-medium">{deletingLabel}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDeletingId(null)}
                className="flex-1 h-9 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100 text-sm font-medium cursor-pointer">
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