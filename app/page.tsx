'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin, Clock, TrendingUp, Users, Zap, CheckCircle2, Bus, Menu, X,
  ArrowRight,
} from 'lucide-react'
import DemoModal from '@/components/demo-modal'
import HeroVideoCard from '@/components/HeroVideoCard'

/* Pricing tiers. Single source of truth for the pricing section.
   ponytail: hardcoded here rather than fetched, move to the API if plans
   ever become editable from the dashboard. */
const PLANS = [
  {
    name: 'Starter',
    price: '₱0',
    period: '/month',
    description: 'For small operators getting set up',
    features: ['Up to 10 vehicles', 'Route and terminal management', '5 team members', 'Email support'],
    href: '/register',
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₱0',
    period: '/month',
    description: 'For growing bus companies',
    features: ['Up to 50 vehicles', 'Analytics dashboard', '25 team members', 'Priority support', 'API access'],
    href: '/register',
    cta: 'Get started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large fleet operations',
    features: ['Unlimited vehicles', 'Custom features', 'Dedicated support', 'SLA guarantee', 'On-premise option'],
    href: '/register',
    cta: 'Talk to us',
    highlighted: false,
  },
]

const FEATURES = [
  { icon: MapPin, title: 'Route management', description: 'Create and edit routes on an interactive map, with every stop and terminal tied to the fleet that serves it.' },
  { icon: Clock, title: 'Scheduling', description: 'Build departure and arrival times per vehicle, and see which schedules are live right now.' },
  { icon: Users, title: 'Driver assignments', description: 'Track which driver and vehicle is on which trip.' },
  { icon: TrendingUp, title: 'Operations analytics', description: 'Active schedule rate and fleet utilization, computed from live data.' },
  { icon: Zap, title: 'Announcements', description: 'Push delays and service changes to commuters instantly.' },
]

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <main className="min-h-[100dvh] text-slate-100">

      {/* ── NAVIGATION ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              Tran<span className="text-blue-500">Sync</span> PH
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/map" className="text-sm text-slate-400 hover:text-white transition">
              Route Finder
            </Link>
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition">
              Log in
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition"
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="/register"
              className="h-8 px-3 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Get started
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="cursor-pointer w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="relative w-5 h-5">
                <Menu
                  className={`w-5 h-5 absolute inset-0 transition-all duration-200 ${
                    mobileMenuOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                  }`}
                />
                <X
                  className={`w-5 h-5 absolute inset-0 transition-all duration-200 ${
                    mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          className={`md:hidden absolute top-full left-0 right-0 overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-white/5 bg-slate-950/95 backdrop-blur-md px-4 py-4 flex flex-col gap-1">
            <Link
              href="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-slate-400 hover:text-white transition-all duration-200 py-2.5 px-2 rounded-lg hover:bg-white/5"
            >
              Route Finder
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-slate-400 hover:text-white transition-all duration-200 py-2.5 px-2 rounded-lg hover:bg-white/5"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── asymmetric split, real product footage on the right ── */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">

            <div className="lg:col-span-6">
              <span className="inline-block text-blue-400 text-xs font-mono font-medium tracking-widest uppercase bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded mb-6">
                Operator Dashboard
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight text-slate-100 mb-6">
                Run your bus network from{' '}
                <span className="text-blue-500">one dashboard.</span>
              </h1>
              <p className="text-base sm:text-lg font-light text-slate-400 leading-relaxed mb-8 max-w-md">
                Manage routes, schedules, and terminals for your fleet, and give commuters a live map of every trip.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="h-11 px-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/map"
                  className="h-11 px-6 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium rounded-lg transition"
                >
                  <MapPin className="w-4 h-4" />
                  See the live map
                </Link>
              </div>
            </div>

            {/* Real walkthrough footage, seeked to #t=30 so the frame shows the
                CRM rather than the landing page. preload="metadata" fetches only
                the file header, not the 31MB body, so it costs nothing on LCP. */}
            <div className="lg:col-span-6">
              <HeroVideoCard onOpen={() => setDemoOpen(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── bento with rhythm, 5 items in 5 cells ── */}
      <section className="border-t border-white/5 py-16 sm:py-24 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12 sm:mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 mb-4">
              Built for operators, used by commuters
            </h2>
            <p className="text-slate-400 font-light text-sm sm:text-base max-w-[60ch]">
              Everything needed to run a transport network, and a public map so passengers can actually find you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 sm:gap-5">

            {/* Lead cell, tinted */}
            <article className="reveal md:col-span-4 rounded-xl border border-blue-600/20 p-6 sm:p-8 bg-gradient-to-br from-blue-600/15 via-blue-600/5 to-transparent">
              <div className="w-10 h-10 bg-blue-600/15 border border-blue-600/25 rounded-lg flex items-center justify-center mb-5">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">{FEATURES[0].title}</h3>
              <p className="text-sm font-light text-slate-400 leading-relaxed max-w-md">{FEATURES[0].description}</p>
            </article>

            <article className="reveal md:col-span-2 rounded-xl border border-white/8 bg-slate-900/60 p-6 sm:p-7">
              <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-5">
                <Clock className="w-5 h-5 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">{FEATURES[1].title}</h3>
              <p className="text-sm font-light text-slate-500 leading-relaxed">{FEATURES[1].description}</p>
            </article>

            {FEATURES.slice(2).map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="reveal md:col-span-2 rounded-xl border border-white/8 bg-slate-900/60 p-6 sm:p-7"
              >
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
                <p className="text-sm font-light text-slate-500 leading-relaxed">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="border-t border-white/5 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12 sm:mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 mb-4">
              Pricing
            </h2>
            <p className="text-slate-400 font-light text-sm sm:text-base">
              Pick the plan that matches your fleet size.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`reveal relative flex flex-col rounded-xl p-7 sm:p-8 border transition ${
                  plan.highlighted
                    ? 'bg-blue-600/10 border-blue-600/50'
                    : 'bg-slate-900/60 border-white/8'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-100 mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-100 tracking-tight">{plan.price}</span>
                  <span className="text-sm text-slate-500 ml-1.5">{plan.period}</span>
                </div>
                <Link
                  href={plan.href}
                  className={`h-10 flex items-center justify-center text-sm font-semibold rounded-lg transition mb-7 ${
                    plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-3 mt-auto">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.highlighted ? 'text-blue-400' : 'text-slate-600'}`} />
                      <span className="text-sm text-slate-400 font-light">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="border-t border-white/5 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center reveal">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 mb-4">
            Ready to move your operation over?
          </h2>
          <p className="text-slate-400 font-light mb-8 text-base sm:text-lg">
            Join transport operators across the Philippines who run their network on TranSync PH.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 h-12 px-8 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition"
          >
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 bg-slate-950/80 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Bus className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-400">
              Tran<span className="text-blue-500">Sync</span> PH
            </span>
          </div>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} TranSync PH. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-600">
            <Link href="/map" className="hover:text-slate-400 transition">Route Finder</Link>
            <Link href="/login" className="hover:text-slate-400 transition">Operator log in</Link>
          </div>
        </div>
      </footer>

      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </main>
  )
}
