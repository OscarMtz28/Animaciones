
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const createScene = function () {
    const scene = new BABYLON.Scene(engine);

    scene.clearColor = new BABYLON.Color4(0, 0.588, 0.780, 1);

    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 15, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 30;

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6;

    // DirectionalLight: Luz para generar las sombras
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(2, 10, 5);
    dirLight.intensity = 1;

    // Motor de Sombras
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    // Materiales
    const matToon = new BABYLON.CellMaterial("toon", scene);
    matToon.diffuseColor =  new BABYLON.Color3(0, 0.8, 0.62);
    
    const matMetal = new BABYLON.PBRMaterial("MatMetal", scene);
    matMetal.metallic = 0.5;
    matMetal.roughness = 0.5;
    matMetal.albedoColor = new BABYLON.Color3(0, 0, 1); // Azul

    const neon = new BABYLON.StandardMaterial("neon", scene);
    neon.emissiveColor = new BABYLON.Color3(0.8, 0, 1);
    neon.intensity = 1;

    const matAzul = new BABYLON.StandardMaterial("matAzul", scene);
    matAzul.diffuseColor = new BABYLON.Color3(0, 0.66, 1);
    matAzul.specularColor = new BABYLON.Color3(1, 1, 1);




    const matSuelo = new BABYLON.StandardMaterial("matSuelo", scene);
    matSuelo.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    



    // Geometrías
    const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: 30, height: 10 }, scene);
    floor.material = matSuelo;
    floor.receiveShadows = true;

    const box = BABYLON.MeshBuilder.CreateBox("box", { size: 3 }, scene);
    box.position = new BABYLON.Vector3(-6, 2.5, 0);
    box.material = matToon;
    shadowGenerator.addShadowCaster(box);


    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 3, segments: 32 }, scene);
    sphere.position = new BABYLON.Vector3(-1, 2.5, 0);
    sphere.material = matMetal;
    shadowGenerator.addShadowCaster(sphere);

    const cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", { height: 3, diameter: 2 }, scene);
    cylinder.position = new BABYLON.Vector3(3, 2.5, 0);
    cylinder.material = matAzul;
    shadowGenerator.addShadowCaster(cylinder);

    const torus = BABYLON.MeshBuilder.CreateTorus("torus", { diameter: 2, thickness: 0.4, tessellation: 64 }, scene);
    torus.position = new BABYLON.Vector3(7, 1.5, 0);
    torus.material = neon;
    shadowGenerator.addShadowCaster(torus);

    // Loop de Animación
    scene.registerBeforeRender(() => {
        box.rotation.y += 0.01;
        torus.rotation.x += 0.02;
        torus.rotation.y -= 0.02;


    });

    return scene;
};

// Instanciamos la escena
const scene = createScene();

// Render Loop
engine.runRenderLoop(() => {
    scene.render();
});

// Resize
window.addEventListener("resize", () => {
    engine.resize();
});