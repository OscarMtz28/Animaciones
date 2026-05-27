// --- 1. CONFIGURACIÓN DE LA ESCENA Y RENDERER ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. CÁMARA CON ZOOM SUAVE (OrbitControls) ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Habilita el movimiento gradual e inercia
controls.dampingFactor = 0.05;
controls.minDistance = 5;      // Límite de zoom in (para no atravesar el Sol)
controls.maxDistance = 100;    // Límite de zoom out

// --- 3. ILUMINACIÓN ---
// El Sol emite luz, por lo que usamos un PointLight en el centro exacto (0,0,0)
const sunLight = new THREE.PointLight(0xffffff, 2.5, 300);
scene.add(sunLight);

// Luz ambiental tenue para que la cara oculta de los planetas no sea totalmente invisible
const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);

// --- 4. CONTROLLER DE INTERFAZ (GUI) ---
const params = {
    velocidadGlobal: 1.0
};

const gui = new lil.GUI({ title: 'Control del Sistema Solar' });
gui.add(params, 'velocidadGlobal', 0, 4).name('Velocidad Global');

// --- 5. CREACIÓN DEL SOL ---
// Escala relativa: El sol es notablemente más grande que todos los planetas
const sunGeo = new THREE.SphereGeometry(3.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); // BasicMaterial para que brille sin depender de luces externas
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);

// Contenedor para registrar todos los cuerpos celestes y sus velocidades de animación
const astros = [];

// --- 6. FUNCIÓN DE FÁBRICA PARA PLANETAS Y LUNAS ---
function crearPlaneta(radio, distancia, color, velOrbita, velRotacion, numLunas) {
    // A. El Grupo de Órbita: Está en (0,0,0) y al rotarlo hace que el planeta gire alrededor del Sol
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    // B. Contenedor del Planeta: Mantiene la posición física del planeta en su órbita
    const planetContainer = new THREE.Group();
    planetContainer.position.x = distancia;
    orbitGroup.add(planetContainer);

    // C. Malla del Planeta: Rota sobre su propio eje local de forma independiente
    const planetGeo = new THREE.SphereGeometry(radio, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8, metalness: 0.1 });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetContainer.add(planetMesh);

    // Visualización de la línea orbital de referencia
    const lineGeo = new THREE.RingGeometry(distancia - 0.04, distancia + 0.04, 64);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const orbitLine = new THREE.Mesh(lineGeo, lineMat);
    orbitLine.rotation.x = Math.PI / 2;
    scene.add(orbitLine);

    const planetaData = {
        orbitGroup: orbitGroup,
        planetMesh: planetMesh,
        velOrbita: velOrbita,
        velRotacion: velRotacion,
        lunas: []
    };

    // D. Creación de las Lunas (Anidadas en el contenedor del planeta para heredar su traslación)
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
    
    for (let i = 0; i < numLunas; i++) {
        // Grupo de órbita propio de la luna (centrado en el planeta)
        const moonOrbitGroup = new THREE.Group();
        planetContainer.add(moonOrbitGroup);

        const moonRadio = radio * 0.22; // Escala relativa: más pequeña que su planeta padre
        const moonDist = radio + 0.6 + (i * 0.5); // Separación segura del planeta

        const moonGeo = new THREE.SphereGeometry(moonRadio, 16, 16);
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.position.x = moonDist; // Desplazamiento local respecto a la articulación orbital
        moonOrbitGroup.add(moonMesh);

        planetaData.lunas.push({
            orbitGroup: moonOrbitGroup,
            mesh: moonMesh,
            velOrbita: (i + 1) * 0.04,  // Cada luna con velocidades diferentes
            velRotacion: 0.03
        });
    }

    astros.push(planetaData);
}

// --- 7. CONFIGURACIÓN DEL SISTEMA (3 Planetas con características únicas) ---
// Parámetros: crearPlaneta(radio, distancia, color, velOrbita, velRotacion, numLunas)
crearPlaneta(0.7, 8,  0x44aaff, 0.02,  0.04, 1); // Planeta Interior (Azul - 1 Luna)
crearPlaneta(1.3, 15, 0xeebd33, 0.01,  0.015, 2); // Planeta Gigante (Dorado - 2 Lunas)
crearPlaneta(0.9, 23, 0xff5533, 0.006, 0.03, 1); // Planeta Exterior (Rojizo - 1 Luna)

// --- 8. CICLO DE RENDERIZADO Y ANIMACIÓN ---
function animate() {
    requestAnimationFrame(animate);

    // Indispensable actualizar los controles en cada frame para mantener el damping suave
    controls.update();

    // Rotación intrínseca del Sol
    sunMesh.rotation.y += 0.002 * params.velocidadGlobal;

    // Procesar los movimientos independientes y encadenados de cada astro
    astros.forEach(p => {
        // Rotación del grupo pivote = Traslación orbital alrededor del Sol
        p.orbitGroup.rotation.y += p.velOrbita * params.velocidadGlobal;
        
        // Rotación en su propio eje local
        p.planetMesh.rotation.y += p.velRotacion * params.velocidadGlobal;

        // Movimientos de sus respectivas lunas
        p.lunas.forEach(l => {
            // Órbita de la luna alrededor de su respectivo planeta contenedor
            l.orbitGroup.rotation.y += l.velOrbita * params.velocidadGlobal;
            // Rotación local de la luna
            l.mesh.rotation.y += l.velRotacion * params.velocidadGlobal;
        });
    });

    renderer.render(scene, camera);
}

// Control dinámico del tamaño de la ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Inicializar la simulación
animate();