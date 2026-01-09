import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';


 
// BASIC RENDERER SETUP
 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

 
// SCENE & CAMERA
 
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Player camera (external observer, fixed)
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1e7 // very large far plane (needed later)
);

// Fixed observer position (no movement allowed)
camera.position.set(0, 1.6, 0); // human eye height

scene.add(camera);

 
// DEBUG REFERENCE GEOMETRY
 
// Floor grid (1 unit = 1 meter)
const grid = new THREE.GridHelper(10, 10);
scene.add(grid);

// Axis helper (X red, Y green, Z blue)
const axes = new THREE.AxesHelper(1);
scene.add(axes);

 
// RESIZE HANDLING
 
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

 
// XR RENDER LOOP
 
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

 
// PHYSICAL CONSTANTS (SI)
 
const G = 6.67430e-11;            // m^3 kg^-1 s^-2
const c = 299792458;              // m/s
const SOLAR_MASS = 1.98847e30;    // kg

 
// BLACK HOLE PARAMETERS
 
const blackHole = {
  massSolar: 1e6,                 // Configurable
  massKg: null,
  rs: null                        // Schwarzschild radius (meters)
};

// Compute mass in kg
blackHole.massKg = blackHole.massSolar * SOLAR_MASS;

// Schwarzschild radius
// r_s = 2GM / c^2
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);


console.log("Black Hole Mass (kg):", blackHole.massKg);
console.log("Schwarzschild radius (m):", blackHole.rs);
console.log("Schwarzschild radius (units):", horizonRadiusUnits);


 
// VISUAL SCALING
 
// 1 unit = 1e6 meters (visual only)
const METERS_TO_UNITS = 1e-6;

 
// EVENT HORIZON VISUALIZATION
 
// Thin ring at r = r_s
const horizonRadiusUnits = blackHole.rs * METERS_TO_UNITS;

const horizonGeometry = new THREE.RingGeometry(
  horizonRadiusUnits * 0.98,
  horizonRadiusUnits * 1.02,
  128
);

const horizonMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6600,
  side: THREE.DoubleSide
});

const horizonRing = new THREE.Mesh(horizonGeometry, horizonMaterial);

// Orient ring to face camera (XY plane)
horizonRing.rotation.x = Math.PI / 2;

scene.add(horizonRing);

 
// PLAYER FIXED POSITION (EXTERNAL OBSERVER)
 

// Player stays at r = 50 r_s (visual only for now)
const PLAYER_RADIUS_RS = 50;

// Convert to visual units
const playerRadiusUnits = blackHole.rs * PLAYER_RADIUS_RS * METERS_TO_UNITS;

// Place player along +Z axis
camera.position.set(0, 1.6, playerRadiusUnits);

// Look at black hole center
camera.lookAt(0, 0, 0);


// A white sphere at the black hole center
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
));
