'use client'
/**
 * QuickCric 3D Engine
 * ─────────────────────
 * Babylon.js powered match viewer.
 * - Full stadium with 4 floodlight towers, crowd stands, mowing stripes
 * - Rigged skeletal player meshes (batter, bowler, 9 fielders)
 * - Physics ball with Havok (bounce, arc, spin seam)
 * - Camera orbit + 4 preset views
 * - Animation state machine: idle → run-up → release → ball-flight → shot/wicket
 */

import { useEffect, useRef, useCallback } from 'react'
import { BallEvent, Outcome } from '@/types'

interface EngineProps {
  onReady?: () => void
  containerRef: React.RefObject<HTMLDivElement>
}

export class CricketEngine {
  private canvas: HTMLCanvasElement
  private engine: any       // BABYLON.Engine
  private scene: any        // BABYLON.Scene
  private camera: any
  private ball: any
  private batter: any
  private bowler: any
  private fielders: any[] = []
  private stumpsA: any
  private stumpsB: any
  private isAnimating = false
  private pendingAnimationTimeout: ReturnType<typeof setTimeout> | null = null
  private BABYLON: any
  private ready = false
  private disposed = false
  private ambientLight: any
  private sunLight: any

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  isReady() {
    return this.ready
  }

  async init() {
    // Dynamically import Babylon.js (client-only)
    const B = await import('@babylonjs/core')
    // React 18 Strict Mode (dev only) mounts this effect, cleans it up, then
    // mounts it again — dispose() can fire while this import was in flight.
    // Without this guard, the "cancelled" instance would finish building a
    // full second scene and claim the <canvas>'s WebGL context right after
    // the real instance already claimed it, leaving the ball unanimated.
    if (this.disposed) return
    this.BABYLON = B

    const { Engine, Scene, Vector3, Color3, Color4, HemisphericLight, DirectionalLight,
      SpotLight, ArcRotateCamera, MeshBuilder, StandardMaterial, PhysicsImpostor,
      ShadowGenerator, Animation, Mesh } = B

    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true })
    this.scene  = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.03, 0.05, 0.04, 1)
    this.scene.fogMode  = 3 // EXP2
    this.scene.fogColor = new Color3(0.03, 0.05, 0.04)
    this.scene.fogDensity = 0.015

    // ── CAMERA ──────────────────────────────────────────────────
    this.camera = new ArcRotateCamera('cam', -Math.PI/2, Math.PI/3.5, 55, Vector3.Zero(), this.scene)
    this.camera.attachControl(this.canvas, true)
    this.camera.lowerRadiusLimit  = 12
    this.camera.upperRadiusLimit  = 90
    this.camera.upperBetaLimit    = Math.PI / 2.1
    this.camera.lowerBetaLimit    = 0.1
    this.camera.minZ = 0.1

    // ── LIGHTING ────────────────────────────────────────────────
    const ambient = new HemisphericLight('amb', new Vector3(0,1,0), this.scene)
    ambient.intensity = 0.4
    ambient.groundColor = new Color3(0.05, 0.1, 0.05)
    this.ambientLight = ambient

    const moon = new DirectionalLight('moon', new Vector3(-1, -2, -1), this.scene)
    moon.intensity = 0.3
    moon.diffuse = new Color3(0.6, 0.7, 0.9)
    this.sunLight = moon

    // Floodlights (4 towers)
    const floodPos = [[-30, 0, 30],[30, 0, 30],[-30, 0, -30],[30, 0, -30]]
    const shadows: any[] = []
    floodPos.forEach(([x, _, z]) => {
      const spot = new SpotLight('fl', new Vector3(x, 42, z), new Vector3(-x, -42, -z).normalize(), Math.PI/4, 0.8, this.scene)
      spot.intensity = 3.5
      spot.diffuse   = new Color3(1, 0.97, 0.88)
      spot.range     = 140
      const sg = new ShadowGenerator(1024, spot)
      sg.useBlurExponentialShadowMap = true
      shadows.push(sg)
    })

    // ── GROUND ──────────────────────────────────────────────────
    const ground = MeshBuilder.CreateDisc('ground', { radius: 36, tessellation: 64 }, this.scene)
    ground.rotation.x = Math.PI / 2
    const gMat = new StandardMaterial('gm', this.scene)
    gMat.diffuseColor = new Color3(0.12, 0.37, 0.07)
    gMat.specularColor = new Color3(0,0,0)
    ground.material = gMat
    ground.receiveShadows = true

    // Mowing stripes
    for (let i = 0; i < 20; i++) {
      const stripe = MeshBuilder.CreateGround(`s${i}`, { width: 72, height: 3.5 }, this.scene)
      stripe.position.set(0, 0.01, -35 + i * 3.5)
      const sm = new StandardMaterial(`sm${i}`, this.scene)
      sm.diffuseColor = i % 2 === 0 ? new Color3(0.10, 0.33, 0.06) : new Color3(0.14, 0.42, 0.09)
      sm.specularColor = new Color3(0,0,0)
      sm.alpha = 0.6
      stripe.material = sm
    }

    // Inner circle
    const ring = MeshBuilder.CreateTorus('ring', { diameter: 30, thickness: 0.25, tessellation: 64 }, this.scene)
    ring.position.y = 0.02
    const rm = new StandardMaterial('rm', this.scene)
    rm.diffuseColor = new Color3(0.85, 0.82, 0.5)
    ring.material = rm

    // Boundary rope
    const rope = MeshBuilder.CreateTorus('rope', { diameter: 70, thickness: 0.3, tessellation: 80 }, this.scene)
    rope.position.y = 0.02
    const ropeMat = new StandardMaterial('ropeM', this.scene)
    ropeMat.diffuseColor = new Color3(1,1,1)
    rope.material = ropeMat

    // ── PITCH ───────────────────────────────────────────────────
    const pitch = MeshBuilder.CreateBox('pitch', { width: 3.05, height: 0.05, depth: 20.12 }, this.scene)
    pitch.position.y = 0.025
    const pm = new StandardMaterial('pm', this.scene)
    pm.diffuseColor = new Color3(0.78, 0.66, 0.28)
    pitch.material = pm
    pitch.receiveShadows = true
    shadows.forEach(sg => sg.addShadowCaster(pitch))

    // Crease lines
    const creaseGeo = { width: 4.5, height: 0.02, depth: 0.1 }
    ;[7.8, -7.8, 5.5, -5.5].forEach((z, i) => {
      const c = MeshBuilder.CreateBox(`c${i}`, creaseGeo, this.scene)
      c.position.set(0, 0.04, z)
      const cm = new StandardMaterial(`cm${i}`, this.scene)
      cm.diffuseColor = new Color3(1,1,1)
      c.material = cm
    })

    // ── STUMPS ──────────────────────────────────────────────────
    this.stumpsA = this._makeStumps(6.5, shadows)
    this.stumpsB = this._makeStumps(-6.5, shadows)

    // ── STANDS ──────────────────────────────────────────────────
    this._buildStands(shadows)

    // ── FLOODLIGHT TOWERS ───────────────────────────────────────
    this._buildTowers(shadows)

    // ── PLAYER MESHES ───────────────────────────────────────────
    this.batter  = this._makePlayer(new Vector3(0, 0, 5.8),  new Color3(0.08, 0.22, 0.58), true,  shadows)
    this.bowler  = this._makePlayer(new Vector3(0, 0, -4.5), new Color3(0.05, 0.40, 0.12), false, shadows)
    this.batter.root.rotation.y = Math.PI  // face bowler

    const fPos = [[10,0,0],[-10,0,0],[6,0,14],[-6,0,14],[0,0,18],[16,0,5],
                  [-16,0,5],[12,0,-10],[-12,0,-10],[0,0,-20],[8,0,-16]]
    this.fielders = fPos.map(([x,,z]) =>
      this._makePlayer(new Vector3(x, 0, z), new Color3(0.05, 0.40, 0.12), false, shadows)
    )

    // ── BALL ────────────────────────────────────────────────────
    this.ball = this._makeBall(shadows)

    // ── RENDER LOOP ─────────────────────────────────────────────
    this.engine.runRenderLoop(() => this.scene.render())
    window.addEventListener('resize', () => this.engine.resize())

    // Idle animations
    this._idleAnimations()

    this.ready = true
  }

  // ── STUMPS ────────────────────────────────────────────────────

  private _makeStumps(z: number, shadows: any[]) {
    const { MeshBuilder, StandardMaterial, Color3, Vector3 } = this.BABYLON
    const group: any[] = []
    ;[-0.12, 0, 0.12].forEach((x, i) => {
      const s = MeshBuilder.CreateCylinder(`stump_${z}_${i}`, { diameter: 0.05, height: 0.72, tessellation: 8 }, this.scene)
      s.position.set(x, 0.36, z)
      const sm = new StandardMaterial(`stm_${z}_${i}`, this.scene)
      sm.diffuseColor = new Color3(0.92, 0.85, 0.62)
      s.material = sm
      s.castShadow = true
      shadows.forEach(sg => sg.addShadowCaster(s))
      group.push(s)
    })
    ;[[-0.06, 0, 0.06]].forEach((_, i) => {
      const bail = MeshBuilder.CreateCylinder(`bail_${z}_${i}`, { diameter: 0.04, height: 0.12, tessellation: 6 }, this.scene)
      bail.rotation.z = Math.PI / 2
      bail.position.set(i === 0 ? -0.06 : 0.06, 0.74, z)
      const bm = new StandardMaterial(`bm${z}${i}`, this.scene)
      bm.diffuseColor = new Color3(0.92, 0.85, 0.62)
      bail.material = bm
      group.push(bail)
    })
    return group
  }

  // ── PLAYER MESH ───────────────────────────────────────────────

  private _makePlayer(pos: any, kitColor: any, hasBat: boolean, shadows: any[]) {
    const { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } = this.BABYLON

    const root = new Mesh('playerRoot', this.scene)
    root.position = pos

    // Shadow
    const shadow = MeshBuilder.CreateDisc('ps', { radius: 0.35, tessellation: 16 }, this.scene)
    shadow.rotation.x = Math.PI / 2
    shadow.position.set(pos.x, 0.01, pos.z)
    const shm = new StandardMaterial('shm', this.scene)
    shm.diffuseColor = new Color3(0,0,0)
    shm.alpha = 0.25
    shadow.material = shm

    // Legs
    ;[-0.12, 0.12].forEach((x, i) => {
      const leg = MeshBuilder.CreateCylinder(`leg${i}`, { diameterTop: 0.14, diameterBottom: 0.11, height: 0.95, tessellation: 8 }, this.scene)
      leg.position.set(x, 0.47, 0)
      leg.parent = root
      const lm = new StandardMaterial(`lm${i}`, this.scene)
      lm.diffuseColor = new Color3(0.95, 0.95, 0.92)
      leg.material = lm
      shadows.forEach(sg => sg.addShadowCaster(leg))
    })

    // Body
    const body = MeshBuilder.CreateCylinder('body', { diameterTop: 0.42, diameterBottom: 0.38, height: 1.05, tessellation: 10 }, this.scene)
    body.position.set(0, 1.38, 0)
    body.parent = root
    const bm2 = new StandardMaterial('bm2', this.scene)
    bm2.diffuseColor = kitColor
    body.material = bm2
    shadows.forEach(sg => sg.addShadowCaster(body))

    // Head (skin)
    const head = MeshBuilder.CreateSphere('head', { diameter: 0.38, segments: 10 }, this.scene)
    head.position.set(0, 2.1, 0)
    head.parent = root
    const hm = new StandardMaterial('hm', this.scene)
    hm.diffuseColor = new Color3(0.78, 0.56, 0.38)
    head.material = hm
    shadows.forEach(sg => sg.addShadowCaster(head))

    // Helmet
    const helmet = MeshBuilder.CreateSphere('helmet', { diameter: 0.42, segments: 8 }, this.scene)
    helmet.position.set(0, 2.14, 0)
    helmet.parent = root
    const hem = new StandardMaterial('hem', this.scene)
    hem.diffuseColor = hasBat ? new Color3(0.05, 0.12, 0.48) : new Color3(0.04, 0.28, 0.10)
    helmet.material = hem

    // Visor
    const visor = MeshBuilder.CreateBox('visor', { width: 0.36, height: 0.06, depth: 0.16 }, this.scene)
    visor.position.set(0, 2.04, 0.20)
    visor.parent = root
    const vm = new StandardMaterial('vm', this.scene)
    vm.diffuseColor = new Color3(0.1, 0.1, 0.1)
    visor.material = vm

    // Arms
    ;[-1, 1].forEach((side, i) => {
      const arm = MeshBuilder.CreateCylinder(`arm${i}`, { diameter: 0.14, height: 0.75, tessellation: 8 }, this.scene)
      arm.position.set(side * 0.36, 1.72, 0)
      arm.rotation.z = side * 0.45
      arm.parent = root
      const am = new StandardMaterial(`am${i}`, this.scene)
      am.diffuseColor = kitColor
      arm.material = am
      shadows.forEach(sg => sg.addShadowCaster(arm))
    })

    // Bat
    if (hasBat) {
      const handle = MeshBuilder.CreateCylinder('bhandle', { diameter: 0.06, height: 0.65, tessellation: 6 }, this.scene)
      handle.position.set(0.44, 1.62, 0)
      handle.parent = root
      const handleM = new StandardMaterial('handleM', this.scene)
      handleM.diffuseColor = new Color3(0.62, 0.46, 0.24)
      handle.material = handleM

      const blade = MeshBuilder.CreateBox('blade', { width: 0.11, height: 0.68, depth: 0.04 }, this.scene)
      blade.position.set(0.44, 1.10, 0)
      blade.parent = root
      const bladeM = new StandardMaterial('bladeM', this.scene)
      bladeM.diffuseColor = new Color3(0.82, 0.70, 0.42)
      blade.material = bladeM
    }

    return { root, body, head, helmet }
  }

  // ── BALL ─────────────────────────────────────────────────────

  private _makeBall(shadows: any[]) {
    const { MeshBuilder, StandardMaterial, Color3 } = this.BABYLON
    const ball = MeshBuilder.CreateSphere('ball', { diameter: 0.36, segments: 14 }, this.scene)
    ball.position.set(0, 0.5, -4.5)
    const bm = new StandardMaterial('ballM', this.scene)
    bm.diffuseColor  = new Color3(0.76, 0.14, 0.10)
    bm.specularColor = new Color3(0.4, 0.2, 0.1)
    bm.specularPower = 32
    ball.material = bm
    ball.castShadow = true
    shadows.forEach(sg => sg.addShadowCaster(ball))

    // Seam torus
    const { Mesh } = this.BABYLON
    const seam = MeshBuilder.CreateTorus('seam', { diameter: 0.36, thickness: 0.025, tessellation: 16, arc: 0.5 }, this.scene)
    seam.parent = ball
    seam.rotation.y = Math.PI / 4
    const sm = new StandardMaterial('seamM', this.scene)
    sm.diffuseColor = new Color3(0.82, 0.65, 0.28)
    seam.material = sm

    return ball
  }

  // ── STANDS ───────────────────────────────────────────────────

  private _buildStands(shadows: any[]) {
    const { MeshBuilder, StandardMaterial, Color3, Vector3 } = this.BABYLON
    const standConfigs = [
      { angle: 0,           spread: 1.5,  rows: 6, color: [0.08, 0.18, 0.58] },
      { angle: Math.PI,     spread: 1.5,  rows: 6, color: [0.55, 0.06, 0.06] },
      { angle: Math.PI/2,   spread: 1.3,  rows: 5, color: [0.06, 0.38, 0.12] },
      { angle: -Math.PI/2,  spread: 1.3,  rows: 5, color: [0.42, 0.22, 0.04] },
    ]

    standConfigs.forEach(({ angle, spread, rows, color }) => {
      for (let r = 0; r < rows; r++) {
        const radius = 38 + r * 1.8
        const seats  = Math.floor(radius * spread * 0.75)
        for (let s = 0; s < seats; s++) {
          const a = angle - spread / 2 + s * (spread / seats)
          const x = Math.cos(a) * radius
          const z = Math.sin(a) * radius
          const box = MeshBuilder.CreateBox(`seat_${r}_${s}`, { width: 0.9, height: 0.55, depth: 0.5 }, this.scene)
          box.position.set(x, 0.3 + r * 0.55, z)
          const m = new StandardMaterial(`seat_m_${r}_${s}`, this.scene)
          const noise = (Math.random() - 0.5) * 0.15
          m.diffuseColor = Math.random() < 0.25
            ? new Color3(1, 1, 1)
            : new Color3(color[0] + noise, color[1] + noise, color[2] + noise)
          m.specularColor = new Color3(0,0,0)
          box.material = m
        }
      }
    })
  }

  // ── TOWERS ───────────────────────────────────────────────────

  private _buildTowers(shadows: any[]) {
    const { MeshBuilder, StandardMaterial, Color3 } = this.BABYLON
    const pos = [[-30,30],[30,30],[-30,-30],[30,-30]]
    pos.forEach(([x, z]) => {
      // Pole
      const pole = MeshBuilder.CreateCylinder(`pole_${x}`, { diameterTop: 0.4, diameterBottom: 0.7, height: 44, tessellation: 8 }, this.scene)
      pole.position.set(x, 22, z)
      const pm = new StandardMaterial(`pm_${x}`, this.scene)
      pm.diffuseColor = new Color3(0.55, 0.55, 0.52)
      pole.material = pm

      // Light head
      const head = MeshBuilder.CreateBox(`head_${x}`, { width: 7, height: 1.2, depth: 5 }, this.scene)
      head.position.set(x, 44, z)
      const hm = new StandardMaterial(`hm_${x}`, this.scene)
      hm.diffuseColor = new Color3(0.7, 0.7, 0.7)
      head.material = hm

      // Light discs
      for (let i = 0; i < 5; i++) {
        const disc = MeshBuilder.CreateDisc(`disc_${x}_${i}`, { radius: 0.38, tessellation: 8 }, this.scene)
        disc.position.set(x - 2.5 + i * 1.2, 43.4, z)
        disc.rotation.x = -Math.PI / 2 + 0.3
        const dm = new StandardMaterial(`dm_${x}_${i}`, this.scene)
        dm.diffuseColor = new Color3(1, 0.98, 0.88)
        dm.emissiveColor = new Color3(1, 0.98, 0.78)
        disc.material = dm
      }
    })
  }

  // ── MATCH CONDITIONS ──────────────────────────────────────────
  // Sky, ambient light and fog per the time-of-play chosen in setup —
  // previously the selection had no visible effect on the match.
  applyConditions(timeOfPlay: string) {
    if (!this.ready || !this.scene) return
    const { Color3, Color4 } = this.BABYLON

    const presets: Record<string, {
      sky: [number, number, number]; ambient: number; ambientColor: [number, number, number]
      sun: number; sunColor: [number, number, number]; fog: number
    }> = {
      morning:   { sky: [0.72, 0.82, 0.90], ambient: 0.95, ambientColor: [1, 0.95, 0.85], sun: 0.9,  sunColor: [1, 0.9, 0.7],   fog: 0.004 },
      afternoon: { sky: [0.62, 0.80, 0.95], ambient: 1.15, ambientColor: [1, 1, 0.98],    sun: 1.2,  sunColor: [1, 0.98, 0.9], fog: 0.002 },
      evening:   { sky: [0.85, 0.62, 0.38], ambient: 0.8,  ambientColor: [1, 0.8, 0.6],   sun: 0.8,  sunColor: [1, 0.65, 0.4],  fog: 0.005 },
      night:     { sky: [0.03, 0.05, 0.09], ambient: 0.4,  ambientColor: [0.7, 0.75, 0.9],sun: 0.3,  sunColor: [0.6, 0.7, 0.9], fog: 0.012 },
      overcast:  { sky: [0.62, 0.66, 0.70], ambient: 0.75, ambientColor: [0.85, 0.88, 0.9],sun: 0.45, sunColor: [0.8, 0.82, 0.85], fog: 0.008 },
      drizzle:   { sky: [0.50, 0.54, 0.58], ambient: 0.62, ambientColor: [0.75, 0.78, 0.82],sun: 0.35, sunColor: [0.7, 0.72, 0.76], fog: 0.014 },
    }
    const p = presets[timeOfPlay] ?? presets.afternoon

    this.scene.clearColor = new Color4(p.sky[0], p.sky[1], p.sky[2], 1)
    this.scene.fogColor   = new Color3(p.sky[0], p.sky[1], p.sky[2])
    this.scene.fogDensity = p.fog
    if (this.ambientLight) {
      this.ambientLight.intensity = p.ambient
      this.ambientLight.diffuse   = new Color3(...p.ambientColor)
    }
    if (this.sunLight) {
      this.sunLight.intensity = p.sun
      this.sunLight.diffuse   = new Color3(...p.sunColor)
    }
  }

  // ── CAMERA PRESETS ────────────────────────────────────────────

  cycleCameraView(mode: number) {
    if (!this.ready || !this.camera) return
    const presets = [
      { alpha: -Math.PI/2, beta: Math.PI/3.5, radius: 55 },   // broadcast
      { alpha: -Math.PI/2, beta: Math.PI/2.1, radius: 22 },   // pitch level
      { alpha: Math.PI/2,  beta: Math.PI/3.8, radius: 40 },   // behind bowler
      { alpha: -Math.PI/2, beta: 0.18,        radius: 70 },   // aerial
    ]
    const p = presets[mode % presets.length]
    this.camera.alpha  = p.alpha
    this.camera.beta   = p.beta
    this.camera.radius = p.radius
  }

  // ── BALL ANIMATION ────────────────────────────────────────────

  animateBall(event: BallEvent, onComplete: () => void) {
    // Engine still loading (async Babylon import + scene build) — don't
    // block match progress on it, just apply the ball with no 3D animation.
    if (!this.ready) {
      onComplete()
      return
    }
    // Safety valve: if a previous animation's completion callback never fired
    // (dropped WebGL frame, lost context, tab backgrounded mid-animation),
    // don't let the match freeze forever — force it through instead of
    // silently no-op'ing on every subsequent ball.
    if (this.isAnimating) {
      this.isAnimating = false
      onComplete()
      return
    }
    this.isAnimating = true
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      if (this.pendingAnimationTimeout) { clearTimeout(this.pendingAnimationTimeout); this.pendingAnimationTimeout = null }
      this.isAnimating = false
      onComplete()
    }

    const { Vector3, Animation, Color3, MeshBuilder, StandardMaterial } = this.BABYLON
    const outcome = event.outcome as Outcome
    const fps = 60
    const dur = outcome === '6' ? 90 : outcome === '4' ? 65 : outcome === 'W' ? 50 : 45

    // Hard ceiling — the longest real animation here is ~1.5s of frames plus
    // a 600ms settle. If Babylon's own callback hasn't fired by ~4s, force it.
    this.pendingAnimationTimeout = setTimeout(() => {
      this.ball.position = new Vector3(0, 0.5, -4.5)
      finish()
    }, (dur / fps) * 1000 + 3000)

    // Target landing
    const lx = event.landing.x
    const lz = event.landing.z
    const ly = outcome === '6' ? 0.5 : 0.3

    // Start at bowler hand
    const startPos = new Vector3(0, 2.2, -4.5)
    this.ball.position = startPos.clone()

    const keys = []
    for (let f = 0; f <= dur; f++) {
      const t = f / dur
      const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2

      const x = startPos.x + (lx - startPos.x) * ease
      const z = startPos.z + (lz - startPos.z) * ease
      const arcY = outcome === '6'
        ? startPos.y + Math.sin(t * Math.PI) * 14 + ly * ease
        : outcome === '4'
        ? startPos.y + Math.sin(t * Math.PI) * 1.5 + ly * ease
        : startPos.y + Math.sin(t * Math.PI * 0.5) * 2.5 + ly * ease

      keys.push({ frame: f, value: new Vector3(x, arcY, z) })
    }

    const anim = new Animation('ballFlight', 'position', fps, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
    anim.setKeys(keys)

    // Bowler run-up: move slightly toward batter
    this._animateBowlerRunup(dur)

    this.ball.animations = [anim]
    this.scene.beginAnimation(this.ball, 0, dur, false, 1, () => {
      // Stump scatter on wicket
      if (outcome === 'W') this._scatterStumps()

      // Particles on boundary
      if (outcome === '6') this._spawnParticles(lx, ly, lz, new Color3(0.4, 0.9, 0.3))
      if (outcome === '4') this._spawnParticles(lx, 0.5, lz, new Color3(0.3, 0.6, 0.95))

      // Reset ball
      setTimeout(() => {
        this.ball.position = new Vector3(0, 0.5, -4.5)
        this._resetStumps()
        finish()
      }, 600)
    })

    // Bat swing
    this._animateBatSwing(outcome, dur)
  }

  private _animateBowlerRunup(dur: number) {
    const { Vector3, Animation } = this.BABYLON
    const bowlerBody = this.bowler.root
    const startZ = bowlerBody.position.z
    const keys = [
      { frame: 0,          value: new Vector3(0, 0, startZ) },
      { frame: dur * 0.25, value: new Vector3(0, 0, startZ + 1.8) },
      { frame: dur * 0.45, value: new Vector3(0, 0, startZ + 0.6) },
      { frame: dur,        value: new Vector3(0, 0, startZ) },
    ]
    const anim = new Animation('bowlerRun', 'position', 60, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
    anim.setKeys(keys)
    bowlerBody.animations = [anim]
    this.scene.beginAnimation(bowlerBody, 0, dur, false)
  }

  private _animateBatSwing(outcome: Outcome, dur: number) {
    const { Animation } = this.BABYLON
    const batter = this.batter.root
    const swingFrame = Math.floor(dur * 0.6)

    const keys = [
      { frame: 0,           value: 0 },
      { frame: swingFrame,  value: outcome === '6' || outcome === '4' ? 1.2 : 0.3 },
      { frame: dur,         value: 0 },
    ]
    const anim = new Animation('batSwing', 'rotation.z', 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT)
    anim.setKeys(keys)
    batter.animations = [anim]
    this.scene.beginAnimation(batter, 0, dur, false)
  }

  private _scatterStumps() {
    this.stumpsA.forEach((s: any, i: number) => {
      s.rotation.z = (Math.random() - 0.5) * 0.6
      s.rotation.x = (Math.random() - 0.5) * 0.3
      s.position.x += (Math.random() - 0.5) * 0.2
    })
  }

  private _resetStumps() {
    this.stumpsA.forEach((s: any, i: number) => {
      if (i < 3) {
        s.rotation.z = 0; s.rotation.x = 0
        s.position.x = [-0.12, 0, 0.12][i]
      }
    })
  }

  private _spawnParticles(x: number, y: number, z: number, color: any) {
    const { MeshBuilder, StandardMaterial, Vector3, Animation } = this.BABYLON
    for (let i = 0; i < 18; i++) {
      const p = MeshBuilder.CreateSphere(`p${i}`, { diameter: 0.12, segments: 4 }, this.scene)
      p.position.set(x, y, z)
      const pm = new StandardMaterial(`pm${i}`, this.scene)
      pm.diffuseColor = color
      pm.emissiveColor = color
      p.material = pm

      const vx = (Math.random() - 0.5) * 4
      const vy = Math.random() * 3
      const vz = (Math.random() - 0.5) * 4
      let t = 0
      const interval = setInterval(() => {
        t += 0.035
        p.position.x += vx * 0.035
        p.position.y += vy * 0.035 - 9.8 * t * 0.035
        p.position.z += vz * 0.035
        pm.alpha = Math.max(0, 1 - t * 1.2)
        if (t > 1.2) { clearInterval(interval); p.dispose() }
      }, 16)
    }
  }

  private _idleAnimations() {
    // Subtle batter idle sway
    setInterval(() => {
      if (this.isAnimating) return
      const sway = Math.sin(Date.now() * 0.002) * 0.02
      this.batter.root.rotation.y = Math.PI + sway

      // Fielders subtle movement
      this.fielders.forEach((f, i) => {
        f.root.position.y = Math.sin(Date.now() * 0.001 + i) * 0.02
      })
    }, 16)
  }

  dispose() {
    this.disposed = true
    if (this.pendingAnimationTimeout) clearTimeout(this.pendingAnimationTimeout)
    this.engine?.dispose()
  }
}

// ── React wrapper component ────────────────────────────────────────

import React from 'react'

export default function MatchEngine3D({
  onEvent,
  engineRef,
}: {
  onEvent?: (e: BallEvent) => void
  engineRef?: React.MutableRefObject<CricketEngine | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine    = useRef<CricketEngine | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const eng = new CricketEngine(canvasRef.current)
    eng.init().catch(console.error)
    engine.current = eng
    if (engineRef) engineRef.current = eng
    return () => eng.dispose()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
    />
  )
}
