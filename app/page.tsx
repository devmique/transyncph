'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin, Clock, TrendingUp, Users, Zap, CheckCircle2, Bus, Menu, X,
  ArrowRight,
} from 'lucide-react'
import DemoModal from '@/components/demo-modal'
import HeroVideoCard from '@/components/HeroVideoCard'
import NetworkMapVisual from '@/components/landing/NetworkMapVisual'
import { useScrollReveal } from '@/hooks/useScrollReveal'

/* Pricing tiers. Single source of truth for the pricing section.
   ponytail: hardcoded here rather than fetched, move to the API if plans
   ever become editable from the dashboard.

   Seat counts are deliberately absent. TranSync PH has one login per company
   and no team members, so advertising "5 / 25 team members" sold something
   that does not exist. Every line below is a capability the product has. */
const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For small operators getting set up',
    features: [
      'Up to 10 vehicles',
      'Routes, terminals, and schedules',
      'Your timetable on the public map',
      'Email support',
    ],
    href: '/register',
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 'Free',
    period: 'during beta',
    description: 'For growing bus companies',
    features: [
      'Up to 50 vehicles',
      'Operations dashboard with live charts',
      'Announcements pushed to commuters',
      'Live GPS tracking per trip',
      'Priority support',
    ],
    href: '/register',
    cta: 'Get started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large fleet operations',
    features: [
      'Unlimited vehicles',
      'Custom features',
      'Dedicated support',
      'On-premise option',
    ],
    href: '/register',
    cta: 'Talk to us',
    highlighted: false,
  },
]

const FEATURES = [
  { icon: MapPin, title: 'Route management', description: 'Create and edit routes on an interactive map, with every stop and terminal tied to the fleet that serves it.' },
  { icon: Clock, title: 'Scheduling', description: 'Set departure and arrival times per vehicle, choose which days each trip runs, and see what is live right now.' },
  { icon: Users, title: 'Driver and vehicle records', description: 'Record who is driving and which bus is out on every trip.' },
  { icon: TrendingUp, title: 'Operations dashboard', description: 'Today’s service curve, weekly coverage, and where every bus is, computed from your own timetable.' },
  { icon: Zap, title: 'Announcements', description: 'Push delays and service changes to commuters instantly.' },
]

