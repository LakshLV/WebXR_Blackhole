import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';



///////////////////////////////
// BASIC RENDERER SETUP
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

// IMPORTANT: sane clip planes for large-scale VR
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  10,      // near
  5e5      // far
);

scene.add(camera);

///////////////////////////////
// SAFE DESKTOP DEBUG CAMERA (NO MODULES)
///////////////////////////////

window.addEventListener('keydown', (e) => {
  const step = 100;

  if (e.key === 'w') camera.position.z -= step;
  if (e.key === 's') camera.position.z += step;
  if (e.key === 'a') camera.position.x -= step;
  if (e.key === 'd') camera.position.x += step;
  if (e.key === 'q') camera.position.y += step;
  if (e.key === 'e') camera.position.y -= step;

  camera.lookAt(0, 0, 0);

  console.log("Camera position:", camera.position);
});

///////////////////////////////
// DEBUG REFERENCE GEOMETRY
///////////////////////////////

scene.add(new THREE.GridHelper(100, 10));
scene.add(new THREE.AxesHelper(10));

///////////////////////////////
// PHYSICAL CONSTANTS (SI)
///////////////////////////////

const G = 6.67430e-11;
const c = 299792458;
const SOLAR_MASS = 1.98847e30;

///////////////////////////////
// BLACK HOLE PARAMETERS
///////////////////////////////

const blackHole = {
  massSolar: 1e6,
  massKg: null,
  rs: null
};

blackHole.massKg = blackHole.massSolar * SOLAR_MASS;
blackHole.rs = (2 * G * blackHole.massKg) / (c * c);

///////////////////////////////
// VISUAL SCALING
///////////////////////////////

const METERS_TO_UNITS = 1e-6;
const horizonRadiusUnits = blackHole.rs * METERS_TO_UNITS;

console.log("Black Hole Mass (kg):", blackHole.massKg);
console.log("Schwarzschild radius (m):", blackHole.rs);
console.log("Schwarzschild radius (units):", horizonRadiusUnits);

///////////////////////////////
// EVENT HORIZON VISUALIZATION
///////////////////////////////

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
horizonRing.rotation.x = Math.PI / 2;
scene.add(horizonRing);

///////////////////////////////
// PLAYER FIXED POSITION (50 r_s)
///////////////////////////////

const PLAYER_RADIUS_RS = 50;
const playerRadiusUnits = blackHole.rs * PLAYER_RADIUS_RS * METERS_TO_UNITS;

camera.position.set(0, 1.6, playerRadiusUnits);
camera.lookAt(0, 0, 0);

///////////////////////////////
// DEBUG SCALE PROBES
///////////////////////////////

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1000, 32, 32),
  new THREE.MeshBasicMaterial({ wireframe: true, color: 0x00ff00 })
));

scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(10, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
));

///////////////////////////////
// RENDER LOOP
///////////////////////////////

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

///////////////////////////////
// RESIZE HANDLING
///////////////////////////////

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
