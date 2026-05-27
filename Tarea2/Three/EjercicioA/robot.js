import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

// --- 1. CONFIGURACIÓN DE ESCENA, CÁMARA Y RENDERER ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Fondo un poco más oscuro

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(12, 12, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Habilitar sombras para mayor realismo
document.body.appendChild(renderer.domElement);

// --- 2. ILUMINACIÓN ---
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
// Configuración básica de sombras
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Grilla para referencia visual
const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333);
scene.add(gridHelper);

// --- 3. DEFINICIÓN DE COLORES Y MATERIALES ---
// Un color distintivo para cada parte
const colors = {
    base: 0x444444,     // Gris oscuro
    shoulder: 0x2196F3, // Azul
    elbow: 0xF44336,    // Rojo
    wrist: 0xFFEB3B,    // Amarillo
    fingers: 0x4CAF50   // Verde
};

// Material común para las uniones esféricas (pivotes visuales)
const jointMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });

// --- 4. FUNCIÓN AYUDANTE PARA CREAR SEGMENTOS REDONDEADOS ---
// Crea un Grupo (pivote) en 0,0,0, una esfera visual allí, y un hueso cilíndrico extendiéndose en Y.
// Retorna un objeto con el grupo pivote y el punto de anclaje al final del hueso.
function createRobotSegment(length, thickness, color) {
    const group = new THREE.Group(); // Este es el nodo de articulación (pivote local)

    // 1. La Articulación Visual (Esfera en el origen del grupo)
    const sphereGeo = new THREE.SphereGeometry(thickness * 1.3, 16, 16);
    const jointMesh = new THREE.Mesh(sphereGeo, jointMat);
    jointMesh.castShadow = true;
    jointMesh.receiveShadow = true;
    group.add(jointMesh);

    // 2. El "Hueso" (Cilindro que se extiende desde el pivote)
    const cylinderGeo = new THREE.CylinderGeometry(thickness, thickness * 0.8, length, 16);
    const boneMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5, roughness: 0.5 });
    const boneMesh = new THREE.Mesh(cylinderGeo, boneMat);
    boneMesh.castShadow = true;
    boneMesh.receiveShadow = true;
    
    // Desplazamos el cilindro hacia arriba para que su base coincida con el centro de la esfera (pivote 0,0,0)
    boneMesh.position.y = length / 2;
    group.add(boneMesh);

    // 3. Punto de Anclaje para el siguiente hijo (al final del hueso)
    const anchor = new THREE.Group();
    anchor.position.y = length;
    group.add(anchor);

    return { pivotGroup: group, anchorPoint: anchor };
}

// --- 5. CONSTRUCCIÓN DE LA JERARQUÍA ARTICULADA ---

// 1. Base (Cilindro chato, gira en Y)
const baseGroup = new THREE.Group();
scene.add(baseGroup);

const baseMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.2, 0.6, 32),
    new THREE.MeshStandardMaterial({ color: colors.base, metalness: 0.7, roughness: 0.3 })
);
baseMesh.position.y = 0.3;
baseMesh.castShadow = true;
baseMesh.receiveShadow = true;
baseGroup.add(baseMesh);

// Punto donde se conecta el hombro (encima de la base)
const shoulderMount = new THREE.Group();
shoulderMount.position.y = 0.6;
baseGroup.add(shoulderMount);


// 2. Hombro (Azul, Hijo de la base)
const shoulderLength = 4;
const shoulderSeg = createRobotSegment(shoulderLength, 0.6, colors.shoulder);
shoulderMount.add(shoulderSeg.pivotGroup);


// 3. Codo (Rojo, Hijo del hombro)
const elbowLength = 3;
const elbowSeg = createRobotSegment(elbowLength, 0.45, colors.elbow);
// Lo anclamos al final del hombro
shoulderSeg.anchorPoint.add(elbowSeg.pivotGroup);


// 4. Muñeca (Amarillo, Hijo del codo)
const wristLength = 1.8;
const wristSeg = createRobotSegment(wristLength, 0.3, colors.wrist);
// Lo anclamos al final del codo
elbowSeg.anchorPoint.add(wristSeg.pivotGroup);


// 5. Dedos (Verdes, Hijos de la muñeca)
// Geometría para los dedos (pequeños cilindros ahusados)
const fingerGeo = new THREE.CylinderGeometry(0.05, 0.12, 1, 8);
const fingerMat = new THREE.MeshStandardMaterial({ color: colors.fingers, metalness: 0.4, roughness: 0.6 });

