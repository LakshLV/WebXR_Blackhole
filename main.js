import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';

 
// RENDERER
 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

 
// SCENE & CAMERA
 

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);

// Player is fixed at origin in render space
camera.position.set(0, 1.6, 0);
scene.add(camera);

 
// PHYSICAL CONSTANTS (SI)
 

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

 
// BLACK HOLE (PHYSICS SPACE)
 

const blackHole = {
  massSolar: 1e6,
  massKg: null,
  rs: null
};

blackHole.massKg = blackHole.massSolar * SOLAR_MASS;
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

 
// OBSERVER SETUP (PHYSICS)
 

const PLAYER_PHYSICS_RADIUS = 50 * blackHole.rs;
const HORIZON_PHYSICS_RADIUS = blackHole.rs;

 
// RENDER MAPPING
 

// How close the horizon feels in VR (meters)
const HORIZON_RENDER_DISTANCE = 4.0;

// Maps physics radius → render Z offset
function physicsRadiusToRenderZ(rPhysics) {
  const deltaRs =
    (rPhysics - PLAYER_PHYSICS_RADIUS) / blackHole.rs;

  return deltaRs * HORIZON_RENDER_DISTANCE;
}

 
// EVENT HORIZON VISUAL
 

const horizonRenderZ =
  physicsRadiusToRenderZ(HORIZON_PHYSICS_RADIUS);

const horizonGeometry = new THREE.RingGeometry(
  1.0,
  1.05,
  128
);

const horizonMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  side: THREE.DoubleSide
});

const horizonRing = new THREE.Mesh(
  horizonGeometry,
  horizonMaterial
);

// Face the player
horizonRing.rotation.x = Math.PI / 2;
horizonRing.position.set(0, 0, horizonRenderZ);

scene.add(horizonRing);

 
// SINGULARITY MARKER (DEBUG)
 

const singularity = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);

singularity.position.set(0, 0, horizonRenderZ - 0.5);
scene.add(singularity);

 
// OPTIONAL ORIENTATION GRID
 

scene.add(new THREE.GridHelper(5, 10));

 
// RENDER LOOP
 

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

 
// RESIZE
 

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

 
// DEBUG OUTPUT
 

console.log("Black hole mass (kg):", blackHole.massKg);
console.log("Schwarzschild radius (m):", blackHole.rs);
console.log("Player radius (r):", PLAYER_PHYSICS_RADIUS);
console.log("Horizon render Z:", horizonRenderZ);
