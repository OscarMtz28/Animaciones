// La interfaz gráfica está disponible globalmente como lil.GUI gracias al CDN en el HTML
const GUI = lil.GUI;

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.07, 0.07, 0.07, 1);

    // --- CÁMARA (Zoom y Paneo Suave) ---
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 22, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 30; // Controla la suavidad del zoom
    camera.inertia = 0.9;       // Amortiguación para rotación y paneo
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 40;

    // --- ILUMINACIÓN Y SOMBRAS ---
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.5;

    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(20, 40, 20);
    dirLight.intensity = 0.8;

    const shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;

    // --- SUELO ---
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 25, height: 25}, scene);
    const standardGroundMat = new BABYLON.StandardMaterial("gMat", scene);
    standardGroundMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    ground.material = standardGroundMat;
    ground.receiveShadows = true;

    // --- FUNCIÓN PARA CREAR SEGMENTOS ---
    function createSegment(name, length, thickness, hexColor) {
        const pivot = new BABYLON.TransformNode(name + "Pivot", scene);

        const joint = BABYLON.MeshBuilder.CreateSphere(name + "Joint", {diameter: thickness * 1.3}, scene);
        const jointMat = new BABYLON.StandardMaterial(name + "JointMat", scene);
        jointMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        jointMat.metallic = 0.8;
        joint.material = jointMat;
        joint.parent = pivot;
        shadowGen.addShadowCaster(joint);

        const bone = BABYLON.MeshBuilder.CreateCylinder(name + "Bone", {height: length, diameterTop: thickness * 0.8, diameterBottom: thickness}, scene);
        const boneMat = new BABYLON.StandardMaterial(name + "BoneMat", scene);
        boneMat.diffuseColor = BABYLON.Color3.FromHexString(hexColor);
        bone.material = boneMat;
        bone.position.y = length / 2;
        bone.parent = pivot;
        shadowGen.addShadowCaster(bone);

        const anchor = new BABYLON.TransformNode(name + "Anchor", scene);
        anchor.position.y = length;
        anchor.parent = pivot;

        return { pivot, anchor };
    }

    // --- CONSTRUCCIÓN DE LA JERARQUÍA ---
    const basePivot = new BABYLON.TransformNode("basePivot", scene);
    const baseMesh = BABYLON.MeshBuilder.CreateCylinder("baseMesh", {height: 0.6, diameterTop: 4.4, diameterBottom: 4}, scene);
    const baseMat = new BABYLON.StandardMaterial("baseMat", scene);
    baseMat.diffuseColor = BABYLON.Color3.FromHexString("#444444");
    baseMesh.material = baseMat;
    baseMesh.position.y = 0.3;
    baseMesh.parent = basePivot;
    shadowGen.addShadowCaster(baseMesh);

    const shoulderMount = new BABYLON.TransformNode("shoulderMount", scene);
    shoulderMount.position.y = 0.6;
    shoulderMount.parent = basePivot;

    const shoulderSeg = createSegment("shoulder", 4, 1.2, "#2196F3"); // Azul
    shoulderSeg.pivot.parent = shoulderMount;

    const elbowSeg = createSegment("elbow", 3, 0.9, "#F44336"); // Rojo
    elbowSeg.pivot.parent = shoulderSeg.anchor;

    const wristSeg = createSegment("wrist", 1.8, 0.6, "#FFEB3B"); // Amarillo
    wristSeg.pivot.parent = elbowSeg.anchor;

    const fingerMat = new BABYLON.StandardMaterial("fingerMat", scene);
    fingerMat.diffuseColor = BABYLON.Color3.FromHexString("#4CAF50"); // Verde

    function createFinger(name, offsetX) {
        const fingerPivot = new BABYLON.TransformNode(name + "Pivot", scene);
        fingerPivot.position.x = offsetX;
        fingerPivot.position.y = 0.2;
        fingerPivot.parent = wristSeg.anchor;

        const fingerMesh = BABYLON.MeshBuilder.CreateCylinder(name + "Mesh", {height: 1, diameterTop: 0.1, diameterBottom: 0.24}, scene);
        fingerMesh.material = fingerMat;
        fingerMesh.position.y = 0.5;
        fingerMesh.parent = fingerPivot;
        shadowGen.addShadowCaster(fingerMesh);

        return fingerPivot;
    }

    const fingerL = createFinger("fingerL", -0.4);
    const fingerR = createFinger("fingerR", 0.4);

    return { scene, basePivot, shoulderPivot: shoulderSeg.pivot, elbowPivot: elbowSeg.pivot, wristPivot: wristSeg.pivot, fingerL, fingerR };
}

const { scene, basePivot, shoulderPivot, elbowPivot, wristPivot, fingerL, fingerR } = createScene();

// --- INTERFAZ Y LÓGICA DE ANIMACIÓN ---
const state = {
    animacionAuto: true,
    baseRotY: 0,
    hombroRotZ: 0,
    codoRotZ: 0,
    munecaRotZ: 0,
    aperturaDedos: 0.2
};

const gui = new GUI({ title: 'Controles Babylon.js' });
gui.add(state, 'animacionAuto').name('Animación Automática');
const fold = gui.addFolder('Rotaciones Manuales');
fold.add(state, 'baseRotY', -Math.PI, Math.PI).name('Base (Y)').listen();
fold.add(state, 'hombroRotZ', -Math.PI/2, Math.PI/2).name('Hombro (Z)').listen();
fold.add(state, 'codoRotZ', -Math.PI/1.5, Math.PI/1.5).name('Codo (Z)').listen();
fold.add(state, 'munecaRotZ', -Math.PI, Math.PI).name('Muñeca (Z)').listen();
fold.add(state, 'aperturaDedos', 0, 0.6).name('Apertura Dedos').listen();

let time = 0;

scene.onBeforeRenderObservable.add(() => {
    if (state.animacionAuto) {
        time += engine.getDeltaTime() * 0.001; 
        
        state.baseRotY = Math.sin(time * 0.4) * 1.5;
        state.hombroRotZ = Math.sin(time * 0.8) * 0.6;
        state.codoRotZ = Math.cos(time * 1.1) * 0.7;
        state.munecaRotZ = Math.sin(time * 1.4) * 0.8;
        state.aperturaDedos = 0.3 + (Math.sin(time * 2) * 0.25);
    }

    basePivot.rotation.y = state.baseRotY;
    shoulderPivot.rotation.z = state.hombroRotZ;
    elbowPivot.rotation.z = state.codoRotZ;
    wristPivot.rotation.z = state.munecaRotZ;
    
    fingerL.rotation.z = state.aperturaDedos;
    fingerR.rotation.z = -state.aperturaDedos;
});

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});