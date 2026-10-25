import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { projects, experience, education } from './content'
import type { SectionId } from './render'

export type Target = {
  label: string
  section: SectionId | 'honeypot'
  index?: number
  mesh: THREE.Mesh
  mat: THREE.MeshStandardMaterial
}

type LedMode = 'solid' | 'blink' | 'activity' | 'alert'
type Led = { p: THREE.Vector3; color: THREE.Color; mode: LedMode; phase: number; rate: number; on: number }
type Packet = { path: THREE.Curve<THREE.Vector3>; len: number; t: number; speed: number; bad: boolean }

// Rack units: 1U = 0.25 world units, 22U tall.
const U = 0.25
const W = 2.3
const D = 1.6
const FRONT = D / 2
const FZ = FRONT + 0.012 // just in front of faceplates, where LEDs and ports sit
const yOf = (u: number, h = 1) => 0.1 + (u + h / 2) * U
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

const COL = { bg: 0x111820, metal: 0x2a313b, plate: 0x222932, green: 0x3dff8f, amber: 0xffb547, cyan: 0x3fd0ff, red: 0xff4d5e }

const HOME_POS = V(5.2, 4.4, 9.2)
const HOME_TARGET = V(0.5, 2.7, 0)

export function createScene(host: HTMLElement, label: HTMLElement, onPick: (t: Target) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COL.bg)
  scene.fog = new THREE.FogExp2(COL.bg, 0.022)
  // Faint studio reflections so the metal reads as metal instead of black
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.6

  const camera = new THREE.PerspectiveCamera(40, host.clientWidth / host.clientHeight, 0.1, 100)
  // Overview framing tuned for landscape; on narrow (portrait) screens pull back and centre on the rack
  const home = () => {
    const a = camera.aspect
    const t = a < 1 ? V(0, 2.9, 0) : HOME_TARGET.clone()
    return { pos: t.clone().add(HOME_POS.clone().sub(HOME_TARGET).multiplyScalar(Math.max(1, 0.95 / a))), tgt: t }
  }
  camera.position.copy(home().pos)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(home().tgt)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 2
  controls.maxDistance = 26 // room for the pulled-back portrait overview
  controls.maxPolarAngle = Math.PI * 0.52
  controls.minAzimuthAngle = -1.3
  controls.maxAzimuthAngle = 1.3
  controls.update()

  scene.add(new THREE.HemisphereLight(0xa9c4e6, 0x1a2230, 1.2))
  const key = new THREE.DirectionalLight(0xdce8ff, 2.6)
  key.position.set(3, 9, 7)
  scene.add(key)
  const fillLight = new THREE.DirectionalLight(0x9fb8d6, 0.9) // soft front-left fill so the faceplates read
  fillLight.position.set(-6, 4, 6)
  scene.add(fillLight)
  const rim = new THREE.PointLight(COL.cyan, 4, 14, 2)
  rim.position.set(-3, 4.5, -2)
  scene.add(rim)
  const glow = new THREE.PointLight(COL.green, 3, 5, 2) // spill from the LEDs onto the floor
  glow.position.set(0, 1.5, 2)
  scene.add(glow)

  // --- geometry helpers -------------------------------------------------
  const metal = new THREE.MeshStandardMaterial({ color: COL.metal, metalness: 0.75, roughness: 0.42 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0e12, metalness: 0.4, roughness: 0.75 })
  const plateMat = () => new THREE.MeshStandardMaterial({ color: COL.plate, metalness: 0.6, roughness: 0.5, emissive: COL.cyan, emissiveIntensity: 0 })
  const glowMat = (c: number, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false })

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    scene.add(m)
    return m
  }

  const leds: Led[] = []
  const ports: THREE.Matrix4[] = []
  let powerDelay = 0 // each device powers on a little after the one below it
  const led = (x: number, y: number, color: number, mode: LedMode = 'solid', z = FZ) =>
    leds.push({ p: V(x, y, z), color: new THREE.Color(color), mode, phase: Math.random() * 10, rate: 0.6 + Math.random() * 1.8, on: powerDelay })
  const port = (x: number, y: number, sx = 1, sy = 1, z = FZ) =>
    ports.push(new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(sx, sy, 1)))

  const targets: Target[] = []
  const target = (mesh: THREE.Mesh, label: string, section: Target['section'], index?: number) =>
    targets.push({ mesh, label, section, index, mat: mesh.material as THREE.MeshStandardMaterial })

  // A 1U+ device: body inside the rack plus a faceplate that can be a click target.
  const device = (u: number, h = 1) => {
    powerDelay += 0.09
    const y = yOf(u, h)
    box(W - 0.04, h * U - 0.02, D * 0.85, metal, 0, y, FRONT - D * 0.425 - 0.01)
    return { y, plate: box(W - 0.02, h * U - 0.02, 0.02, plateMat(), 0, y, FRONT) }
  }

  // --- rack --------------------------------------------------------------
  const RH = 22 * U + 0.2
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.08, RH, 0.08, metal, sx * (W / 2 + 0.06), RH / 2, sz * (FRONT - 0.04))
  box(W + 0.2, 0.08, D, metal, 0, RH, 0)
  box(W + 0.2, 0.1, D, metal, 0, 0.05, 0)
  box(W, RH, 0.04, dark, 0, RH / 2, -FRONT + 0.02)
  const blank = (u: number) => box(W - 0.02, U - 0.02, 0.02, dark, 0, yOf(u), FRONT)
  for (const u of [2, 4, 8, 18]) blank(u)

  // n hardware slots for a newest-first list: null = empty slot; the last slot becomes "+N more" when the list doesn't fit
  const fill = (len: number, n: number) =>
    Array.from({ length: n }, (_, i) => (i >= len ? null : { i, more: len > n && i === n - 1 ? len - i : 0 }))
  const hosts: THREE.Vector3[] = [] // cable endpoints, one per powered device

  // UPS (decor)
  {
    const { y } = device(0, 2)
    box(0.5, 0.18, 0.01, glowMat(COL.cyan, 0.25), -0.6, y, FZ)
    led(0.9, y + 0.1, COL.green)
  }

  // Router -> contact
  const { y: yR, plate: routerPlate } = device(3)
  for (let i = 0; i < 4; i++) port(-0.3 + i * 0.12, yR)
  port(0.9, yR)
  led(-0.95, yR + 0.04, COL.green)
  led(-0.88, yR + 0.04, COL.amber, 'activity')
  led(-0.81, yR + 0.04, COL.cyan, 'blink')
  target(routerPlate, 'Router · Contact', 'contact')

  // Raspberry Pi shelf -> education
  {
    powerDelay += 0.09
    const shelfY = yOf(5, 0)
    box(W - 0.04, 0.03, D * 0.8, metal, 0, shelfY, 0)
    fill(education.length, 3).forEach(s => {
      if (!s) return // empty spot on the shelf
      const { i, more } = s
      const x = -0.7 + i * 0.6
      const z = FRONT - 0.3
      const pi = box(0.34, 0.56, 0.5, new THREE.MeshStandardMaterial({ color: 0x3a1418, metalness: 0.2, roughness: 0.6, emissive: COL.cyan, emissiveIntensity: 0 }), x, shelfY + 0.3, z)
      box(0.3, 0.02, 0.46, glowMat(0x1f6b3a, 0.6), x, shelfY + 0.03, z) // PCB edge
      led(x - 0.08, shelfY + 0.48, COL.red, 'solid', z + 0.26)
      led(x + 0.08, shelfY + 0.48, more ? COL.amber : COL.green, more ? 'blink' : 'activity', z + 0.26)
      hosts.push(V(x + 0.17, shelfY + 0.3, FRONT - 0.05))
      target(pi, `Pi node ${i + 1} · ${more ? `+${more} more` : education[i].org}`, 'education', i)
    })
  }

  // NAS -> experience, one drive bay per role
  const { y: yNas } = device(9, 3)
  fill(experience.length, 4).forEach((s, b) => {
    const x = -0.82 + b * 0.5
    if (!s) return void box(0.46, 3 * U - 0.12, 0.03, dark, x, yNas, FRONT + 0.01) // empty sled
    const { i, more } = s
    const bay = box(0.46, 3 * U - 0.12, 0.03, plateMat(), x, yNas, FRONT + 0.01)
    box(0.3, 0.03, 0.01, dark, x, yNas - 0.2, FZ + 0.01)
    led(x + 0.15, yNas + 0.25, more ? COL.amber : COL.green, more ? 'blink' : 'activity', FZ + 0.01)
    hosts.push(V(0.98, yNas - 0.1, FZ))
    target(bay, `Drive bay ${i + 1} · ${more ? `+${more} earlier roles` : experience[i].org}`, 'experience', i)
  })
  box(0.36, 0.14, 0.01, glowMat(COL.cyan, 0.35), 0.9, yNas + 0.15, FZ + 0.01)
  led(0.9, yNas - 0.2, COL.green)

  // Proxmox servers -> projects, top down. Featured projects are racked first, the rest fill any free servers in list order.
  const featured = projects.filter(p => p.featured)
  if (featured.length > 5) console.warn(`${featured.length} projects are featured but the rack has 5 servers; extras go behind "+N more".`)
  const racked = [...featured, ...projects.filter(p => !p.featured)].slice(0, 5)
  for (let s = 0; s < 5; s++) {
    const p = racked[s]
    if (!p) {
      blank(17 - s)
      continue
    }
    const { y, plate } = device(17 - s)
    for (let d = 0; d < 4; d++) port(-0.85 + d * 0.22, y, 3.6, 2.6)
    led(0.75, y, COL.green)
    led(0.83, y, COL.amber, 'activity')
    led(0.91, y, COL.green, 'activity')
    hosts.push(V(0.98, y, FZ))
    target(plate, `Server 0${s + 1} · ${p.name}`, 'projects', projects.indexOf(p))
  }
  // Projects that didn't get a server: one "+N more" unit in the U12 slot opens the panel at the first of them
  const unracked = projects.filter(p => !racked.includes(p))
  if (unracked.length) {
    const { y, plate } = device(12)
    for (let d = 0; d < Math.min(unracked.length, 12); d++) led(-0.9 + d * 0.08, y, COL.amber, 'blink')
    hosts.push(V(0.98, y, FZ))
    target(plate, `+${unracked.length} more projects`, 'projects', projects.indexOf(unracked[0]))
  } else blank(12)

  // Core switch + patch panel -> skills
  const { y: ySw, plate: switchPlate } = device(19)
  for (let i = 0; i < 12; i++) {
    const x = -0.8 + i * 0.07
    port(x, ySw - 0.035)
    port(x, ySw + 0.035)
    led(x, ySw + 0.09, i % 3 ? COL.green : COL.amber, 'activity')
  }
  port(0.35, ySw, 1.4, 1.4)
  target(switchPlate, 'Core switch · Skills', 'skills')
  const { y: yPatch, plate: patchPlate } = device(20)
  for (let i = 0; i < 24; i++) port(-0.85 + i * 0.07, yPatch)
  target(patchPlate, 'Patch panel · Skills', 'skills')

  // Firewall -> about
  const { y: yFw, plate: fwPlate } = device(21)
  box(0.03, U * 0.6, 0.01, glowMat(COL.amber, 0.8), -1.08, yFw, FZ)
  for (let i = 0; i < 4; i++) port(-0.2 + i * 0.14, yFw)
  led(-0.95, yFw + 0.04, COL.green)
  led(-0.88, yFw + 0.04, COL.amber, 'activity')
  const alertLed = leds.length
  led(-0.81, yFw + 0.04, COL.red, 'alert')
  target(fwPlate, 'Firewall · About me', 'about')

  // VPS floating off-site -> contact
  const vpsPos = V(4.3, 4.6, 0.2)
  const vps = new THREE.Group()
  vps.position.copy(vpsPos)
  const vpsCore = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x0d1a22, emissive: COL.cyan, emissiveIntensity: 0.15, metalness: 0.3, roughness: 0.4 }))
  const vpsWire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.7, 0.7, 0.7)), new THREE.LineBasicMaterial({ color: new THREE.Color(COL.cyan).multiplyScalar(2), toneMapped: false }))
  vps.add(vpsCore, vpsWire)
  scene.add(vps)
  target(vpsCore, 'VPS (off-site) · Contact', 'contact')

  // The easter egg
  const honeypot = box(0.5, 0.34, 0.6, new THREE.MeshStandardMaterial({ color: 0x4a3a22, metalness: 0.4, roughness: 0.5, emissive: COL.cyan, emissiveIntensity: 0 }), -2.5, 0.17, 1.9)
  honeypot.rotation.y = 0.45
  powerDelay += 0.4
  led(-2.5, 0.36, COL.amber, 'blink', 1.9)
  target(honeypot, 'definitely-not-a-honeypot', 'honeypot')

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x18202a, metalness: 0.3, roughness: 0.85 }))
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)
  const grid = new THREE.GridHelper(40, 80, 0x2c3a4a, 0x1f2832)
  grid.position.y = 0.002
  scene.add(grid)

  // --- instanced LEDs and ports ------------------------------------------
  const portMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.045, 0.012), new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.9 }), ports.length)
  ports.forEach((m, i) => portMesh.setMatrixAt(i, m))
  scene.add(portMesh)

  const ledMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.02, 0.012), new THREE.MeshBasicMaterial({ toneMapped: false }), leds.length)
  const m4 = new THREE.Matrix4()
  const tmpC = new THREE.Color()
  leds.forEach((l, i) => {
    ledMesh.setMatrixAt(i, m4.makeTranslation(l.p.x, l.p.y, l.p.z + 0.004))
    ledMesh.setColorAt(i, tmpC.set(0))
  })
  scene.add(ledMesh)

  // --- cables and packet paths --------------------------------------------
  const poly = (...pts: THREE.Vector3[]) => {
    const p = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 1; i < pts.length; i++) p.add(new THREE.LineCurve3(pts[i - 1], pts[i]))
    return p
  }
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.55 })
  const cable = (path: THREE.Curve<THREE.Vector3>, mat: THREE.Material = cableMat, r = 0.012) =>
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(path, 96, r, 6), mat))

  const CX = W / 2 + 0.25 // cable tray just right of the rack
  const CZ = FRONT + 0.12
  const routerToFw = poly(V(0.9, yR, FZ), V(0.9, yR, CZ + 0.12), V(CX + 0.12, yR, CZ + 0.12), V(CX + 0.12, yFw, CZ + 0.12), V(0.9, yFw, CZ + 0.12), V(0.9, yFw, FZ))
  const fwToSw = poly(V(0.35, yFw, FZ), V(0.35, yFw, FZ + 0.07), V(0.35, ySw, FZ + 0.07), V(0.35, ySw, FZ))
  cable(routerToFw, new THREE.MeshStandardMaterial({ color: 0x5a3b10, roughness: 0.5 }))
  cable(fwToSw, new THREE.MeshStandardMaterial({ color: 0x5a3b10, roughness: 0.5 }))

  const hostPaths = hosts.map((end, k) => {
    const sx = -0.8 + k * 0.07
    const z = CZ + k * 0.012
    const p = poly(V(sx, ySw - 0.035, FZ), V(sx, ySw - 0.035, z), V(CX - k * 0.01, ySw - 0.035, z), V(CX - k * 0.01, end.y, z), V(end.x, end.y, z), end)
    cable(p)
    return p
  })

  const tunnel = new THREE.CatmullRomCurve3([vpsPos.clone(), V(3.7, 2.4, 1.5), V(CX + 0.5, yR, CZ + 0.3), V(0.9, yR, FZ)])
  cable(tunnel, new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.cyan).multiplyScalar(0.6), transparent: true, opacity: 0.35, toneMapped: false }), 0.018)

  const chain = (...cs: THREE.Curve<THREE.Vector3>[]) => {
    const p = new THREE.CurvePath<THREE.Vector3>()
    cs.forEach(c => p.add(c))
    return p
  }
  const goodPaths = hostPaths.map(h => chain(tunnel, routerToFw, fwToSw, h))
  const badPath = chain(tunnel, routerToFw)

  const MAX_PKT = 40
  const packets: Packet[] = []
  const pktMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.017, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), MAX_PKT)
  pktMesh.frustumCulled = false
  scene.add(pktMesh)
  const pktGood = new THREE.Color(COL.cyan).multiplyScalar(2)
  const pktBad = new THREE.Color(COL.red).multiplyScalar(2.5)
  for (let i = 0; i < MAX_PKT; i++) pktMesh.setColorAt(i, pktGood)

  // --- post-processing ------------------------------------------------------
  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.85, 0.5, 0.9)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  // --- interaction ------------------------------------------------------------
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const meshes = targets.map(t => t.mesh)
  let hovered: Target | null = null

  function highlight(t: Target | null) {
    if (hovered === t) return
    if (hovered) hovered.mat.emissiveIntensity = 0
    hovered = t
    if (t) t.mat.emissiveIntensity = 0.35
    renderer.domElement.style.cursor = t ? 'pointer' : ''
    label.textContent = t?.label ?? ''
    label.classList.toggle('show', !!t)
  }

  const pick = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(meshes, false)[0]
    return hit ? targets.find(t => t.mesh === hit.object)! : null
  }
  renderer.domElement.addEventListener('pointermove', e => highlight(pick(e)))
  let down = { x: 0, y: 0 }
  renderer.domElement.addEventListener('pointerdown', e => (down = { x: e.clientX, y: e.clientY }))
  renderer.domElement.addEventListener('pointerup', e => {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > (e.pointerType === 'touch' ? 14 : 6)) return // was a drag (fingers wobble more)
    const t = pick(e)
    if (t) onPick(t)
  })

  // Camera flights
  let fly: { p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3; start: number } | null = null
  const now = () => performance.now() / 1000
  let last = now()
  const flyTo = (pos: THREE.Vector3, tgt: THREE.Vector3) =>
    (fly = { p0: camera.position.clone(), p1: pos, t0: controls.target.clone(), t1: tgt, start: now() })

  // Frame the device plus some rack around it inside the part of the screen the panel leaves free.
  // cover = fraction of the screen the panel takes: x for a side panel, y for a bottom sheet.
  const FRAME_W = 5
  const FRAME_H = 4.2
  const VIEW_DIR = V(0.15, 0.1, 1).normalize()
  function focus(t: Target, cover: { x: number; y: number }) {
    const p = t.mesh.getWorldPosition(new THREE.Vector3())
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) // visible height per unit of distance
    const d = Math.max(FRAME_W / (k * camera.aspect * (1 - cover.x)), FRAME_H / (k * (1 - cover.y)))
    // shift the look-at point so the device sits in the middle of the free area
    const tgt = p.clone().add(V((cover.x / 2) * k * d * camera.aspect, -(cover.y / 2) * k * d, 0))
    flyTo(tgt.clone().addScaledVector(VIEW_DIR, d), tgt)
  }
  const overview = () => {
    const h = home()
    flyTo(h.pos, h.tgt)
  }

  // --- loop -----------------------------------------------------------------
  let powerAt = Infinity
  let alertAt = -10
  let lastSpawn = 0
  const labelPos = new THREE.Vector3()

  function frame() {
    const t = now()
    const dt = Math.min(t - last, 0.05)
    last = t

    if (fly) {
      const k = Math.min(1, (t - fly.start) / 1.1)
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2
      camera.position.lerpVectors(fly.p0, fly.p1, e)
      controls.target.lerpVectors(fly.t0, fly.t1, e)
      if (k === 1) fly = null
    }
    controls.update()

    leds.forEach((l, i) => {
      let k = 0
      if (t >= powerAt + l.on) {
        if (l.mode === 'solid') k = 1
        else if (l.mode === 'blink') k = Math.sin(t * l.rate * 3 + l.phase) > 0 ? 1 : 0.06
        else if (l.mode === 'activity') k = Math.sin(t * l.rate * 9 + l.phase) * Math.sin(t * l.rate * 3.7 + l.phase * 2) > 0.05 ? 1 : 0.1
        else k = t - alertAt < 0.35 ? 1.4 : 0.06
      }
      ledMesh.setColorAt(i, tmpC.copy(l.color).multiplyScalar(k * 3 + 0.03))
    })
    ledMesh.instanceColor!.needsUpdate = true

    // Packets start once the rack has booted
    if (t > powerAt + 2.2 && t - lastSpawn > 0.22 && packets.length < MAX_PKT) {
      lastSpawn = t
      const bad = Math.random() < 0.18
      const path = bad ? badPath : goodPaths[Math.floor(Math.random() * goodPaths.length)]
      packets.push({ path, len: path.getLength(), t: 0, speed: 2.2 + Math.random() * 1.2, bad })
    }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]
      p.t += (dt * p.speed) / p.len
      if (p.t >= 1) {
        if (p.bad) alertAt = t // dropped at the firewall
        packets.splice(i, 1)
      }
    }
    for (let i = 0; i < MAX_PKT; i++) {
      const p = packets[i]
      if (p) {
        const pos = p.path.getPointAt(p.t)
        m4.makeTranslation(pos.x, pos.y, pos.z)
        pktMesh.setColorAt(i, p.bad ? pktBad : pktGood)
      } else m4.makeScale(0, 0, 0)
      pktMesh.setMatrixAt(i, m4)
    }
    pktMesh.instanceMatrix.needsUpdate = true
    pktMesh.instanceColor!.needsUpdate = true

    vps.rotation.y += dt * 0.4
    vps.position.y = vpsPos.y + Math.sin(t * 1.2) * 0.08

    if (hovered) {
      hovered.mesh.getWorldPosition(labelPos).project(camera)
      label.style.transform = `translate(${((labelPos.x + 1) / 2) * host.clientWidth}px, ${((1 - labelPos.y) / 2) * host.clientHeight}px)`
    }

    composer.render()
  }

  const resize = () => {
    const w = host.clientWidth
    const h = host.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
  }
  addEventListener('resize', resize)

  const setPaused = (p: boolean) => {
    renderer.setAnimationLoop(p ? null : frame)
    if (!p) last = now() // don't jump after a pause
  }
  setPaused(false)

  return {
    targets,
    focus,
    overview,
    highlight,
    setPaused,
    powerOn: () => (powerAt = now()),
  }
}
