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

// Shorter side under 600px = a phone in either orientation; tablets and up get 3D.
// ponytail: decided once at load; resizing afterwards keeps whichever mode was picked.
if (webgl && !calm && Math.min(innerWidth, innerHeight) >= 600) {
  document.body.classList.add('mode-3d')
  import('./app').then(m => m.start())
}
