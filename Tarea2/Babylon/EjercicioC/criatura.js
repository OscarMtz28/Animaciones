// La interfaz GUI está disponible globalmente a través del CDN
const GUI = lil.GUI;

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.14, 1); // Fondo oscuro tipo laboratorio

    // --- 1. CÁMARA SUAVE ---
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 3, Math.PI / 3, 15, new BABYLON.Vector3(0, 1, 0), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 20; // Zoom suave
    camera.inertia = 0.9;       // Paneo e inercia suaves

    // --- 2. ILUMINACIÓN Y SOMBRAS ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.6;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(10, 20, 10);
    dirLight.intensity = 1.0;

    const shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;

    // Suelo
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 40, height: 40}, scene);
    const groundMat = new BABYLON.StandardMaterial("gMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.2, 0.25, 0.25);
    ground.material = groundMat;
    ground.receiveShadows = true;

    // --- 3. MATERIALES ---
    const matChasis = new BABYLON.StandardMaterial("matChasis", scene);
    matChasis.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Gris oscuro
    matChasis.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);

    const matArticulacion = new BABYLON.StandardMaterial("matArticulacion", scene);
    matArticulacion.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Negro

    const matNeon = new BABYLON.StandardMaterial("matNeon", scene);
    matNeon.emissiveColor = new BABYLON.Color3(0, 0.8, 0.6); // Cyan brillante
    matNeon.disableLighting = true;

    // --- 4. CONSTRUCCIÓN DE LA JERARQUÍA DEL ROBOT ---
    const robotGlobalNode = new BABYLON.TransformNode("robotGlobal", scene);

    // Nodo 1: Tronco (Cuerpo principal)
    const troncoPivot = new BABYLON.TransformNode("troncoPivot", scene);
    troncoPivot.parent = robotGlobalNode;

    const troncoMesh = BABYLON.MeshBuilder.CreateBox("troncoMesh", {width: 1.6, height: 0.8, depth: 3.2}, scene);
    troncoMesh.material = matChasis;
    troncoMesh.parent = troncoPivot;
    shadowGen.addShadowCaster(troncoMesh);

    // Nodo 2: Cabeza (Hija del tronco)
    const cabezaPivot = new BABYLON.TransformNode("cabezaPivot", scene);
    cabezaPivot.position = new BABYLON.Vector3(0, 0.2, 1.8);
    cabezaPivot.parent = troncoPivot;

    const cabezaMesh = BABYLON.MeshBuilder.CreateBox("cabezaMesh", {width: 1.0, height: 0.6, depth: 1.2}, scene);
    cabezaMesh.position.z = 0.4; // Offset para que el cuello sea el pivote
    cabezaMesh.material = matChasis;
    cabezaMesh.parent = cabezaPivot;
    shadowGen.addShadowCaster(cabezaMesh);

    const ojo = BABYLON.MeshBuilder.CreateBox("ojo", {width: 0.8, height: 0.2, depth: 0.1}, scene);
    ojo.position = new BABYLON.Vector3(0, 0.1, 1.05);
    ojo.material = matNeon;
    ojo.parent = cabezaPivot;

    const patas = [];

    // Nodos 3 al 10: Función constructora de Patas
    function crearPata(nombre, x, z, faseMarcha) {
        // Articulación del Hombro
        const hombroPivot = new BABYLON.TransformNode(nombre + "HombroPivot", scene);
        hombroPivot.position = new BABYLON.Vector3(x, 0, z);
        hombroPivot.parent = troncoPivot;

        const hombroCilindro = BABYLON.MeshBuilder.CreateCylinder(nombre + "Hombro", {height: 0.5, diameter: 0.6}, scene);
        hombroCilindro.rotation.z = Math.PI / 2;
        hombroCilindro.material = matArticulacion;
        hombroCilindro.parent = hombroPivot;

        // Muslo (Hijo del hombro)
        const musloLargo = 1.2;
        const musloMesh = BABYLON.MeshBuilder.CreateBox(nombre + "Muslo", {width: 0.3, height: musloLargo, depth: 0.4}, scene);
        musloMesh.position.y = -musloLargo / 2;
        musloMesh.material = matChasis;
        musloMesh.parent = hombroPivot;
        shadowGen.addShadowCaster(musloMesh);

        // Articulación de la Rodilla (Hija del hombro)
        const rodillaPivot = new BABYLON.TransformNode(nombre + "RodillaPivot", scene);
        rodillaPivot.position.y = -musloLargo;
        rodillaPivot.parent = hombroPivot;

        const rodillaCilindro = BABYLON.MeshBuilder.CreateCylinder(nombre + "Rodilla", {height: 0.4, diameter: 0.5}, scene);
        rodillaCilindro.rotation.z = Math.PI / 2;
        rodillaCilindro.material = matArticulacion;
        rodillaCilindro.parent = rodillaPivot;

        // Pantorrilla (Hija de la rodilla)
        const pantorrillaLargo = 1.2;
        const pantorrillaMesh = BABYLON.MeshBuilder.CreateBox(nombre + "Pantorrilla", {width: 0.2, height: pantorrillaLargo, depth: 0.3}, scene);
        pantorrillaMesh.position.y = -pantorrillaLargo / 2;
        pantorrillaMesh.material = matChasis;
        pantorrillaMesh.parent = rodillaPivot;
        shadowGen.addShadowCaster(pantorrillaMesh);

        patas.push({ hombro: hombroPivot, rodilla: rodillaPivot, fase: faseMarcha });
    }

    // Configuración del trote cruzado (fases opuestas en diagonal)
    const ancho = 1.0;
    const largo = 1.2;
    crearPata("FrontLeft",  ancho,  largo,  0);
    crearPata("FrontRight", -ancho, largo,  Math.PI);
    crearPata("BackLeft",   ancho,  -largo, Math.PI);
    crearPata("BackRight",  -ancho, -largo, 0);

    return { scene, robotGlobalNode, troncoPivot, cabezaPivot, patas };
}

