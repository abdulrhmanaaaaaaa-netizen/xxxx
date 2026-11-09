/* RemoveBG cinematic 3D H intro. Uses the supplied Three.js r128 + GSAP CDN build. */
(() => {
  'use strict';

  const state = { renderer: null, composer: null, scene: null, camera: null, raf: 0, timeline: null, resize: null, active: false, disposed: false, tick: null };
  const byId = id => document.getElementById(id);

  function fallback() {
    const intro = byId('firstVisitIntro');
    const boot = byId('introBootText');
    if (intro) intro.classList.add('intro-fallback');
    if (boot) boot.style.opacity = '1';
    window.setTimeout(() => intro?.classList.add('intro-revealed'), 8200);
  }

  function createPanel(w, h, d, materials) {
    const group = new THREE.Group();
    const addBox = (width, height, depth, material, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };

    addBox(w, h, d, materials.shell, 0, 0, 0);
    addBox(w - .09, h - .09, .09, materials.glass, 0, 0, d / 2 + .025);
    addBox(w - .25, h - .25, .045, materials.inner, 0, 0, d / 2 + .085);
    addBox(w - .39, h - .39, .025, materials.face, 0, 0, d / 2 + .12);

    const front = d / 2 + .15;
    const rail = Math.max(.045, Math.min(.075, Math.min(w, h) * .035));
    addBox(w - .03, rail, .07, materials.brass, 0, h / 2 - rail / 2, front);
    addBox(w - .03, rail, .07, materials.brass, 0, -h / 2 + rail / 2, front);
    addBox(rail, h - .03, .07, materials.brass, -w / 2 + rail / 2, 0, front);
    addBox(rail, h - .03, .07, materials.brass, w / 2 - rail / 2, 0, front);

    const innerW = w - .29, innerH = h - .29, thin = .018;
    addBox(innerW, thin, .025, materials.edge, 0, innerH / 2, front + .018);
    addBox(innerW, thin, .025, materials.edge, 0, -innerH / 2, front + .018);
    addBox(thin, innerH, .025, materials.edge, -innerW / 2, 0, front + .018);
    addBox(thin, innerH, .025, materials.edge, innerW / 2, 0, front + .018);

    const sheen = addBox(w * .62, .012, .012, materials.glint, 0, h * .29, front + .04);
    sheen.rotation.z = -.045;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
      new THREE.LineBasicMaterial({ color: 0xb77b45, transparent: true, opacity: .58 })
    );
    group.add(edges);
    return group;
  }

  function buildScene() {
    const stage = byId('intro3dStage');
    const canvas = byId('intro3dCanvas');
    if (!stage || !canvas || !window.THREE || !window.gsap) return false;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('RemoveBG 3D intro fallback:', error);
      return false;
    }

    const mobile = matchMedia('(max-width: 760px)').matches;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070604, .019);
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 180);
    camera.position.set(0, 2.2, mobile ? 25 : 23);
    camera.lookAt(0, 0, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.6));
    renderer.setClearColor(0x050302, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .98;
    renderer.outputEncoding = THREE.sRGBEncoding;

    const materials = {
      shell: new THREE.MeshStandardMaterial({ color: 0x100b07, metalness: .88, roughness: .28, emissive: 0x140a03, emissiveIntensity: .12 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x382416, metalness: .76, roughness: .2, clearcoat: 1, clearcoatRoughness: .16, reflectivity: .8 }),
      inner: new THREE.MeshPhysicalMaterial({ color: 0x1b120c, metalness: .86, roughness: .24, clearcoat: .65 }),
      face: new THREE.MeshStandardMaterial({ color: 0x744a2c, metalness: .9, roughness: .24, emissive: 0x281303, emissiveIntensity: .12 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xc08a54, metalness: .98, roughness: .2, emissive: 0x3b1b06, emissiveIntensity: .18 }),
      edge: new THREE.MeshStandardMaterial({ color: 0x332014, metalness: .9, roughness: .3 }),
      glint: new THREE.MeshBasicMaterial({ color: 0xffe4b6, transparent: true, opacity: .62 })
    };

    scene.add(new THREE.HemisphereLight(0x92704d, 0x080503, .85));
    scene.add(new THREE.AmbientLight(0x49301e, .55));
    const key = new THREE.PointLight(0xe2ad6d, 68, 52, 2);
    key.position.set(-9, 10, 10); scene.add(key);
    const rim = new THREE.PointLight(0x9c5527, 52, 48, 2);
    rim.position.set(9, -4, -10); scene.add(rim);
    const top = new THREE.PointLight(0xffdfb2, 32, 30, 2);
    top.position.set(0, 12, 3); scene.add(top);

    const letterGroup = new THREE.Group();
    scene.add(letterGroup);
    const pieces = [
      { w: 1.72, h: 2.12, x: -2.18, y: 2.12, z: 0 },
      { w: 1.72, h: 2.12, x: -2.18, y: 0, z: 0 },
      { w: 1.72, h: 2.12, x: -2.18, y: -2.12, z: 0 },
      { w: 1.72, h: 2.12, x: 2.18, y: 2.12, z: 0 },
      { w: 1.72, h: 2.12, x: 2.18, y: 0, z: 0 },
      { w: 1.72, h: 2.12, x: 2.18, y: -2.12, z: 0 },
      { w: 3.05, h: 1.18, x: 0, y: 0, z: .34 }
    ];
    const panels = pieces.map(piece => {
      const panel = createPanel(piece.w, piece.h, .38, materials);
      panel.position.set((Math.random() - .5) * 46, (Math.random() - .5) * 32, -18 - Math.random() * 22);
      panel.rotation.set((Math.random() - .5) * 4.2, (Math.random() - .5) * 4.2, (Math.random() - .5) * 3.6);
      panel.scale.setScalar(.72);
      panel.userData.target = new THREE.Vector3(piece.x, piece.y, piece.z);
      letterGroup.add(panel);
      return panel;
    });

    const platform = new THREE.Group();
    platform.position.set(0, -4.05, -.15);
    platform.scale.setScalar(0);
    scene.add(platform);
    const base = new THREE.MeshStandardMaterial({ color: 0x0b0806, metalness: .9, roughness: .38 });
    const baseTop = new THREE.MeshStandardMaterial({ color: 0x24170f, metalness: .94, roughness: .22 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xb9814b, metalness: 1, roughness: .2, emissive: 0x381c08, emissiveIntensity: .18 });
    const addCylinder = (rt, rb, height, mat, y) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, height, 112), mat);
      mesh.position.y = y; platform.add(mesh); return mesh;
    };
    addCylinder(3.45, 3.72, .34, base, -.17);
    addCylinder(3.2, 3.45, .13, baseTop, .055);
    addCylinder(2.9, 3.2, .09, base, .165);
    [
      [3.58, .032, -.16], [3.28, .02, .12], [2.96, .025, .22], [2.28, .012, .22]
    ].forEach(([radius, tube, y]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 144), gold);
      ring.rotation.x = Math.PI / 2; ring.position.y = y; platform.add(ring);
    });

    const particleCount = mobile ? 3000 : 6200;
    const pos = new Float32Array(particleCount * 3);
    const targets = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const colorA = new THREE.Color(0x76502f), colorB = new THREE.Color(0x3a2515), colorC = new THREE.Color(0xc18a50);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - .5) * 90;
      pos[i3 + 1] = (Math.random() - .5) * 56;
      pos[i3 + 2] = (Math.random() - .5) * 42;
      let x, y;
      const part = Math.random();
      if (part < .39) { x = -2.18 + (Math.random() - .5) * 1.55; y = (Math.random() - .5) * 6.2; }
      else if (part < .78) { x = 2.18 + (Math.random() - .5) * 1.55; y = (Math.random() - .5) * 6.2; }
      else { x = (Math.random() - .5) * 4.35; y = (Math.random() - .5) * 1.08; }
      targets[i3] = x; targets[i3 + 1] = y; targets[i3 + 2] = (Math.random() - .5) * .45;
      const pick = Math.random();
      const color = pick > .87 ? colorC : pick > .54 ? colorA : colorB;
      colors[i3] = color.r; colors[i3 + 1] = color.g; colors[i3 + 2] = color.b;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particleMaterial = new THREE.PointsMaterial({ size: mobile ? .095 : .12, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    const morph = { value: 0 };

    const dustCount = mobile ? 500 : 1250;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - .5) * 75;
      dustPos[i * 3 + 1] = (Math.random() - .5) * 50;
      dustPos[i * 3 + 2] = (Math.random() - .5) * 50;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMaterial = new THREE.PointsMaterial({ color: 0x795434, size: .035, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x9e6c3e, transparent: true, opacity: .23, side: THREE.DoubleSide });
    const rings = [];
    [6.4, 7.2].forEach((radius, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, i ? .009 : .014, 8, 180), ringMaterial.clone());
      ring.scale.y = .64; ring.rotation.x = .12 + i * .18; ring.rotation.z = -.22 + i * .12;
      ring.position.z = -2.4 - i * .4; scene.add(ring); rings.push(ring);
    });

    let composer = null;
    try {
      if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? .24 : .34, .5, .8));
      }
    } catch (error) { console.warn('Bloom disabled:', error); composer = null; }

    function resize() {
      if (!state.active) return;
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (composer) composer.setSize(width, height);
    }

    const intro = byId('firstVisitIntro');
    const bootText = byId('introBootText');
    state.renderer = renderer; state.composer = composer; state.scene = scene; state.camera = camera; state.resize = resize;
    state.active = true; state.disposed = false;
    resize();

    const timeScale = reduced ? .58 : 1;
    const at = value => value * timeScale;
    const dur = value => Math.max(.45, value * timeScale);
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
    state.timeline = timeline;
    timeline.to(bootText, { opacity: 1, duration: dur(1.15), ease: 'power2.out' }, at(0));
    timeline.to(particleMaterial, { opacity: .88, duration: dur(2.3), ease: 'power2.out' }, at(1.1));
    timeline.to(morph, { value: 1, duration: dur(4.5), ease: 'power2.inOut' }, at(2.25));
    timeline.to(particleMaterial, { opacity: 0, duration: dur(1.2), ease: 'power2.in' }, at(7.2));
    timeline.to(particles.scale, { x: 2.2, y: 2.2, z: 2.2, duration: dur(1.8), ease: 'power2.out' }, at(7.2));

    const order = panels.slice().sort(() => Math.random() - .5);
    order.forEach((panel, index) => {
      const panelAt = at(8.1 + index * .28);
      timeline.to(panel.position, { x: panel.userData.target.x, y: panel.userData.target.y, z: panel.userData.target.z, duration: dur(3.9), ease: 'power3.inOut' }, panelAt);
      timeline.to(panel.rotation, { x: 0, y: 0, z: 0, duration: dur(3.9), ease: 'power3.inOut' }, panelAt);
      timeline.to(panel.scale, { x: 1, y: 1, z: 1, duration: dur(3.4), ease: 'back.out(1.12)' }, panelAt);
    });
    timeline.to(platform.scale, { x: 1, y: 1, z: 1, duration: dur(2.25), ease: 'back.out(1.2)' }, at(13.7));
    timeline.to(letterGroup.scale, { x: .78, y: .78, z: .78, duration: dur(2.7), ease: 'power2.inOut' }, at(15.0));
    timeline.to(letterGroup.position, { y: -1.18, duration: dur(2.7), ease: 'power2.inOut' }, at(15.0));
    timeline.to(camera.position, { z: mobile ? 22 : 19.5, y: 1.25, duration: dur(3.1), ease: 'power2.inOut' }, at(14.4));
    timeline.to(bootText, { opacity: 0, duration: dur(1.15), ease: 'power1.in' }, at(17.15));
    timeline.call(() => intro?.classList.add('intro-revealed'), [], at(17.5));

    const clock = new THREE.Clock();
    function animate() {
      if (!state.active || state.disposed) return;
      state.raf = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      if (morph.value > 0 && particleMaterial.opacity > 0) {
        const positions = particleGeometry.attributes.position.array;
        const speed = .018 + .034 * morph.value;
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3] += (targets[i3] - positions[i3]) * speed;
          positions[i3 + 1] += (targets[i3 + 1] - positions[i3 + 1]) * speed;
          positions[i3 + 2] += (targets[i3 + 2] - positions[i3 + 2]) * speed;
        }
        particleGeometry.attributes.position.needsUpdate = true;
      }
      dust.rotation.y = time * .004;
      dust.rotation.x = Math.sin(time * .07) * .016;
      rings.forEach((ring, i) => { ring.rotation.z += (i ? -.0008 : .00065); ring.material.opacity = .15 + Math.sin(time * .6 + i) * .045; });
      if (time > 18 * timeScale) {
        letterGroup.position.y = -1.18 + Math.sin(time * .62) * .035;
        letterGroup.rotation.y = Math.sin(time * .16) * .025;
        camera.position.x = Math.sin(time * .075) * .42;
        camera.lookAt(0, -1.2, 0);
      }
      if (composer) composer.render(); else renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', resize, { passive: true });
    return true;
  }

  function start() {
    if (state.active) return;
    state.disposed = false;
    let ok = false;
    try { ok = buildScene(); }
    catch (error) { console.warn('RemoveBG 3D intro fallback:', error); }
    if (!ok) fallback();
  }

  function destroy() {
    state.active = false;
    state.disposed = true;
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.timeline) { state.timeline.kill(); state.timeline = null; }
    if (state.resize) window.removeEventListener('resize', state.resize);
    if (state.scene) {
      state.scene.traverse(object => {
        if (object.geometry?.dispose) object.geometry.dispose();
        if (object.material) {
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach(material => material?.dispose?.());
        }
      });
    }
    if (state.composer?.dispose) state.composer.dispose();
    if (state.renderer) state.renderer.dispose();
    state.renderer = state.composer = state.scene = state.camera = state.resize = null;
  }

  window.RemoveBGIntro3D = { start, destroy };
})();