// Dedo Izquierdo (Pivote local para rotar sobre Z)
const fingerLPivot = new THREE.Group();
fingerLPivot.position.set(-0.25, 0.1, 0); // Posición relativa al final de la muñeca
wristSeg.anchorPoint.add(fingerLPivot);

const fingerLMesh = new THREE.Mesh(fingerGeo, fingerMat);
fingerLMesh.position.y = 0.5; // Offset para que rote desde su base
fingerLMesh.castShadow = true;
fingerLMesh.receiveShadow = true;
fingerLPivot.add(fingerLMesh);

// Dedo Derecho (Pivote local para rotar sobre Z opuesto)
const fingerRPivot = new THREE.Group();
fingerRPivot.position.set(0.25, 0.1, 0); // Posición relativa al final de la muñeca
wristSeg.anchorPoint.add(fingerRPivot);

const fingerRMesh = new THREE.Mesh(fingerGeo, fingerMat);
fingerRMesh.position.y = 0.5; // Offset para que rote desde su base
fingerRMesh.castShadow = true;
fingerRMesh.receiveShadow = true;
fingerRPivot.add(fingerRMesh);


// --- 6. CONTROLES Y ZOOM SUAVE (OrbitControls) ---
const orbitControls = new OrbitControls(camera, renderer.domElement);
// 'Damping' crea la inercia para que el movimiento y zoom sean suaves y graduales
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05; // Ajuste de suavidad (menor = más lento/suave)
orbitControls.screenSpacePanning = false; // El paneo sigue el plano del suelo
orbitControls.minDistance = 5;  // Límite de zoom in
orbitControls.maxDistance = 40; // Límite de zoom out


// --- 7. INTERFAZ DE USUARIO (GUI) ---
const guiParams = {
    animacionAuto: true,
    baseRotY: 0,
    hombroRotZ: 0,
    codoRotZ: 0,
    munecaRotZ: 0,
    aperturaDedos: 0.2 // Valor inicial de apertura
};

const gui = new GUI({ title: 'Controles del Brazo' });
gui.add(guiParams, 'animacionAuto').name('Animación Automática');

const foldRot = gui.addFolder('Rotaciones Locales Manuales');
// Los sliders actúan sobre los pivotes locales, no en el origen global.
foldRot.add(guiParams, 'baseRotY', -Math.PI, Math.PI).name('Base (Eje Y)').listen();
foldRot.add(guiParams, 'hombroRotZ', -Math.PI/2, Math.PI/2).name('Hombro (Eje Z)').listen();
foldRot.add(guiParams, 'codoRotZ', -Math.PI/1.5, Math.PI/1.5).name('Codo (Eje Z)').listen();
foldRot.add(guiParams, 'munecaRotZ', -Math.PI, Math.PI).name('Muñeca (Eje Z)').listen();
// La apertura mueve los dedos en direcciones opuestas
foldRot.add(guiParams, 'aperturaDedos', -1, 1).name('Apertura Dedos').listen();


// --- 8. CICLO DE ANIMACIÓN ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // Requerido en cada frame para que el zoom/paneo suave funcione
    orbitControls.update(); 

    if (guiParams.animacionAuto) {
        const time = clock.getElapsedTime();
        
        // Animación de ciclo suave usando ondas sinusoidales con diferentes frecuencias y amplitudes
        guiParams.baseRotY = Math.sin(time * 0.4) * 1.5;
        guiParams.hombroRotZ = Math.sin(time * 0.8) * 0.6;
        guiParams.codoRotZ = Math.cos(time * 1.1) * 0.7;
        guiParams.munecaRotZ = Math.sin(time * 1.4) * 0.8;
        // Ciclo de abrir y cerrar dedos
        guiParams.aperturaDedos = 0.3 + (Math.sin(time * 2) * 0.25);
    }

    // APLICAR TRANSFORMACIONES LOCALES ENCADENADAS
    // Al rotar el padre, el hijo se mueve automáticamente manteniendo su posición local.
    baseGroup.rotation.y = guiParams.baseRotY;
    shoulderSeg.pivotGroup.rotation.z = guiParams.hombroRotZ;
    elbowSeg.pivotGroup.rotation.z = guiParams.codoRotZ;
    wristSeg.pivotGroup.rotation.z = guiParams.munecaRotZ;
    
    // Los dedos rotan en direcciones opuestas sobre su eje Z local para simular la pinza
    fingerLPivot.rotation.z = guiParams.aperturaDedos;
    fingerRPivot.rotation.z = -guiParams.aperturaDedos;

    renderer.render(scene, camera);
}

// Manejar redimensionamiento de ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Iniciar
animate();