// Just enough Markdown for blog posts: headings, paragraphs, lists, fenced code, `code`, **bold**, [links](url), ![images](src).
// ponytail: no tables/nesting; swap for a real parser (e.g. marked) when a post needs more.
import { esc } from './render.ts'

const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />') // before links, so [![img](src)](href) works
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')

// shift: how many levels to push headings down (1 when the page already has its own h1 above the content)
export function md(src: string, shift = 1): string {
  const out: string[] = []
  let para: string[] = []
  let list = false
  let code = false
  const endPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }
  const endList = () => {
    if (list) out.push('</ul>')
    list = false
  }
  for (const line of src.split(/\r?\n/)) {
    if (line.startsWith('```')) {
      if (code) out.push('</code></pre>')
      else (endPara(), endList(), out.push('<pre><code>'))
      code = !code
      continue
    }
    if (code) {
      out.push(esc(line) + '\n')
      continue
    }
    const h = /^(#{1,3})\s+(.*)/.exec(line)
    const li = /^[-*]\s+(.*)/.exec(line)
    if (h) {
      endPara(), endList()
      const n = Math.min(h[1].length + shift, 6)
      out.push(`<h${n}>${inline(h[2])}</h${n}>`)
    } else if (li) {
      endPara()
      if (!list) out.push('<ul>')
      list = true
      out.push(`<li>${inline(li[1])}</li>`)
    } else if (!line.trim()) {
      endPara(), endList()
    } else {
      endList()
      para.push(line)
    }
  }
  endPara(), endList()
  if (code) out.push('</code></pre>')
  return out.join('')
}
