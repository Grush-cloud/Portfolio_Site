// HTML for each CV section. Runs in the browser (3D panels) and at build time (crawlable text version).
import { profile, skills, projects, experience, education, type Entry } from './content.ts'

export type SectionId = 'about' | 'skills' | 'projects' | 'experience' | 'education' | 'contact'

export const sections: { id: SectionId; title: string }[] = [
  { id: 'about', title: 'About' },
  { id: 'skills', title: 'Skills' },
  { id: 'projects', title: 'Projects' },
  { id: 'experience', title: 'Experience' },
  { id: 'education', title: 'Education' },
  { id: 'contact', title: 'Contact' },
]

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const TODO = '<mark class="todo">TODO</mark>'
const hl = (i: number, h?: number) => (i === h ? ' class="hl"' : '')
const list = (xs: string[], cls = '') => `<ul${cls ? ` class="${cls}"` : ''}>${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`

const entries = (xs: Entry[], h?: number) =>
  xs
    .map(
      (e, i) => `<article${hl(i, h)} data-i="${i}">
  <h3>${esc(e.title)}</h3>
  <p class="meta">${esc(e.org)} · ${esc(e.when)} · ${esc(e.where)}</p>
  ${e.points.length ? list(e.points) : ''}
</article>`,
    )
    .join('')

export function renderSection(id: SectionId, h?: number): string {
  switch (id) {
    case 'about':
      return `<p class="lede">${esc(profile.about)}</p>
<h3>Certifications</h3>${list(profile.certifications, 'tags')}
<h3>Soft skills</h3>${list(profile.softSkills, 'tags')}
<h3>Off the clock</h3>${list(profile.interests, 'tags')}`
    case 'skills':
      return skills.map(g => `<h3>${esc(g.group)}</h3>${list(g.items, 'tags')}`).join('')
    case 'projects':
      return projects
        .map(
          (p, i) => `<article${hl(i, h)} data-i="${i}">
  <h3>${esc(p.name)}</h3>
  <p>${esc(p.body)}</p>
  ${list(p.tags, 'tags')}
  ${p.links?.length ? `<p class="links">${p.links.map(l => `<a href="${esc(l.href)}">${esc(l.label)} →</a>`).join('')}</p>` : ''}
</article>`,
        )
        .join('')
    case 'experience':
      return entries(experience, h)
    case 'education':
      return entries(education, h)
    case 'contact':
      return `<dl class="contact">
  <dt>Email</dt><dd><a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></dd>
  <dt>Web</dt><dd><a href="${esc(profile.site)}">${esc(profile.site.replace('https://', ''))}</a></dd>
  ${profile.links.map(l => `<dt>${esc(l.label)}</dt><dd>${l.href ? `<a href="${esc(l.href)}" rel="me">${esc(l.href.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : TODO}</dd>`).join('')}
  <dt>Based in</dt><dd>${esc(profile.location)}</dd>
</dl>`
  }
}

export const CV_PDF = 'George-Ashinze-CV.pdf'

export function renderCV(): string {
  return `<header class="cv-head">
  <p class="kicker">grushtech.com</p>
  <h1 tabindex="-1">${esc(profile.name)}</h1>
  <p class="tagline">${esc(profile.headline)}<br />${esc(profile.credentials)}</p>
  <p class="print-only contact-line">${[profile.email, profile.site, ...profile.links.map(l => l.href)].filter(Boolean).concat(profile.location).map(u => `<span>${esc(u.replace(/^(https?:\/\/)?(www\.)?/, ''))}</span>`).join(' · ')}</p>
  <p class="cv-actions"><a class="btn" href="/${CV_PDF}" download>Download CV (PDF)</a><button id="to-3d" class="btn only-3d" type="button">← Back to the 3D rack</button></p>
  <nav class="cv-nav" aria-label="Sections">${sections.map(s => `<a href="#s-${s.id}">${s.title}</a>`).join('')}<a href="/blog/">Blog</a></nav>
</header>
${sections
  .map(
    (s, i) => `<section id="s-${s.id}" aria-labelledby="h-${s.id}">
  <h2 id="h-${s.id}"><span>${String(i + 1).padStart(2, '0')}</span>${s.title}</h2>
  ${renderSection(s.id)}
</section>`,
  )
  .join('')}`
}
