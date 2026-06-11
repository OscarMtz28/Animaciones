import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// --- 1. CONFIGURACIÓN DE LA ESCENA ---
const scene = new THREE.Scene();

// Ajustamos el "near" a 0.01 (antes 0.1) para poder acercarnos muchísimo más sin que se corte el objeto
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(6, 5, 8); // Posición inicial más cercana y cómoda

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// SOLUCIÓN AL ZOOM: Cambiamos el objetivo a donde mira la cámara.
// En lugar de mirar al suelo (0,0,0), mirará al centro del brazo (altura Y = 2.5)
controls.target.set(0, 2.5, 0);

// Opcional: Limitar el zoom máximo y mínimo para que el usuario no se pierda en el infinito
controls.minDistance = 2;   // No permite acercarse más de 2 unidades del brazo
controls.maxDistance = 25;  // No permite alejarse más de 25 unidades

// --- 2. ILUMINACIÓN Y ENTORNO ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
grid.position.y = -0.5;
scene.add(grid);

// --- 3. MATERIALES ---
const materialRobot = new THREE.MeshStandardMaterial({ color: 0x4682B4, roughness: 0.3 }); // Azul metalizado
const materialJoint = new THREE.MeshStandardMaterial({ color: 0xFF4500, roughness: 0.5 }); // Naranja para articulaciones
const materialFinger = new THREE.MeshStandardMaterial({ color: 0x708090 });

// Configuración inicial de los controles de la interfaz
const config = {
    autoAnimate: true,
    baseRot: 0,
    hombroRot: 0,
    codoRot: 0,
    munecaRot: 0,
    dedosRot: 0
};

// --- 4. CONSTRUCCIÓN DE LA JERARQUÍA TRANSALADA (PIVOTES LOCALES) ---

// Eslabón 1: BASE
const base = new THREE.Group();
const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 32), materialRobot);
baseMesh.position.y = 0.25; 
base.add(baseMesh);
scene.add(base);

// Eslabón 2: HOMBRO (Hijo de Base)
const hombro = new THREE.Group();
hombro.position.y = 0.5; // Se coloca justo arriba del cuerpo de la base
const hombroJoint = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), materialJoint);
const hombroMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3, 16), materialRobot);
hombroMesh.position.y = 1.5; // Desplazamos la malla para que pivote desde su base inferior
hombro.add(hombroJoint, hombroMesh);
base.add(hombro); // <--- Conexión en cadena

// Eslabón 3: CODO (Hijo de Hombro)
const codo = new THREE.Group();
codo.position.y = 3.0; // Se sitúa al extremo final del eslabón del hombro
const codoJoint = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), materialJoint);
const codoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.5, 16), materialRobot);
codoMesh.position.y = 1.25; 
codo.add(codoJoint, codoMesh);
hombro.add(codo); // <--- Conexión en cadena

// Eslabón 4: MUÑECA (Hijo de Codo)
const muneca = new THREE.Group();
muneca.position.y = 2.5; // Se sitúa al extremo del codo
const munecaJoint = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), materialJoint);
const munecaMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), materialRobot);
munecaMesh.position.y = 0.15;
muneca.add(munecaJoint, munecaMesh);
codo.add(muneca); // <--- Conexión en cadena

// Eslabones 5 y 6: DEDOS DE LA PINZA (Hijos de Muñeca)
// Dedo Izquierdo
const dedo1 = new THREE.Group();
dedo1.position.set(0.2, 0.3, 0); 
const d1Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.2), materialFinger);
d1Mesh.position.y = 0.3;
dedo1.add(d1Mesh);
muneca.add(dedo1); // <--- Conexión en cadena

// Dedo Derecho (Simétrico)
const dedo2 = new THREE.Group();
dedo2.position.set(-0.2, 0.3, 0); 
const d2Mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.2), materialFinger);
d2Mesh.position.y = 0.3;
dedo2.add(d2Mesh);
muneca.add(dedo2); // <--- Conexión en cadena


// --- 5. INTERFAZ GRÁFICA DE USUARIO (GUI) ---
const gui = new GUI({ title: 'Control del Brazo' });
gui.add(config, 'autoAnimate').name('Animación Automática');

const fManual = gui.addFolder('Control Manual');
fManual.add(config, 'baseRot', -Math.PI, Math.PI).name('Base (Y)').listen();
fManual.add(config, 'hombroRot', -Math.PI/2, Math.PI/2).name('Hombro (X)').listen();
fManual.add(config, 'codoRot', -Math.PI/2, Math.PI/2).name('Codo (X)').listen();
fManual.add(config, 'munecaRot', -Math.PI, Math.PI).name('Muñeca (Y)').listen();
fManual.add(config, 'dedosRot', -0.5, 0.5).name('Pinza (Z)').listen();


// --- 6. BUCLE DE ANIMACIÓN ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Si la animación automática está activa, sobreescribimos los valores con ondas Seno/Coseno
    if (config.autoAnimate) {
        config.baseRot = Math.sin(time * 0.5) * 1.5;
        config.hombroRot = Math.sin(time * 0.8) * 0.5;
        config.codoRot = (Math.cos(time * 1.2) + 0.5) * 0.7; // Mantiene una flexión natural
        config.munecaRot = Math.sin(time * 2.0) * 1.0;
        config.dedosRot = (Math.sin(time * 3.0) + 0.4) * 0.25; // Ciclo de apertura y cierre
    }

    // Aplicar las transformaciones de forma local a cada CONTENEDOR (Pivote)
    base.rotation.y = config.baseRot;
    hombro.rotation.x = config.hombroRot;
    codo.rotation.x = config.codoRot;
    muneca.rotation.y = config.munecaRot;
    
    // Los dedos se mueven en espejo (uno invertido respecto al otro)
    dedo1.rotation.z = -config.dedosRot;
    dedo2.rotation.z = config.dedosRot;

    controls.update();
    renderer.render(scene, camera);
}

// --- 7. CONTROL DE REDIMENSIONAMIENTO VENTANA ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Inicializar ciclo de renderizado
animate();