import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowUp,
  ArrowUpRight,
  Play,
  Activity,
  Bell,
  Droplets,
  Leaf,
  LineChart,
  Mail,
  MapPin,
  Phone,
  Plane,
  Radio,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { AuthDialog } from '@/components/AuthDialog'
import { useAuthStore } from '@/store/authStore'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About Us' },
  { id: 'services', label: 'Services' },
  { id: 'products', label: 'Products' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'contact', label: 'Contact' },
] as const

const CONTACT_EMAIL = 'olivermazorodze1@gmail.com'
const CONTACT_PHONE = '+263 777 222 499'
const CONTACT_LOCATION = 'Harare, Zimbabwe'

type NavId = (typeof NAV)[number]['id']

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=2000&q=80'

const SIDE_VIDEO_THUMB =
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=900&q=80'

function LeafLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 3C9 6 5 11 5 17c0 6 5 11 11 11 5 0 9-4 9-9 0-8-6-13-9-16z"
        fill="#caf26b"
      />
      <path
        d="M10 22c2-5 6-8 12-9"
        stroke="#3a7d1f"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [activeNav, setActiveNav] = useState<NavId>('home')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const navigate = useNavigate()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)

  const openAuthOrDashboard = (mode: 'login' | 'signup') => {
    if (isAuthed) {
      navigate({ to: '/dashboard' })
      return
    }
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const scrollToSection = (id: NavId) => {
    setActiveNav(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Update active nav and back-to-top visibility as user scrolls
  useEffect(() => {
    const handler = () => {
      const offsets = NAV.map((n) => {
        const el = document.getElementById(n.id)
        return { id: n.id, top: el ? el.getBoundingClientRect().top : Infinity }
      })
      // Closest section whose top is at or just above the 120px mark
      const current = offsets
        .filter((o) => o.top - 120 <= 0)
        .sort((a, b) => b.top - a.top)[0]
      if (current) setActiveNav(current.id)
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      {/* =================== HERO =================== */}
      <section
        id="home"
        className="relative min-h-screen w-full overflow-hidden"
      >
        <img
          src={HERO_IMAGE}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Slightly darker gradient to help text pop */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 lg:px-14 pt-6 md:pt-8">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className="flex items-center gap-2 text-white"
            >
              <LeafLogo />
              <span className="text-2xl font-semibold tracking-tight">
                Green Savanna
              </span>
            </button>

            <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-2 py-1.5 border border-white/20">
              {NAV.map((item) => {
                const active = activeNav === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={
                      'px-4 py-2 rounded-full text-sm transition-colors ' +
                      (active
                        ? 'bg-[#caf26b] text-neutral-900 font-medium'
                        : 'text-white hover:bg-white/10')
                    }
                  >
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <button
              type="button"
              onClick={() => {
                if (isAuthed) {
                  navigate({ to: '/dashboard' })
                } else {
                  scrollToSection('contact')
                }
              }}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 pl-5 pr-1.5 py-1.5 text-sm font-medium shadow-sm hover:bg-neutral-100 transition-colors"
            >
              <span>{isAuthed ? 'Check Your Farm' : 'Contact Us'}</span>
              <span className="h-8 w-8 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => openAuthOrDashboard('login')}
              className="md:hidden inline-flex items-center gap-1 rounded-full bg-white text-neutral-900 px-4 py-1.5 text-sm font-medium"
            >
              {isAuthed ? 'My Farm' : 'Sign in'}
            </button>
          </header>

          {/* Hero body */}
          <div className="mt-24 sm:mt-32 md:mt-40 lg:mt-48 pb-24 md:pb-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-end">
              <div className="lg:col-span-8 text-white">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                  Smart Technology
                  <br />
                  Driving the Agriculture
                  <br />
                  Revolution
                </h1>
                <p className="mt-6 max-w-xl text-base md:text-lg text-white/85 leading-relaxed">
                  Use AI-powered drones, sensors, and automation to increase
                  yields and reduce environmental impact.
                </p>

                <button
                  type="button"
                  onClick={() => openAuthOrDashboard('signup')}
                  className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-6 pr-1.5 py-1.5 text-base font-medium shadow-lg hover:bg-[#bce855] transition-colors"
                >
                  <span>{isAuthed ? 'Check Your Farm' : 'Get Started'}</span>
                  <span className="h-9 w-9 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </button>
              </div>

              <div className="lg:col-span-4">
                <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 shadow-2xl max-w-sm ml-auto">
                  <div className="relative rounded-xl overflow-hidden aspect-[16/10]">
                    <img
                      src={SIDE_VIDEO_THUMB}
                      alt="Agriculture innovation"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/15" />
                    <button
                      type="button"
                      aria-label="Play video"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-md border border-white/50 inline-flex items-center justify-center">
                        <Play className="h-5 w-5 text-white fill-white" />
                      </span>
                    </button>
                  </div>
                  <div className="px-2 pt-3 pb-2 text-white">
                    <h3 className="text-base font-semibold">
                      Agriculture Innovation 2026
                    </h3>
                    <p className="text-sm text-white/80 mt-1 leading-snug">
                      Innovative eco-friendly solutions
                      <br />
                      for farming communities
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================== ABOUT =================== */}
      <section id="about" className="bg-neutral-50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#caf26b]/30 text-[#3a7d1f] px-3 py-1 text-xs font-medium">
                <Leaf className="h-3.5 w-3.5" />
                About Green Savanna
              </span>
              <h2 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                Plant health intelligence,
                <br />
                <span className="text-[#3a7d1f]">grown from the field up.</span>
              </h2>
              <p className="mt-5 text-base md:text-lg text-neutral-600 leading-relaxed">
                Green Savanna is an agritech company specializing in plant
                disease monitoring and nutrient deficiency management for
                horticultural crops. We use IoT-enabled sensing, real-time data
                collection, and analytics to give growers actionable crop health
                insights — supporting proactive, precision agriculture that
                improves yield, quality, and input efficiency.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ValueCard
                icon={Sparkles}
                title="Our Mission"
                body="Enable horticultural farmers and agribusiness stakeholders with accurate, timely, and affordable plant health intelligence that reduces crop losses and improves productivity through IoT-driven solutions."
              />
              <ValueCard
                icon={LineChart}
                title="Our Vision"
                body="Become a leading provider of smart horticultural crop health systems across farm sizes, empowering sustainable agriculture through data-driven decision-making."
              />
              <ValueCard
                icon={ShieldCheck}
                title="The Problem"
                body="Late discovery of diseases and nutrient deficiencies, high monitoring costs, generalized treatment plans, wasted inputs, and low yields hold growers back."
              />
              <ValueCard
                icon={Activity}
                title="Our Impact"
                body="We help clients reduce crop losses, optimize fertilizer and chemical use, support sustainable production, and speed up decisions with less labor-intensive scouting."
              />
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatPill value="24/7" label="Real-time monitoring" />
            <StatPill value="3" label="Tiered farmer packages" />
            <StatPill value="IoT" label="Sensors, drones, mobile" />
            <StatPill value="B2B" label="Input partner integration" />
          </div>
        </div>
      </section>

      {/* =================== SERVICES =================== */}
      <section id="services" className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#caf26b]/30 text-[#3a7d1f] px-3 py-1 text-xs font-medium">
              <Radio className="h-3.5 w-3.5" />
              Services
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Scale-appropriate
              <br />
              <span className="text-[#3a7d1f]">deployment models.</span>
            </h2>
            <p className="mt-5 text-base md:text-lg text-neutral-600 leading-relaxed">
              From permanent sensor stations to drone fly-overs and a pocket
              mobile app, our deployments fit every farm size — paired with
              recommendations tied to real input partners.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            <ServiceCard
              icon={Radio}
              tier="Large-scale"
              title="Sensor Stations"
              body="Permanent sensor stations and data readers deployed on fields for continuous real-time monitoring and alerts."
              bullets={[
                'Always-on field sensing',
                'Disease & nutrient diagnostics',
                'Dedicated dashboards',
              ]}
              featured
            />
            <ServiceCard
              icon={Plane}
              tier="Mid-scale"
              title="Drone Monitoring"
              body="Drone-assisted data capture across sizable plots that generates health outputs and timely intervention recommendations."
              bullets={[
                'Scheduled flyovers',
                'Multispectral analysis',
                'Per-block recommendations',
              ]}
            />
            <ServiceCard
              icon={Smartphone}
              tier="Small-scale"
              title="Mobile App"
              body="A mobile-first experience for grower diagnostics — capture a leaf, get a diagnosis and a treatment plan in seconds."
              bullets={[
                'One-time or subscription access',
                'Offline-friendly capture',
                'Local-language recommendations',
              ]}
            />
          </div>

          {/* Secondary services */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <ServiceCard
              icon={Users}
              tier="Institutions"
              title="Outgrower Support Platform"
              body="The same IoT platform offered to institutions training outgrowers — reducing dependence on limited field agronomist capacity."
              bullets={[
                'Automate monitoring & guidance',
                'Centralized agronomist views',
                'Outgrower cohort analytics',
              ]}
            />
            <ServiceCard
              icon={Sparkles}
              tier="B2B"
              title="Input Partner Integration"
              body="Fertilizer, chemical treatment, and implement partners are integrated into the platform — making recommendations directly actionable."
              bullets={[
                'Partner product visibility',
                'Defined product pricing',
                'Recommendation → purchase path',
              ]}
            />
          </div>
        </div>
      </section>

      {/* =================== PRODUCTS =================== */}
      <section id="products" className="bg-neutral-50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#caf26b]/30 text-[#3a7d1f] px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Our Product
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Meet <span className="text-[#3a7d1f]">FarmSight</span> — your IoT
              crop health command center.
            </h2>
            <p className="mt-5 text-base md:text-lg text-neutral-600 leading-relaxed">
              FarmSight is the Green Savanna platform you sign in to. It
              connects sensors, drones, and grower captures into a single
              dashboard with diagnostics, alerts, and recommendations tied to
              the inputs you can actually buy.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Showcase card */}
            <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-[#3a7d1f] to-[#1f4f10] text-white p-8 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#caf26b]/30 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium">
                  <Leaf className="h-3.5 w-3.5" />
                  FarmSight Platform
                </div>
                <h3 className="mt-5 text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                  Real-time monitoring,
                  <br />
                  field-relevant insight.
                </h3>
                <p className="mt-4 text-white/85 max-w-xl">
                  Monitor crop conditions, identify plant health risks early,
                  and act with confidence — across one farm or a network of
                  outgrowers.
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                  <FeatureRow icon={Bell} text="Real-time alerts & warnings" />
                  <FeatureRow
                    icon={Activity}
                    text="Crop stress diagnostics"
                  />
                  <FeatureRow
                    icon={Droplets}
                    text="Nutrient deficiency tracking"
                  />
                  <FeatureRow
                    icon={ShieldCheck}
                    text="Targeted treatment plans"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => openAuthOrDashboard('login')}
                  className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-6 pr-1.5 py-1.5 text-base font-medium shadow-lg hover:bg-[#bce855] transition-colors"
                >
                  <span>
                    {isAuthed ? 'Open FarmSight' : 'Check Your Farm'}
                  </span>
                  <span className="h-9 w-9 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>

            {/* Side stack */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <CapabilityCard
                icon={Activity}
                title="Crop Stress Diagnostics"
                body="Disease and nutrient-deficiency-focused diagnostics tuned for horticultural crops, not generic precision-ag heuristics."
              />
              <CapabilityCard
                icon={Bell}
                title="Real-time Monitoring & Alerts"
                body="Sensors, drones and mobile captures stream into one feed — the moment something looks off, you'll know."
              />
              <CapabilityCard
                icon={Sparkles}
                title="Actionable Recommendations"
                body="Every alert comes with a recommendation — what to apply, where, and which partner product to use."
              />
            </div>
          </div>
        </div>
      </section>

      {/* =================== TESTIMONIALS =================== */}
      <section id="testimonials" className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#caf26b]/30 text-[#3a7d1f] px-3 py-1 text-xs font-medium">
              <Star className="h-3.5 w-3.5" />
              Testimonials
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Trusted by growers,
              <br />
              <span className="text-[#3a7d1f]">institutions, and partners.</span>
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            <TestimonialCard
              quote="The shift from chasing problems to spotting them early was instant. Our spray inputs dropped, and quality went up."
              name="Tariro M."
              role="Large-scale tomato grower"
            />
            <TestimonialCard
              quote="Drone fly-overs replaced two days of manual scouting. We now know exactly which blocks to treat — nothing more."
              name="Daniel K."
              role="Mid-scale horticulture operation"
              featured
            />
            <TestimonialCard
              quote="My phone is now my agronomist. Capture a leaf, get a diagnosis, and the app even tells me where to buy the right product."
              name="Rumbi C."
              role="Smallholder farmer"
            />
          </div>

          {/* CTA Banner */}
          <div className="mt-16 rounded-3xl bg-neutral-900 text-white p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                Ready to see your farm clearly?
              </h3>
              <p className="mt-2 text-white/75 max-w-xl">
                Sign in to FarmSight to start monitoring crop health, catching
                stress early, and optimizing every input you apply.
              </p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <button
                type="button"
                onClick={() => openAuthOrDashboard('login')}
                className="inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-6 pr-1.5 py-1.5 text-base font-medium shadow-lg hover:bg-[#bce855] transition-colors"
              >
                <span>
                  {isAuthed ? 'Open FarmSight' : 'Check Your Farm'}
                </span>
                <span className="h-9 w-9 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =================== CONTACT =================== */}
      <ContactSection />

      {/* =================== FOOTER =================== */}
      <footer className="bg-neutral-50 border-t border-neutral-200 py-10">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-14 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-neutral-900">
            <LeafLogo className="w-6 h-6" />
            <span className="font-semibold tracking-tight">Green Savanna</span>
            <span className="text-neutral-400 text-sm ml-2">
              · Agritech / IoT-enabled Crop Health Monitoring
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            © {new Date().getFullYear()} Green Savanna. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />

      {/* Back-to-top button */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className={
          'fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-neutral-900 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] inline-flex items-center justify-center hover:bg-neutral-800 active:translate-y-px transition-all duration-200 ' +
          (showBackToTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none')
        }
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  )
}

/* -------------------- contact section -------------------- */

function ContactSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const finalSubject = subject.trim() || 'Green Savanna enquiry'
    const body =
      `Hi Green Savanna team,\n\n${message.trim()}\n\n` +
      `— ${name.trim() || 'Anonymous'}` +
      (email.trim() ? `\nReply to: ${email.trim()}` : '')
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      finalSubject,
    )}&body=${encodeURIComponent(body)}`
    window.location.href = href
  }

  return (
    <section id="contact" className="bg-neutral-50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left: details */}
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#caf26b]/30 text-[#3a7d1f] px-3 py-1 text-xs font-medium">
              <Mail className="h-3.5 w-3.5" />
              Get in touch
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Let's talk about
              <br />
              <span className="text-[#3a7d1f]">your farm.</span>
            </h2>
            <p className="mt-5 text-base md:text-lg text-neutral-600 leading-relaxed">
              Questions about FarmSight, deployment, or partnering with Green
              Savanna? Reach out and we'll get back to you.
            </p>

            <div className="mt-8 space-y-3">
              <ContactRow
                icon={Mail}
                label="Email"
                value={CONTACT_EMAIL}
                href={`mailto:${CONTACT_EMAIL}`}
              />
              <ContactRow
                icon={Phone}
                label="Phone"
                value={CONTACT_PHONE}
                href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`}
              />
              <ContactRow
                icon={MapPin}
                label="Location"
                value={CONTACT_LOCATION}
              />
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl bg-white border border-neutral-200 shadow-sm p-6 md:p-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Your name"
                  value={name}
                  onChange={setName}
                  placeholder="Tariro M."
                  required
                />
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="mt-4">
                <Field
                  label="Subject"
                  value={subject}
                  onChange={setSubject}
                  placeholder="How can we help?"
                />
              </div>
              <div className="mt-4">
                <label className="text-xs font-medium text-neutral-700">
                  Message
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Tell us a bit about your farm or what you need…"
                  className="mt-1.5 w-full rounded-2xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-[#3a7d1f] focus:outline-none px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors resize-y"
                />
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs text-neutral-500 max-w-sm">
                  Sending will open your email app addressed to{' '}
                  <span className="font-medium text-neutral-700">
                    {CONTACT_EMAIL}
                  </span>
                  .
                </p>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[#caf26b] text-neutral-900 pl-5 pr-1.5 py-1.5 text-sm font-medium shadow-sm hover:bg-[#bce855] transition-colors"
                >
                  <span>Send message</span>
                  <span className="h-8 w-8 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center">
                    <Send className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Leaf
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-neutral-200 px-4 py-3 shadow-sm hover:border-[#3a7d1f]/40 transition-colors">
      <div className="h-10 w-10 rounded-xl bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-neutral-500">{label}</div>
        <div className="text-sm font-medium text-neutral-900 truncate">
          {value}
        </div>
      </div>
    </div>
  )
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-700">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-full border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-[#3a7d1f] focus:outline-none px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors"
      />
    </div>
  )
}

/* -------------------- small building blocks -------------------- */

function ValueCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Leaf
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-sm">
      <div className="h-9 w-9 rounded-lg bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h3 className="mt-3 font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{body}</p>
    </div>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-sm">
      <div className="text-3xl font-bold tracking-tight text-[#3a7d1f]">
        {value}
      </div>
      <div className="text-sm text-neutral-600 mt-1">{label}</div>
    </div>
  )
}

function ServiceCard({
  icon: Icon,
  tier,
  title,
  body,
  bullets,
  featured = false,
}: {
  icon: typeof Leaf
  tier: string
  title: string
  body: string
  bullets: string[]
  featured?: boolean
}) {
  return (
    <div
      className={
        'rounded-2xl p-6 border shadow-sm flex flex-col ' +
        (featured
          ? 'bg-neutral-900 text-white border-neutral-900'
          : 'bg-white text-neutral-900 border-neutral-200')
      }
    >
      <div className="flex items-center justify-between">
        <div
          className={
            'h-10 w-10 rounded-xl inline-flex items-center justify-center ' +
            (featured
              ? 'bg-[#caf26b] text-neutral-900'
              : 'bg-[#caf26b]/40 text-[#3a7d1f]')
          }
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={
            'text-xs font-medium px-2.5 py-1 rounded-full ' +
            (featured
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-neutral-100 text-neutral-600')
          }
        >
          {tier}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight">{title}</h3>
      <p
        className={
          'mt-2 text-sm leading-relaxed ' +
          (featured ? 'text-white/80' : 'text-neutral-600')
        }
      >
        {body}
      </p>
      <ul
        className={
          'mt-5 space-y-2 text-sm ' +
          (featured ? 'text-white/90' : 'text-neutral-700')
        }
      >
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span
              className={
                'mt-1.5 h-1.5 w-1.5 rounded-full ' +
                (featured ? 'bg-[#caf26b]' : 'bg-[#3a7d1f]')
              }
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeatureRow({
  icon: Icon,
  text,
}: {
  icon: typeof Leaf
  text: string
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-white/90">
      <span className="h-8 w-8 rounded-lg bg-white/10 border border-white/15 inline-flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  )
}

function CapabilityCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Leaf
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-neutral-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#caf26b]/40 text-[#3a7d1f] inline-flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="font-semibold text-neutral-900">{title}</h4>
      </div>
      <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{body}</p>
    </div>
  )
}

function TestimonialCard({
  quote,
  name,
  role,
  featured = false,
}: {
  quote: string
  name: string
  role: string
  featured?: boolean
}) {
  return (
    <div
      className={
        'rounded-2xl p-6 border shadow-sm ' +
        (featured
          ? 'bg-[#caf26b] border-[#bce855] text-neutral-900'
          : 'bg-white border-neutral-200 text-neutral-900')
      }
    >
      <div className="flex items-center gap-1 text-[#3a7d1f]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="mt-4 text-base leading-relaxed">“{quote}”</p>
      <div className="mt-6">
        <div className="font-semibold">{name}</div>
        <div
          className={
            'text-sm ' +
            (featured ? 'text-neutral-800/80' : 'text-neutral-500')
          }
        >
          {role}
        </div>
      </div>
    </div>
  )
}
