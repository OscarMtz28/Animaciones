// --- 1. CONFIGURACIÓN DE LA ESCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a24); // Fondo oscuro tipo laboratorio
scene.fog = new THREE.Fog(0x1a1a24, 15, 50);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 8, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1, 0);

// --- 2. ILUMINACIÓN ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffddaa, 1.5);
dirLight.position.set(5, 15, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// Suelo de laboratorio (rejilla)
const gridHelper = new THREE.GridHelper(30, 30, 0x00ffcc, 0x333344);
scene.add(gridHelper);

// --- 3. MATERIALES DEL ROBOT ---
const matChasis = new THREE.MeshStandardMaterial({ color: 0xA724F9, metalness: 0.8, roughness: 0.2 });
const matArticulacion = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.5 });
const matNeon = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00aa88, emissiveIntensity: 1 });

// --- 4. CONSTRUCCIÓN DE LA JERARQUÍA ---
const robotGroup = new THREE.Group();
scene.add(robotGroup);

// Nodo 1: El Tronco (Cuerpo principal)
const tronco = new THREE.Group();
const troncoMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 3.2), matChasis);
troncoMesh.castShadow = true;
tronco.add(troncoMesh);
robotGroup.add(tronco);

// Nodo 2: Cabeza (Hija del tronco)
const cabezaPivot = new THREE.Group();
cabezaPivot.position.set(0, 0.2, 1.8); // Frente y ligeramente arriba
tronco.add(cabezaPivot);

const cabezaMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1.2), matChasis);
cabezaMesh.position.z = 0.4; // Offset para que rote desde el cuello
cabezaMesh.castShadow = true;
cabezaPivot.add(cabezaMesh);

// "Ojo" luminoso del robot
const ojo = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.1), matNeon);
ojo.position.set(0, 0.1, 1.05);
cabezaPivot.add(ojo);

// Arreglo para guardar y animar las 4 patas
const patas = [];

// Función para generar una Pata (Hombro -> Muslo -> Rodilla -> Pantorrilla)
function crearPata(nombre, x, z, faseMarcha) {
    // A. Articulación del Hombro
    const hombroPivot = new THREE.Group();
    hombroPivot.position.set(x, 0, z); // Posición respecto al tronco
    tronco.add(hombroPivot);

    const hombroJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), matArticulacion);
    hombroJoint.rotation.z = Math.PI / 2;
    hombroPivot.add(hombroJoint);

    // B. Muslo (Hijo del Hombro)
    const musloLargo = 1.2;
    const musloMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, musloLargo, 0.4), matChasis);
    musloMesh.position.y = -musloLargo / 2; // Offset para que cuelgue del hombro
    musloMesh.castShadow = true;
    hombroPivot.add(musloMesh);

    // C. Articulación de la Rodilla (Hija del Hombro, anclada al final del muslo)
    const rodillaPivot = new THREE.Group();
    rodillaPivot.position.y = -musloLargo; // Al final del muslo
    hombroPivot.add(rodillaPivot);

    const rodillaJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), matArticulacion);
    rodillaJoint.rotation.z = Math.PI / 2;
    rodillaPivot.add(rodillaJoint);

    // D. Pantorrilla (Hija de la Rodilla)
    const pantorrillaLargo = 1.2;
    const pantorrillaMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, pantorrillaLargo, 0.3), matChasis);
    pantorrillaMesh.position.y = -pantorrillaLargo / 2;
    pantorrillaMesh.castShadow = true;
    rodillaPivot.add(pantorrillaMesh);

    // Guardamos la pata con su fase de marcha para la animación
    patas.push({
        hombro: hombroPivot,
        rodilla: rodillaPivot,
        fase: faseMarcha
    });
}

// Generamos las 4 patas. 
// La marcha de "trote" mueve las patas en diagonal juntas (mismos desfases).
// Front-Left y Back-Right van juntas (Fase 0).
// Front-Right y Back-Left van juntas (Fase Pi).
const ancho = 1.0;
const largo = 1.2;

crearPata("FrontLeft",  ancho,  largo,  0);
crearPata("FrontRight", -ancho, largo,  Math.PI);
crearPata("BackLeft",   ancho,  -largo, Math.PI);
crearPata("BackRight",  -ancho, -largo, 0);


// --- 5. CONTROLES (GUI) ---
const params = {
    velocidad: 5.0,
    amplitudPaso: 0.6,
    caminarCircular: true
};

const gui = new lil.GUI({ title: 'Controles Perro Robot' });
gui.add(params, 'velocidad', 0, 10).name('Velocidad de Marcha');
gui.add(params, 'amplitudPaso', 0, 1.2).name('Amplitud del Paso');
gui.add(params, 'caminarCircular').name('Modo Exploración');


// --- 6. CICLO DE ANIMACIÓN (CINEMÁTICA INVERSA "FAKE" CON SENOS) ---
const clock = new THREE.Clock();
const alturaBase = 2.5; // Altura de la cadera al suelo

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    const t = clock.getElapsedTime() * params.velocidad;
    const amp = params.amplitudPaso;

    // 1. Animación del Cuerpo (Rebota ligeramente con el trote, frecuencia doble)
    tronco.position.y = alturaBase + Math.abs(Math.sin(t)) * (amp * 0.2);
    
    // Balanceo lateral ligero
    tronco.rotation.z = Math.cos(t) * (amp * 0.05);
    
    // 2. Animación de la Cabeza (Asiente rítmicamente)
    cabezaPivot.rotation.x = Math.sin(t * 2) * 0.1;

    // 3. Animación de las Patas (El núcleo del ejercicio)
    patas.forEach(pata => {
        // Hombro: Actúa como un péndulo (onda senoidal pura)
        pata.hombro.rotation.x = Math.sin(t + pata.fase) * amp;

        // Rodilla: Solo debe flexionarse cuando la pata se mueve hacia adelante (para levantar el pie del piso).
        // Usamos Math.cos (la derivada del seno). Si el coseno es positivo, la pata va hacia adelante.
        const velocidadPata = Math.cos(t + pata.fase);
        
        // Math.max(0, ...) recorta los valores negativos. Así la rodilla está rígida al empujar hacia atrás en el suelo.
        const flexion = Math.max(0, velocidadPata); 
        pata.rodilla.rotation.x = flexion * (amp * 1.5);
    });

    // 4. Movimiento global en el escenario
    if (params.caminarCircular) {
        robotGroup.rotation.y += 0.005 * params.velocidad;
        robotGroup.position.x = Math.cos(robotGroup.rotation.y) * 6;
        robotGroup.position.z = -Math.sin(robotGroup.rotation.y) * 6;
    }

    renderer.render(scene, camera);
}

// Redimensionar pantalla
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();