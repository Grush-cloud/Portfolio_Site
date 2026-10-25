// Decide between the 3D rack and the plain text CV (already in the HTML). Three.js only downloads in 3D mode.
const webgl = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
})()
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches

// Every screen size gets 3D; the text CV is one tap away via "View CV".
if (webgl && !calm) {
  document.body.classList.add('mode-3d')
  import('./app').then(m => m.start())
}
