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
