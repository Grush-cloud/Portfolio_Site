// 3D mode: boot screen, device dock, content panel, honeypot. Only loaded when the 3D view will actually run.
import { createScene, type Target } from './scene'
import { renderSection, sections, esc } from './render'
import { profile, projects, experience, education } from './content'

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!

const BOOT = [
  'GRUSHTECH RACK BIOS',
  'POST ................................ ok',
  'RAID array .......................... 4/4 drives online',
  'VLAN 10 / 20 / 30 ................... up',
  'OPNsense ruleset .................... loaded',
  'WireGuard tunnel .................... handshake ok',
  'Snort IDS ........................... watching',
  '',
  'powering on rack_',
]

export function start() {
  const app = $('#app')
  app.hidden = false
  const panel = $('#panel')
  const panelBody = $('#panel-body')
  const label = $('#label')
  $('#who').textContent = profile.name
  $('#role').textContent = profile.headline
  $('#creds').textContent = profile.credentials
  $<HTMLAnchorElement>('#email-btn').href = `mailto:${profile.email}`

  const s = createScene($('#stage'), label, open)
  if (matchMedia('(pointer: coarse)').matches) $('.hint').textContent = 'drag to orbit · pinch to zoom · tap the hardware'
  let lastFocus: HTMLElement | null = null

  function open(t: Target) {
    if (panel.classList.contains('open') && panel.dataset.label === t.label) return
    lastFocus ??= document.activeElement as HTMLElement
    const sheet = matchMedia('(orientation: portrait)').matches // panel is a bottom sheet in portrait
    s.focus(t, sheet ? { x: 0, y: panel.offsetHeight / innerHeight } : { x: panel.offsetWidth / innerWidth, y: 0 })
    s.highlight(null)
    panel.dataset.label = t.label
    $('#panel-title').textContent = t.label
    panelBody.innerHTML = t.section === 'honeypot' ? honeypot() : renderSection(t.section, t.index)
    panel.classList.add('open')
    app.classList.add('panel-open')
    // scrollIntoView would also scroll the overflow-hidden #app sideways, so scroll the panel only
    panelBody.scrollTop = (panelBody.querySelector<HTMLElement>('.hl')?.offsetTop ?? 8) - 8
    $('#panel-close').focus()
  }

  function close() {
    if (!panel.classList.contains('open')) return
    panel.classList.remove('open')
    app.classList.remove('panel-open')
    s.overview()
    lastFocus?.focus()
    lastFocus = null
  }
  $('#panel-close').addEventListener('click', close)

  // Dock: keyboard-reachable buttons for every section, mirrored to the hardware
  const dock = $('#dock')
  const counts: Partial<Record<string, number>> = { projects: projects.length, experience: experience.length, education: education.length }
  for (const sec of sections) {
    const t = s.targets.find(x => x.section === sec.id)
    if (!t) continue // section with no entries has no hardware
    const n = counts[sec.id]
    const b = document.createElement('button')
    b.type = 'button'
    b.innerHTML = `<i class="dot dot-${sec.id}"></i><span>${esc(sec.title)}${n ? ` <span class="count">${n}</span>` : ''}</span>`
    b.addEventListener('click', () => {
      lastFocus = b
      open(t)
    })
    b.addEventListener('pointerenter', () => s.highlight(t))
    b.addEventListener('pointerleave', () => s.highlight(null))
    b.addEventListener('focus', () => s.highlight(t))
    b.addEventListener('blur', () => s.highlight(null))
    dock.append(b)
  }
  // The dock wraps to two rows on narrow screens; keep the hint just above it
  const placeHint = () => ($('.hint').style.bottom = `${dock.offsetHeight + 36}px`)
  placeHint()
  addEventListener('resize', placeHint)

  // Text version toggle
  const showText = (on: boolean) => {
    document.body.classList.toggle('show-text', on)
    s.setPaused(on)
    if (on) $('#cv h1').focus()
    else $('#to-text').focus()
  }
  $('#to-text').addEventListener('click', () => showText(true))
  $('#to-3d').addEventListener('click', () => showText(false))

  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return
    if (document.body.classList.contains('show-text')) showText(false)
    else close()
  })

  // Boot sequence, skippable with any key, click or the button
  const boot = $('#boot')
  const log = $('#boot-log')
  let line = 0
  const timer = setInterval(() => (line < BOOT.length ? (log.textContent += BOOT[line++] + '\n') : finish()), 150)
  function finish() {
    if (boot.classList.contains('done')) return
    clearInterval(timer)
    boot.classList.add('done')
    s.powerOn()
    removeEventListener('keydown', finish)
    setTimeout(() => (boot.hidden = true), 600)
  }
  $('#boot-skip').addEventListener('click', finish)
  boot.addEventListener('click', finish)
  addEventListener('keydown', finish)
}

function honeypot() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'unknown browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown OS'
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const secs = Math.round(performance.now() / 1000)
  const ts = () => new Date().toISOString().slice(11, 19)
  const rows = [
    ['WARN', 'new connection on decoy service :2222'],
    ['INFO', `src ip: [static site, nice try]`],
    ['INFO', `fingerprint: ${browser} on ${os}, ${innerWidth}×${innerHeight}, tz ${tz}`],
    ['INFO', `dwell time: ${secs}s on target before engaging`],
    ['WARN', 'technique: T1595 Active Scanning (clicked the suspicious box)'],
    ['ALRT', 'verdict: curious human. probably hiring. allowing.'],
    ['INFO', 'all of this was worked out in your browser. nothing was sent anywhere.'],
  ]
  return `<pre class="honeylog">${rows.map(([lvl, msg]) => `<span>${ts()}</span> <b class="lvl-${lvl}">${lvl}</b> ${esc(msg)}`).join('\n')}</pre>
<p>Every exposed service gets poked eventually. I deployed a real one in Azure to collect attack telemetry: see the <strong>Azure Honeypot</strong> project on Server 05.</p>`
}
