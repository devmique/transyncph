'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import EditProfileModal from '@/components/settings/EditProfileModal'
import ChangePasswordModal from '@/components/settings/ChangePasswordModal'
import DeleteAccountModal from '@/components/settings/DeleteAccountModal'
import { OperatorProfile } from '@/types'
import { useApi } from '@/lib/useApi'

type ActiveModal = 'editProfile' | 'changePassword' | 'deleteAccount' | null

export default function SettingsPage() {
  const { operator, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const { data, isLoading: loadingProfile, error: fetchError, mutate } =
    useApi<{ operator: OperatorProfile } | null>('/api/operator/profile', null)
  const profile = data?.operator ?? null
  const [modal, setModal] = useState<ActiveModal>(null)

  function showToast(message: string, type: 'success' | 'error') {
    toast({
      title: type === 'success' ? 'Success' : 'Error',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    })
  }

  useEffect(() => {
    if (fetchError) showToast('Failed to load profile', 'error')
  }, [fetchError])

  function handleProfileSaved(updated: OperatorProfile) {
    // Write straight into the SWR cache instead of refetching - the PUT already
    // returned the saved record.
    mutate({ operator: updated }, { revalidate: false })
    const stored = localStorage.getItem('operator')
    if (stored) {
      const parsed = JSON.parse(stored)
      localStorage.setItem('operator', JSON.stringify({
        ...parsed,
        name: updated.name,
        email: updated.email,
        companyName: updated.companyName,
      }))
    }
    setModal(null)
    showToast('Profile updated successfully', 'success')
  }

  function handlePasswordSaved() {
    setModal(null)
    showToast('Password changed successfully', 'success')
  }

  function handleDeleted() {
    logout()
    router.push('/login')
  }

  const sectionCls = 'bg-slate-900/60 border border-white/8 rounded-xl p-6'
  const rowLabelCls = 'text-xs font-medium tracking-wider uppercase text-slate-500 mb-1'
  const rowValueCls = 'text-sm text-slate-100'

  const profileFields: [string, string | undefined][] = [
    ['Full Name',     profile?.name],
    ['Company Name',  profile?.companyName],
    ['Email Address', profile?.email],
    ['Phone Number',  profile?.phone],
    ['City',          profile?.city],
    ['Region',        profile?.region],
  ]

  return (
    <>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 mb-1">Settings</h1>
          <p className="text-sm font-light text-slate-500">Manage your account and subscription</p>
        </div>

        <div className="space-y-4 max-w-2xl">

          {/* ── Company Information ─────────────────────────────────────── */}
          <div className={sectionCls}>
            <h2 className="text-sm font-semibold text-slate-100 mb-5">Company Information</h2>
            {loadingProfile ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-20 bg-white/5 rounded mb-2" />
                    <div className="h-4 w-36 bg-white/8 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5">
                {profileFields.map(([label, value]) => (
                  <div key={label}>
                    <p className={rowLabelCls}>{label}</p>
                    <p className={rowValueCls}>{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setModal('editProfile')}
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-slate-100 cursor-pointer"
            >
              Edit Profile
            </Button>
          </div>

          {/* ── Subscription (stub) ─────────────────────────────────────── */}
          <div className={sectionCls}>
            <h2 className="text-sm font-semibold text-slate-100 mb-5">Subscription</h2>
            <div className="space-y-4 mb-5">
              <div>
                <p className={rowLabelCls}>Current Plan</p>
                <div className="flex items-center gap-2.5 mt-1">
                  <span className={rowValueCls}>
                    {((profile?.tier ?? operator?.tier ?? 'basic') as string)
                      .charAt(0).toUpperCase() +
                      (profile?.tier ?? operator?.tier ?? 'basic').slice(1)}
                  </span>
                  <Badge variant="outline" className="font-mono text-blue-400 border-blue-500/20 bg-blue-500/10">
                    Free during beta
                  </Badge>
                </div>
              </div>
              <div>
                <p className={rowLabelCls}>Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span className={rowValueCls}>
                    {profile?.status
                      ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1)
                      : 'Active'}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              disabled
              title="Coming soon"
              className="border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
            >
              Manage Subscription
            </Button>
          </div>

          {/* ── Security ────────────────────────────────────────────────── */}
          <div className={sectionCls}>
            <h2 className="text-sm font-semibold text-slate-100 mb-4">Security</h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setModal('changePassword')}
                className="w-full justify-start border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-slate-100 cursor-pointer"
              >
                Change Password
              </Button>

              <Separator className="bg-white/5" />

              <Button
                variant="outline"
                disabled
                title="Coming soon"
                className="w-full justify-between border-white/10 bg-white/5 text-slate-500 cursor-not-allowed opacity-50"
              >
                <span>Two-Factor Authentication</span>
                <Badge variant="outline" className="font-mono text-slate-500 border-white/10 bg-white/5 text-xs">
                  Soon
                </Badge>
              </Button>
            </div>
          </div>

          {/* ── Danger Zone ─────────────────────────────────────────────── */}
          <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h2>
            <p className="text-xs text-red-500/70 font-light mb-4">
              Deleting your account is permanent and cannot be undone. All routes, schedules, and
              team members will be removed.
            </p>
            <Button
              variant="destructive"
              onClick={() => setModal('deleteAccount')}
              className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 cursor-pointer"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {modal === 'editProfile' && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setModal(null)}
          onSaved={handleProfileSaved}
        />
      )}
      {modal === 'changePassword' && (
        <ChangePasswordModal
          onClose={() => setModal(null)}
          onSaved={handlePasswordSaved}
        />
      )}
      {modal === 'deleteAccount' && (
        <DeleteAccountModal
          companyName={profile?.companyName ?? operator?.companyName ?? 'your'}
          onClose={() => setModal(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}