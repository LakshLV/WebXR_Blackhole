import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

///////////////////////////////
// RENDERER
///////////////////////////////

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

///////////////////////////////
// SCENE & CAMERA
///////////////////////////////

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  20
);

camera.position.set(0, 1.6, 0);
scene.add(camera);

///////////////////////////////
// PHYSICAL CONSTANTS (SI)
///////////////////////////////

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

///////////////////////////////
// BLACK HOLE (PHYSICS SPACE)
///////////////////////////////

const blackHole = {
  massSolar: 1e6,
  massKg: null,
  rs: null
};

blackHole.massKg = blackHole.massSolar * SOLAR_MASS;
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

///////////////////////////////
// OBSERVER & CUBE (PHYSICS)
///////////////////////////////

const PLAYER_PHYSICS_RADIUS = 50 * blackHole.rs;
const CUBE_PHYSICS_RADIUS = 5 * blackHole.rs;

///////////////////////////////
// RENDER MAPPING
///////////////////////////////

const HORIZON_RENDER_DISTANCE = 0.08;

function physicsRadiusToRenderZ(rPhysics) {
  const deltaRs =
    (rPhysics - PLAYER_PHYSICS_RADIUS) / blackHole.rs;

  return deltaRs * HORIZON_RENDER_DISTANCE;
}

///////////////////////////////
// EVENT HORIZON VISUAL
///////////////////////////////

const horizonZ = physicsRadiusToRenderZ(blackHole.rs);

const horizonRing = new THREE.Mesh(
  new THREE.RingGeometry(1.0, 1.05, 128),
  new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide
  })
);

horizonRing.rotation.x = Math.PI / 2;
horizonRing.position.set(0, 0, horizonZ);
scene.add(horizonRing);

///////////////////////////////
// CUBE (STATIONARY TEST MASS)
///////////////////////////////

const cubeZ = physicsRadiusToRenderZ(CUBE_PHYSICS_RADIUS);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.15, 0.15),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);

cube.position.set(0, 1.6, cubeZ);
scene.add(cube);

///////////////////////////////
// TIME VARIABLES
///////////////////////////////

// Coordinate time (player)
let t = 0;

// Proper time (cube)
let tau = 0;

// Last frame timestamp
let lastTime = performance.now();

///////////////////////////////
// DEBUG CALCULATIONS
///////////////////////////////

function timeDilationFactor(r) {
  // dt/dτ = 1 / (1 - r_s / r)
  return 1.0 / (1.0 - blackHole.rs / r);
}

///////////////////////////////
// HUD (PLAYER TIME)
///////////////////////////////

const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.top = '10px';
hud.style.left = '10px';
hud.style.color = 'white';
hud.style.fontFamily = 'monospace';
hud.style.fontSize = '14px';
hud.style.zIndex = '1000';
document.body.appendChild(hud);

///////////////////////////////
// RENDER LOOP
///////////////////////////////

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = (now - lastTime) * 0.001;
  lastTime = now;

  // Advance coordinate time
  t += dt;

  // Advance proper time
  const dilation = timeDilationFactor(CUBE_PHYSICS_RADIUS);
  tau += dt / dilation;

  // HUD output
  hud.innerHTML = `
t (player): ${t.toFixed(2)} s<br>
τ (cube): ${tau.toFixed(2)} s<br>
dt/dτ: ${dilation.toFixed(3)}<br>
r / rₛ: ${(CUBE_PHYSICS_RADIUS / blackHole.rs).toFixed(2)}
`;

  renderer.render(scene, camera);
});

///////////////////////////////
// RESIZE
///////////////////////////////

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

///////////////////////////////
// CONSOLE VERIFICATION
///////////////////////////////

console.log("dt/dτ expected:",
  timeDilationFactor(CUBE_PHYSICS_RADIUS)
);