const { scene, robotGlobalNode, troncoPivot, cabezaPivot, patas } = createScene();

// --- 5. INTERFAZ DE CONTROLES (GUI) ---
const state = {
    velocidad: 5.0,
    amplitudPaso: 0.6,
    caminarCircular: true
};

const gui = new GUI({ title: 'Controles Perro Robot' });
gui.add(state, 'velocidad', 0, 10).name('Velocidad de Marcha');
gui.add(state, 'amplitudPaso', 0, 1.2).name('Amplitud del Paso');
gui.add(state, 'caminarCircular').name('Modo Exploración');

// --- 6. CICLO DE ANIMACIÓN (CINEMÁTICA INVERSA "FAKE" CON ONDAS) ---
let time = 0;
const alturaBase = 2.5; // Altura de la cadera

scene.onBeforeRenderObservable.add(() => {
    // Acumular tiempo considerando los fotogramas del motor
    time += (engine.getDeltaTime() * 0.001) * state.velocidad;
    const amp = state.amplitudPaso;

    // 1. Animación del Cuerpo (Rebota el doble de rápido que los pasos)
    troncoPivot.position.y = alturaBase + Math.abs(Math.sin(time)) * (amp * 0.2);
    // Balanceo lateral
    troncoPivot.rotation.z = Math.cos(time) * (amp * 0.05);

    // 2. Animación de la Cabeza (Estabilizador natural)
    cabezaPivot.rotation.x = Math.sin(time * 2) * 0.1;

    // 3. Cinemática de las Patas
    patas.forEach(pata => {
        // Hombro: Péndulo simple hacia adelante y atrás
        pata.hombro.rotation.x = Math.sin(time + pata.fase) * amp;

        // Rodilla: Solo se flexiona cuando el hombro se mueve hacia el frente.
        // La derivada del seno es el coseno. Usamos max(0, ...) para ignorar cuando empuja el suelo.
        const velocidadPata = Math.cos(time + pata.fase);
        const flexion = Math.max(0, velocidadPata);
        pata.rodilla.rotation.x = flexion * (amp * 1.5);
    });

    // 4. Traslación del Robot completo
    if (state.caminarCircular) {
        // Calculamos un ángulo basado en el tiempo
        let angulo = time * 0.5; 
        
        // Lo movemos en círculo (ahora usando +Z en lugar de -Z)
        robotGlobalNode.position.x = Math.cos(angulo) * 6;
        robotGlobalNode.position.z = Math.sin(angulo) * 6;
        
        // Rotamos el robot en el eje negativo para que siempre mire al frente de su trayectoria
        robotGlobalNode.rotation.y = -angulo;
    }
});

// Iniciar renderizado
engine.runRenderLoop(() => {
    scene.render();
});

// Ajuste dinámico de ventana
window.addEventListener("resize", () => {
    engine.resize();
});