import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// --- 1. ESCENA Y CÁMARA PRO ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.01);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// --- CONFIGURACIÓN DE ZOOM SUAVE (CORRECCIÓN) ---
controls.enableDamping = true;       // Activa la inercia (deslizamiento suave)
controls.dampingFactor = 0.05;       // Qué tan rápido frena la cámara (valores más bajos = más suave)
controls.zoomSpeed = 0.5;            // Reduce la sensibilidad del zoom a la mitad (antes era 1.0)

// Límites de seguridad para no perder de vista el sistema solar
controls.maxDistance = 80;
controls.minDistance = 5;

// --- 2. FONDO DE ESTRELLAS ---
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 2000;
const starPositions = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 200;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.18,
    transparent: true,
    opacity: 0.7
});
const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

// --- 3. ILUMINACIÓN EQUILIBRADA (CORRECCIÓN) ---
// Reducimos la intensidad de la luz puntual y aumentamos su alcance para iluminar mejor los planetas lejanos
const sunLight = new THREE.PointLight(0xffffff, 3.5, 300, 0.2);
scene.add(sunLight);

// Incrementamos la luz ambiental para eliminar la oscuridad extrema en el espacio
const spaceLight = new THREE.AmbientLight(0x333a56, 1.2);
scene.add(spaceLight);

// --- 4. CONFIGURACIÓN ---
const settings = {
    globalSpeed: 1.0,
    showOrbits: true
};

// --- 5. GENERADOR DE TEXTURAS ---
function generatePlanetTexture(baseColorHex, detailColorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = detailColorHex + '22';
        ctx.beginPath();
        ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 150, Math.random() * 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

// --- 6. MATERIALES ---
const matSun = new THREE.MeshBasicMaterial({ color: 0xffbb11 });

const texPlanet1 = generatePlanetTexture('#6d635b', '#3a3530');
const matPlanet1 = new THREE.MeshStandardMaterial({ map: texPlanet1, roughness: 0.8 });

const texPlanet2 = generatePlanetTexture('#2874a6', '#5dade2');
const matPlanet2 = new THREE.MeshStandardMaterial({ map: texPlanet2, roughness: 0.5 });

const texPlanet3 = generatePlanetTexture('#ba4a3f', '#f4d03f');
const matPlanet3 = new THREE.MeshStandardMaterial({ map: texPlanet3, roughness: 0.6 });

const texMoon = generatePlanetTexture('#95a5a6', '#566573');
const matMoon = new THREE.MeshStandardMaterial({ map: texMoon, roughness: 0.9 });

// --- 7. CONSTRUCCIÓN DEL SISTEMA SOLAR ---

// El Sol y su corona
const sun = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), matSun);
scene.add(sun);

const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(3.3, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.2, side: THREE.BackSide })
);
sun.add(sunGlow);

// Función constructora con ÓRBITAS CORREGIDAS (Visibles y brillantes)
function createPlanet(size, material, distance, rotSpeed, orbSpeed) {
    const orbitPivot = new THREE.Group();
    scene.add(orbitPivot);

    const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 32), material);
    planetMesh.position.x = distance;
    orbitPivot.add(planetMesh);

    // CORRECCIÓN: Usamos un anillo plano con MeshBasicMaterial para que no dependa de las luces y sea 100% visible
    const orbitPath = new THREE.Mesh(
        new THREE.RingGeometry(distance - 0.04, distance + 0.04, 128),
        new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    orbitPath.rotation.x = Math.PI / 2;
    scene.add(orbitPath);

    return { orbitPivot, planetMesh, rotSpeed, orbSpeed, orbitPath };
}

// Inicializar planetas
const p1 = createPlanet(0.6, matPlanet1, 7, 0.04, 0.015);
const p2 = createPlanet(1.1, matPlanet2, 13, 0.02, 0.008);
const p3 = createPlanet(1.7, matPlanet3, 21, 0.01, 0.004);

// Luna de Planeta 2
const moon1Pivot = new THREE.Group();
p2.planetMesh.add(moon1Pivot);
const moon1 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), matMoon);
moon1.position.x = 2.2;
moon1Pivot.add(moon1);

// Lunas de Planeta 3
const moon3APivot = new THREE.Group();
p3.planetMesh.add(moon3APivot);
const moon3A = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), matMoon);
moon3A.position.x = 3.0;
moon3APivot.add(moon3A);

const moon3BPivot = new THREE.Group();
moon3BPivot.rotation.z = 0.3;
p3.planetMesh.add(moon3BPivot);
const moon3B = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), matMoon);
moon3B.position.x = -4.0;
moon3BPivot.add(moon3B);

// --- 8. INTERFAZ (GUI) ---
const gui = new GUI({ title: '🌌 Panel de Control' });
gui.add(settings, 'globalSpeed', 0, 3).name('Velocidad');
gui.add(settings, 'showOrbits').name('Mostrar Órbitas').onChange(v => {
    [p1, p2, p3].forEach(p => p.orbitPath.visible = v);
});

// --- 9. ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);

    const s = settings.globalSpeed;

    sun.rotation.y += 0.002 * s;

    p1.orbitPivot.rotation.y += p1.orbSpeed * s;
    p1.planetMesh.rotation.y += p1.rotSpeed * s;

    p2.orbitPivot.rotation.y += p2.orbSpeed * s;
    p2.planetMesh.rotation.y += p2.rotSpeed * s;
    moon1Pivot.rotation.y += 0.04 * s;

    p3.orbitPivot.rotation.y += p3.orbSpeed * s;
    p3.planetMesh.rotation.y += p3.rotSpeed * s;
    moon3APivot.rotation.y += 0.03 * s;
    moon3BPivot.rotation.y += 0.05 * s;

    controls.update();
    renderer.render(scene, camera);
}

// --- 10. RESIZE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();