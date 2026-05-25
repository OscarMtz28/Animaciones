import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui'; // Importamos el controlador

// 1. Configuración básica
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20252f);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 2. Iluminación
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// 3. Crear una textura generada por código (Tablero de ajedrez)
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const context = canvas.getContext('2d');
context.fillStyle = '#9c5959ff'; 
context.fillRect(0, 0, 256, 256);
context.fillStyle = '#ff0000'; // Cuadros rojos para que resalte mucho
context.fillRect(0, 0, 128, 128);
context.fillRect(128, 128, 128, 128);

const texturaAjedrez = new THREE.CanvasTexture(canvas);
texturaAjedrez.wrapS = THREE.RepeatWrapping;
texturaAjedrez.wrapT = THREE.RepeatWrapping;
texturaAjedrez.repeat.set(4, 2); // Repetir el patrón

// 4. Geometrías y Materiales

const matStandard = new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.2, metalness: 0.8 });
const matPhong = new THREE.MeshPhongMaterial({ color: 0x00aaff, shininess: 100 });

// Nuevo material que usa nuestra textura

const matTextura = new THREE.MeshStandardMaterial({ map: texturaAjedrez, roughness: 0.5 }); 

const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x555555 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), matStandard);
box.position.set(-4, 1.5, 0);
box.castShadow = true;
scene.add(box);

// Aplicamos la textura súper visible a la esfera
const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), matTextura);
sphere.position.set(0, 1.5, 0);
sphere.castShadow = true;
scene.add(sphere);

const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3, 32), matPhong);
cylinder.position.set(4, 1.5, 0);
cylinder.castShadow = true;
scene.add(cylinder);

const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.4, 16, 100), matPhong);
torus.position.set(0, 1.5, 4);
torus.castShadow = true;
scene.add(torus);

// 5. Controles de Órbita (Permiten zoom con la rueda del ratón)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 6. PANEL DE CONTROL (GUI)
// Definimos el estado inicial de nuestras variables
const parametros = {
    velocidadRotacion: 0.01,
    zoomFOV: 75,
    colorCubo: 0x00ff88,
    mostrarWireframe: false,
    intensidadLuz: 1.5
};

const gui = new GUI({ title: 'Controles de Escena' });

// Carpeta: Animación
const carpetaAnim = gui.addFolder('Animación');
carpetaAnim.add(parametros, 'velocidadRotacion', 0, 0.1, 0.001).name('Velocidad');

// Carpeta: Cámara
const carpetaCam = gui.addFolder('Cámara');
// Cambiar el FOV (Field of View) funciona excelente como un control de Zoom
carpetaCam.add(parametros, 'zoomFOV', 20, 120).name('Zoom (FOV)').onChange((valor) => {
    camera.fov = valor;
    camera.updateProjectionMatrix(); // Obligatorio al cambiar propiedades de la cámara
});

// Carpeta: Apariencia
const carpetaApariencia = gui.addFolder('Apariencia');
carpetaApariencia.addColor(parametros, 'colorCubo').name('Color del Cubo').onChange((valor) => {
    box.material.color.setHex(valor);
});
carpetaApariencia.add(parametros, 'intensidadLuz', 0, 5).name('Luz Direccional').onChange((valor) => {
    dirLight.intensity = valor;
});

// 7. Loop de Animación
function animate() {
    requestAnimationFrame(animate);

    box.rotation.x += parametros.velocidadRotacion;
    box.rotation.y += parametros.velocidadRotacion;
    
    sphere.rotation.y -= parametros.velocidadRotacion * 0.5;
    
    torus.rotation.x += parametros.velocidadRotacion * 2;

    controls.update();
    renderer.render(scene, camera);
}
animate();