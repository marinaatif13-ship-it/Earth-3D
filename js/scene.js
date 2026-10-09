/* ============================================================
   scene.js — the 3D world (Three.js r128)
   Real Earth with day/night shader, clouds, atmosphere glow,
   Moon, planets, stars, and a full-screen "backdrop" shader
   (lava / ocean / aurora). main.js drives it via EarthScene.setState()
   ============================================================ */
(function () {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.body.classList.add('no-webgl');
    window.EarthScene = null;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x02030a, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  camera.position.set(0, 0, 10);
  const halfH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

  /* ---------- textures ---------- */
  const loader = new THREE.TextureLoader();
  const T = 'assets/textures/';
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (f) => { const t = loader.load(T + f); t.anisotropy = Math.min(8, maxAniso); return t; };
  const dayMap = tex('earth_atmos_2048.jpg');
  const nightMap = tex('earth_lights_2048.png');
  const specMap = tex('earth_specular_2048.jpg');
  const cloudMap = tex('earth_clouds_1024.png');
  const moonMap = tex('moon_1024.jpg');

  /* ---------- backdrop shader (lava / ocean / aurora) ---------- */
  const backdropU = { uTime: { value: 0 }, uAspect: { value: 1.7 }, uLava: { value: 0 }, uOcean: { value: 0 }, uAurora: { value: 0 } };
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: backdropU, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.9999,1.0); }',
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime,uAspect,uLava,uOcean,uAurora;
        float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
        void main(){
          vec2 uv=vUv; vec2 p=vec2(uv.x*uAspect,uv.y);
          vec3 c=vec3(0.); float w=0.;
          if(uLava>.001){
            vec2 q=p*3.0+vec2(0.,uTime*.03);
            float n=fbm(q+fbm(q*1.3+uTime*.05)*1.5);
            float ridge=1.-abs(n*2.-1.);
            float veins=pow(ridge,9.), glow=pow(ridge,3.)*.22;
            float mask=1.-smoothstep(.22,.7,uv.x)*.93;
            vec3 lava=mix(vec3(.62,.05,0.),vec3(1.,.72,.3),veins)*(veins*2.4+glow);
            lava*=mask*(.5+.5*smoothstep(.1,.9,n));
            c+=lava*uLava; w+=uLava;
          }
          if(uOcean>.001){
            vec2 q=vec2(p.x*1.4,p.y*7.)+vec2(uTime*.05,uTime*.09);
            float n=fbm(q+fbm(q*.8));
            vec3 deep=mix(vec3(0.,.05,.14),vec3(0.,.16,.36),uv.y);
            float hl=smoothstep(.6,.9,n)*.55*(1.-uv.y*.5);
            float g=exp(-pow((uv.x-.5)*3.,2.))*smoothstep(.4,0.,uv.y)*fbm(vec2(p.x*22.,p.y*70.+uTime*.7));
            c+=(deep+hl*vec3(.3,.5,.8)+g*vec3(.85,.9,1.))*uOcean; w+=uOcean;
          }
          if(uAurora>.001){
            vec3 base=mix(vec3(0.,.14,.24),vec3(0.,.03,.09),uv.y);
            float s=0.;
            for(int i=0;i<4;i++){
              float k=float(i); float x=uv.x*uAspect*1.2+k*1.7;
              float wave=sin(x*1.3+uTime*.15+k)*.12+sin(x*3.1-uTime*.1)*.05;
              float band=exp(-pow((uv.y-(.3+k*.1+wave))*(4.+k),2.));
              s+=band*(.5+.5*noise(vec2(x*3.,uTime*.1+k)));
            }
            vec3 ac=mix(vec3(.1,.9,.7),vec3(.45,.35,.95),smoothstep(.1,.65,uv.y));
            float glow=exp(-pow(length((uv-vec2(.5,-.05))*vec2(1.1,1.2)),2.)*3.5);
            float st=step(.9975,hash(floor(p*vec2(170.))));
            c+=(base+ac*s*.5+glow*vec3(.18,.45,.6)+st*.7)*uAurora; w+=uAurora;
          }
          gl_FragColor=vec4(c/max(w,.0001),min(w,1.));
        }`
    })
  );
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -10;
  scene.add(backdrop);

  /* ---------- stars + nebula ---------- */
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  function starField(n, rMin, rMax, size, opacity) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = rMin + Math.random() * (rMax - rMin), th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph);
      const k = 0.55 + Math.random() * 0.45, tint = Math.random();
      col[i * 3] = k * (tint > .8 ? 1 : .85); col[i * 3 + 1] = k * .92; col[i * 3 + 2] = k * (tint < .3 ? 1 : .95);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size, map: dot, alphaTest: .02, vertexColors: true, transparent: true, opacity, depthWrite: false, sizeAttenuation: true }));
  }
  const stars = starField(2600, 60, 140, 0.9, 0.9); scene.add(stars);

  const nebula = (() => {
    const n = 3200, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - .5) * 150, y = Math.sin(x * .07) * 9 + (Math.random() + Math.random() + Math.random() - 1.5) * 9;
      pos[i * 3] = x; pos[i * 3 + 1] = y + 3; pos[i * 3 + 2] = -70 + Math.random() * 6;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x4a8dff, map: dot, size: 1.1, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  })();
  scene.add(nebula);

  /* ---------- Earth ---------- */
  const sunDir = new THREE.Vector3(1, .3, .7).normalize();
  const sunU = { value: sunDir };
  const earthGroup = new THREE.Group(); scene.add(earthGroup);
  const spin = new THREE.Group(); earthGroup.add(spin);
  const baseVert = 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: { dayMap: { value: dayMap }, nightMap: { value: nightMap }, specMap: { value: specMap }, uSun: sunU },
      vertexShader: baseVert,
      fragmentShader: `
        uniform sampler2D dayMap,nightMap,specMap; uniform vec3 uSun;
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 n=normalize(vN), L=normalize(uSun), V=normalize(cameraPosition-vW);
          float d=dot(n,L), dayMix=smoothstep(-.12,.28,d);
          vec3 day=texture2D(dayMap,vUv).rgb, night=texture2D(nightMap,vUv).rgb;
          float sea=texture2D(specMap,vUv).r;
          day=pow(day,vec3(.85))*1.28;
          day=mix(day,day*vec3(.6,1.05,1.65)+vec3(0.,.03,.1),sea*.6);
          vec3 lit=day*(.12+pow(max(d,0.),.9)*.92);
          vec3 dark=night*vec3(1.,.74,.42)*1.7+day*.035;
          vec3 col=mix(dark,lit,dayMix);
          vec3 H=normalize(L+V);
          col+=pow(max(dot(n,H),0.),120.)*texture2D(specMap,vUv).r*.28*dayMix;
          float fr=pow(1.-max(dot(n,V),0.),3.);
          col+=vec3(.16,.42,1.)*fr*.65*(.25+dayMix);
          gl_FragColor=vec4(col,1.);
        }`
    })
  );
  spin.add(earth);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { map: { value: cloudMap }, uSun: sunU }, transparent: true, depthWrite: false,
      vertexShader: baseVert,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN;
        void main(){ float a=texture2D(map,vUv).a; float d=dot(normalize(vN),normalize(uSun));
          float lit=smoothstep(-.2,.35,d); gl_FragColor=vec4(vec3(1.)*(.05+lit*.95),a*.8); }`
    })
  );
  spin.add(clouds);

  const atmoU = { uStrength: { value: .75 } };
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: atmoU, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: 'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uStrength; varying vec3 vN; void main(){ float i=pow(max(0.,.72-dot(vN,vec3(0.,0.,1.))),3.); gl_FragColor=vec4(.28,.55,1.,1.)*i*uStrength; }'
    })
  );
  earthGroup.add(atmosphere);

  /* ---------- Moon + planets (screen-space placed like Earth) ---------- */
  const moonLight = new THREE.DirectionalLight(0xffffff, 1.25); moonLight.position.set(1, .3, .7); scene.add(moonLight);
  scene.add(new THREE.AmbientLight(0xffffff, .08));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), new THREE.MeshLambertMaterial({ map: moonMap }));
  scene.add(moon);

  function bandTexture(stops) {
    const c = document.createElement('canvas'); c.width = 8; c.height = 256;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    x.fillStyle = g; x.fillRect(0, 0, 8, 256);
    return new THREE.CanvasTexture(c);
  }
  const planetA = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), new THREE.MeshLambertMaterial({ map: bandTexture(['#d9b48a', '#a8774f', '#e8c9a0', '#b5845a', '#d9b48a', '#8f633f', '#dcbd94']) }));
  const planetB = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), new THREE.MeshLambertMaterial({ map: bandTexture(['#7fb3ff', '#4c7fd6', '#9cc6ff', '#4c7fd6']) }));
  scene.add(planetA, planetB);

  /* ---------- state + animation ---------- */
  const cur = { nx: .78, ny: -.15, r: 1.35, lon: -70, sun: new THREE.Vector3(1, .3, .7), mx: .5, my: -1.1, mr: 1.3, lava: 0, ocean: 0, aurora: 0, nebula: 0, planets: 0, atmo: .75 };
  let tgt = { nx: .78, ny: -.15, r: 1.35, lon: -70, sun: [1, .3, .7], mx: .5, my: -1.1, mr: 1.3, fx: '', nebula: 0, planets: 0 };
  let dragYaw = 0, dragPitch = 0, velYaw = 0, mouseX = 0, mouseY = 0;
  const lonYaw = (d) => -Math.PI / 2 - THREE.MathUtils.degToRad(d);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    backdropU.uAspect.value = camera.aspect;
  }
  window.addEventListener('resize', resize); resize();
  window.addEventListener('pointermove', (e) => { mouseX = e.clientX / innerWidth - .5; mouseY = e.clientY / innerHeight - .5; }, { passive: true });

  const SETTLE = /[?&]settle/.test(location.search); // test helper: snap straight to each state
  const clock = new THREE.Clock();
  let time = 0, yaw = lonYaw(-70);
  const lerp = THREE.MathUtils.lerp;

  function frame() {
    const dt = Math.min(clock.getDelta(), .05); time += dt;
    const k = SETTLE ? 1 : 1 - Math.exp(-dt * 2.6);
    const hh = halfH(), hw = hh * camera.aspect, portrait = camera.aspect < .85;

    let { nx, ny, r } = tgt;
    if (portrait && nx < 2) {
      if (ny > -1.5) { nx = 0; ny = .52; r = Math.min(r, camera.aspect * .95); }
      else { nx = 0; }
    }
    cur.nx = lerp(cur.nx, nx, k); cur.ny = lerp(cur.ny, ny, k); cur.r = lerp(cur.r, r, k);
    cur.lon = lerp(cur.lon, tgt.lon, k);
    cur.sun.x = lerp(cur.sun.x, tgt.sun[0], k); cur.sun.y = lerp(cur.sun.y, tgt.sun[1], k); cur.sun.z = lerp(cur.sun.z, tgt.sun[2], k);
    cur.mx = lerp(cur.mx, tgt.mx, k); cur.my = lerp(cur.my, tgt.my, k); cur.mr = lerp(cur.mr, tgt.mr, k);
    cur.lava = lerp(cur.lava, tgt.fx === 'lava' ? 1 : 0, k);
    cur.ocean = lerp(cur.ocean, tgt.fx === 'ocean' ? 1 : 0, k);
    cur.aurora = lerp(cur.aurora, tgt.fx === 'aurora' ? 1 : 0, k);
    cur.nebula = lerp(cur.nebula, tgt.nebula, k);
    cur.planets = lerp(cur.planets, tgt.planets, k);

    sunDir.copy(cur.sun).normalize(); moonLight.position.copy(sunDir);

    // drag inertia
    dragYaw += velYaw; velYaw *= .94;
    dragPitch *= .985;

    // Earth placement
    earthGroup.position.set(cur.nx * hw + mouseX * -.18, cur.ny * hh + mouseY * -.12, 0);
    const s = Math.max(cur.r * hh, .0001); earthGroup.scale.setScalar(s);
    earthGroup.rotation.x = .36 + dragPitch + mouseY * .06;
    earthGroup.rotation.z = .08;
    yaw = lerp(yaw, lonYaw(cur.lon), k);
    spin.rotation.y = yaw + dragYaw + Math.sin(time * .12) * .12 + mouseX * .12;
    clouds.rotation.y = time * .006;
    atmoU.uStrength.value = .75;

    // Moon & planets
    moon.position.set(cur.mx * hw, cur.my * hh, 0); moon.scale.setScalar(Math.max(cur.mr * hh * .27, .0001)); moon.rotation.y = time * .05;
    const pw = cur.planets;
    planetA.position.set(hw * .07, hh * .03, -2); planetA.scale.setScalar(Math.max(hh * .085 * pw, .0001));
    planetB.position.set(hw * .16, hh * .02, -2); planetB.scale.setScalar(Math.max(hh * .045 * pw, .0001));

    // backdrop + sky
    backdropU.uTime.value = time; backdropU.uLava.value = cur.lava; backdropU.uOcean.value = cur.ocean; backdropU.uAurora.value = cur.aurora;
    nebula.material.opacity = .55 * cur.nebula;
    stars.rotation.y = time * .004; stars.rotation.x = time * .0015;
    stars.material.opacity = .9 * (1 - Math.min(1, cur.lava + cur.ocean * .8 + cur.aurora * .5));
    backdrop.visible = cur.lava + cur.ocean + cur.aurora > .002;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.EarthScene = {
    setState(s) { tgt = s; },
    nudge(dx, dy) { velYaw = dx * .0022; dragYaw += dx * .0016; dragPitch = THREE.MathUtils.clamp(dragPitch + dy * .0016, -.5, .5); }
  };
})();
