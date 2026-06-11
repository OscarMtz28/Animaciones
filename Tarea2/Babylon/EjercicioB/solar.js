// Interfaz gráfica (disponible gracias al CDN)
const GUI = lil.GUI;

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Espacio negro

    // --- 1. CÁMARA (Zoom y Paneo Suave Integrado) ---
    const camera = new BABYLON.ArcRotateCamera("camera", 0, Math.PI / 3, 40, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 20; // Suavidad del zoom
    camera.inertia = 0.9;
    camera.lowerRadiusLimit = 5; // Evita meterse dentro del Sol
    camera.upperRadiusLimit = 150;

    // --- 2. ILUMINACIÓN ---
    // Luz que emana desde el centro (El Sol)
    const sunLight = new BABYLON.PointLight("sunLight", BABYLON.Vector3.Zero(), scene);
    sunLight.intensity = 2;

    // Luz tenue para que las caras oscuras de los planetas no sean totalmente negras
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.1;

    // --- 3. CREACIÓN DEL SOL ---
    // En Babylon se define el diámetro, por lo que multiplicamos el radio * 2
    const sun = BABYLON.MeshBuilder.CreateSphere("sun", {diameter: 7}, scene);
    const sunMat = new BABYLON.StandardMaterial("sunMat", scene);
    // emissiveColor hace que el objeto brille sin necesidad de luz externa
    sunMat.emissiveColor = new BABYLON.Color3(1, 0.7, 0); 
    sunMat.disableLighting = true; 
    sun.material = sunMat;

    // --- 4. CONTROLES Y ESTADO (GUI) ---
    const state = {
        velocidadGlobal: 1.0
    };
    const gui = new GUI({ title: 'Control del Sistema Solar' });
    gui.add(state, 'velocidadGlobal', 0, 4).name('Velocidad Global');

    const astros = [];

    // --- 5. FUNCIÓN DE FÁBRICA (Planetas y Lunas) ---
    function crearPlaneta(radio, distancia, colorHex, velOrbita, velRotacion, numLunas) {
        // A. Nivel 1: Pivote de Órbita (En el centro del sol)
        const orbitPivot = new BABYLON.TransformNode("orbitPivot", scene);

        // B. Nivel 2: Contenedor del Planeta (Desplazado a su distancia orbital)
        const planetContainer = new BABYLON.TransformNode("planetContainer", scene);
        planetContainer.position.x = distancia;
        planetContainer.parent = orbitPivot;

        // C. Nivel 3: Malla del Planeta (Gira sobre su propio eje)
        const planet = BABYLON.MeshBuilder.CreateSphere("planet", {diameter: radio * 2}, scene);
        const pMat = new BABYLON.StandardMaterial("pMat", scene);
        pMat.diffuseColor = BABYLON.Color3.FromHexString(colorHex);
        planet.material = pMat;
        planet.parent = planetContainer;

        // Anillo visual de la órbita (Usamos un Toroide hiper delgado)
        const orbitLine = BABYLON.MeshBuilder.CreateTorus("orbitLine", {
            diameter: distancia * 2, 
            thickness: 0.04, 
            tessellation: 64
        }, scene);
        const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
        lineMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Gris oscuro
        lineMat.disableLighting = true;
        orbitLine.material = lineMat;

        const lunasData = [];

        // D. Lunas (Hijas del contenedor del planeta)
        for (let i = 0; i < numLunas; i++) {
            // Pivote local de la luna en el centro del planeta
            const moonOrbitPivot = new BABYLON.TransformNode("moonPivot", scene);
            moonOrbitPivot.parent = planetContainer;

            const moonDist = radio + 0.6 + (i * 0.5);
            const moonRadio = radio * 0.22;

            // Malla de la luna, desplazada respecto a su pivote
            const moon = BABYLON.MeshBuilder.CreateSphere("moon", {diameter: moonRadio * 2}, scene);
            const mMat = new BABYLON.StandardMaterial("mMat", scene);
            mMat.diffuseColor = BABYLON.Color3.FromHexString("#aaaaaa");
            moon.material = mMat;
            moon.position.x = moonDist;
            moon.parent = moonOrbitPivot;

            lunasData.push({
                pivot: moonOrbitPivot,
                mesh: moon,
                velOrbita: (i + 1) * 0.04,
                velRotacion: 0.03
            });
        }

        astros.push({
            orbitPivot: orbitPivot,
            mesh: planet,
            velOrbita: velOrbita,
            velRotacion: velRotacion,
            lunas: lunasData
        });
    }

    // --- 6. POBLAR EL SISTEMA SOLAR ---
    // (radio, distancia, color, velOrbita, velRotacion, numLunas)
    crearPlaneta(0.7, 8,  "#44aaff", 0.02,  0.04, 1);  // Planeta Interior (Azul)
    crearPlaneta(1.3, 15, "#eebd33", 0.01,  0.015, 2); // Planeta Gigante (Dorado)
    crearPlaneta(0.9, 23, "#ff5533", 0.006, 0.03, 1);  // Planeta Exterior (Rojizo)

    // --- 7. BUCLE DE ANIMACIÓN ---
    scene.onBeforeRenderObservable.add(() => {
        const speed = state.velocidadGlobal;

        // Rotación del sol sobre su eje
        sun.rotation.y += 0.002 * speed;

        // Actualización jerárquica de todos los astros
        astros.forEach(p => {
            // 1. Traslación del planeta (girando su pivote en el Sol)
            p.orbitPivot.rotation.y += p.velOrbita * speed;
            // 2. Rotación local del planeta
            p.mesh.rotation.y += p.velRotacion * speed;

            // Movimiento de sus lunas anidadas
            p.lunas.forEach(l => {
                // Traslación de la luna alrededor del planeta
                l.pivot.rotation.y += l.velOrbita * speed;
                // Rotación de la luna sobre sí misma
                l.mesh.rotation.y += l.velRotacion * speed;
            });
        });
    });

    return scene;
}

const scene = createScene();

// Iniciar renderizado
engine.runRenderLoop(() => {
    scene.render();
});

// Ajuste dinámico de ventana
window.addEventListener("resize", () => {
    engine.resize();
});