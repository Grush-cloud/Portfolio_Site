import { defineConfig } from 'vite'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderCV, esc } from './src/render.ts'
import { md } from './src/md.ts'

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const SITE = 'https://grushtech.com'

// posts/YYYY-MM-DD-slug.md: first line "# Title", the rest is the body. Newest first.
const posts = () =>
  readdirSync(root('./posts'))
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse()
    .map(f => {
      const [first, ...rest] = readFileSync(root(`./posts/${f}`), 'utf8').split(/\r?\n/)
      const body = rest.join('\n')
      // first plain paragraph (not a heading, list, image or code) becomes the excerpt
      const excerpt = body.split(/\n\s*\n/).map(p => p.trim()).find(p => p && !/^[#\-*!\[`]/.test(p)) ?? ''
      return { slug: f.slice(11, -3), date: f.slice(0, 10), title: first.replace(/^#\s+/, ''), excerpt: excerpt.replace(/[*`]/g, ''), html: md(body, 0) }
    })
type Post = ReturnType<typeof posts>[number]

const postList = () =>
  `<ul class="post-list">${posts()
    .map(p => `<li><a href="/blog/${p.slug}/"><time datetime="${p.date}">${p.date}</time><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p></a></li>`)
    .join('')}</ul>`

const postPage = (template: string, p: Post) =>
  template
    .replaceAll('<!--TITLE-->', esc(p.title))
    .replaceAll('<!--DESC-->', esc(p.excerpt))
    .replace('<!--POST-->', `<article class="post"><time datetime="${p.date}">${p.date}</time><h1>${esc(p.title)}</h1>${p.html}</article>`)

const slugFromUrl = (url = '') => /^\/blog\/([\w-]+)\/?$/.exec(url.split('?')[0])?.[1]

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700, // three.js chunk; it only loads in 3D mode
    rollupOptions: {
      input: { main: root('./index.html'), blog: root('./blog/index.html'), post: root('./blog/post.html'), notfound: root('./404.html') },
    },
  },
  plugins: [
    {
      // Bake the CV and posts into the HTML so they're crawlable and work without JS.
      name: 'static-content',
      enforce: 'post',
      transformIndexHtml: html => html.replace('<!--CV-->', renderCV()).replace('<!--POSTS-->', postList()),
      // dev: serve /blog/<slug>/ from the post template
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const p = posts().find(x => x.slug === slugFromUrl(req.url))
          if (!p) return next()
          const html = await server.transformIndexHtml(req.url!, postPage(readFileSync(root('./blog/post.html'), 'utf8'), p))
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
        })
      },
      // build: write one /blog/<slug>/index.html per post from the built template, then drop the template
      generateBundle(_, bundle) {
        const tpl = bundle['blog/post.html']
        if (tpl?.type !== 'asset') return
        for (const p of posts()) this.emitFile({ type: 'asset', fileName: `blog/${p.slug}/index.html`, source: postPage(String(tpl.source), p) })
        delete bundle['blog/post.html']
        const urls = ['/', '/blog/', ...posts().map(p => `/blog/${p.slug}/`)]
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
        })
      },
    },
  ],
})