/** Section heading with the rule that draws itself as the section arrives. */
function SectionHead({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="max-w-2xl mb-12 sm:mb-14" data-reveal>
      <div className="h-px w-16 bg-blue-500/60 mb-6 rule-line" />
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 mb-4">
        {title}
      </h2>
      <p className="text-slate-400 font-light text-sm sm:text-base max-w-[60ch]">
        {blurb}
      </p>
    </div>
  )
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  useScrollReveal()

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

      {/* ── HERO ──
          A schematic of a network rather than the live map. It is static, so it
          paints with the HTML instead of waiting on tiles, sockets, or an API. */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 lg:pt-24 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">

            <div className="lg:col-span-5" data-reveal="hero">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.05] tracking-tight text-slate-100 mb-6">
                Your whole network,{' '}
                <span className="text-blue-500">mapped.</span>
              </h1>
              <p className="text-base sm:text-lg font-light text-slate-400 leading-relaxed mb-8 max-w-md">
                Manage routes, schedules, and terminals in one place. Every trip you
                publish lands on a public map, so commuters can actually find your buses.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="cta-glow h-11 px-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition"
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

            <div className="lg:col-span-7 min-w-0" data-reveal>
              <NetworkMapVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ── WALKTHROUGH ──
          The video kept its own section rather than fighting the board for the
          hero. It gets more room here than it had squeezed beside the headline. */}
      <section className="border-t border-white/5 py-16 sm:py-24 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-4" data-reveal>
              <div className="h-px w-16 bg-blue-500/60 mb-6 rule-line" />
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 mb-4">
                See it running
              </h2>
              <p className="text-slate-400 font-light text-sm sm:text-base mb-6">
                Four minutes through the operator dashboard: building a route, publishing
                a timetable, and watching a bus move on the commuter map.
              </p>
              <button
                onClick={() => setDemoOpen(true)}
                className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition"
              >
                Watch the walkthrough
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="lg:col-span-8 min-w-0" data-reveal>
              <HeroVideoCard onOpen={() => setDemoOpen(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── bento with rhythm, 5 items in 5 cells ── */}
      <section className="border-t border-white/5 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHead
            title="Built for operators, used by commuters"
            blurb="Everything needed to run a transport network, and a public map so passengers can actually find you."
          />

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 sm:gap-5" data-reveal-stagger>

            {/* Lead cell, tinted */}
            <article
              className="feature-card feature-card-lead md:col-span-4 rounded-xl border border-blue-600/20 p-6 sm:p-8 bg-gradient-to-br from-blue-600/15 via-blue-600/5 to-transparent transition-all duration-300 ease-out hover:border-blue-600/40 hover:from-blue-600/25 hover:via-blue-600/10 hover:to-transparent hover:shadow-[0_0_30px_-5px] hover:shadow-blue-600/20"
              style={{ '--i': 0 } as React.CSSProperties}
            >
              <div className="feature-icon w-10 h-10 bg-blue-600/15 border border-blue-600/25 rounded-lg flex items-center justify-center mb-5">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">{FEATURES[0].title}</h3>
              <p className="text-sm font-light text-slate-400 leading-relaxed max-w-md">{FEATURES[0].description}</p>
            </article>

            <article
              className="feature-card md:col-span-2 rounded-xl border border-white/8 bg-slate-900/60 p-6 sm:p-7 transition-all duration-300 ease-out hover:border-white/18 hover:bg-slate-900/90 hover:shadow-[0_0_30px_-5px] hover:shadow-slate-400/10"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              <div className="feature-icon w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-5">
                <Clock className="w-5 h-5 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">{FEATURES[1].title}</h3>
              <p className="text-sm font-light text-slate-500 leading-relaxed">{FEATURES[1].description}</p>
            </article>

            {FEATURES.slice(2).map(({ icon: Icon, title, description }, i) => (
              <article
                key={title}
                className="feature-card md:col-span-2 rounded-xl border border-white/8 bg-slate-900/60 p-6 sm:p-7 transition-all duration-300 ease-out hover:border-white/18 hover:bg-slate-900/90 hover:shadow-[0_0_30px_-5px] hover:shadow-slate-400/10"
                style={{ '--i': i + 2 } as React.CSSProperties}
              >
                <div className="feature-icon w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-5">
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
      <section className="border-t border-white/5 py-16 sm:py-24 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHead
            title="Pricing"
            blurb="Pick the plan that matches your fleet size. TranSync PH is in beta, so everything below is free today."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5" data-reveal-stagger>
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                style={{ '--i': i } as React.CSSProperties}
                className={`pricing-card ${plan.highlighted ? 'pricing-card-highlight' : ''} relative flex flex-col rounded-xl p-7 sm:p-8 border ${
                  plan.highlighted
                    ? 'bg-blue-600/10 border-blue-600/50 hover:border-blue-600/70 hover:shadow-[0_0_40px_-10px] hover:shadow-blue-600/25'
                    : 'bg-slate-900/60 border-white/8 hover:border-white/15 hover:bg-slate-900/80'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Best for most fleets
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-100 mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-100 tracking-tight">{plan.price}</span>
                  {plan.period && <span className="text-sm text-slate-500 ml-1.5">{plan.period}</span>}
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
        <div className="max-w-3xl mx-auto px-4 text-center" data-reveal>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 mb-4">
            Ready to move your operation over?
          </h2>
          <p className="text-slate-400 font-light mb-8 text-base sm:text-lg">
            Set up your routes and terminals, publish your first timetable, and your
            buses appear on the commuter map the same day.
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
