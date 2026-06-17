// Babylon.js - Parte A: CPU Instancing Animation
const canvas = document.getElementById("renderCanvas");
const fpsValueEl = document.getElementById('fps-value');
const fpsChartEl = document.getElementById('fps-chart');

// UI Controls
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const scaleSlider = document.getElementById('scale-slider');
const scaleLabel = document.getElementById('scale-label');
const btnTogglePlay = document.getElementById('btn-toggle-play');

let isPlaying = true;
let animSpeed = 1.0;
let instanceScale = 1.0;

// Initialize engine and scene
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.047, 0.04, 0.035, 1.0); // matches stone-950 dark tone
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogColor = new BABYLON.Color3(0.047, 0.04, 0.035);
scene.fogDensity = 0.015;

// Camera
const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 70, new BABYLON.Vector3(0, 5, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 10;
camera.upperRadiusLimit = 200;
camera.maxBeta = Math.PI / 2 + 0.1;

// Lights
const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
light1.intensity = 0.35;
light1.diffuse = new BABYLON.Color3(1, 1, 1);

const dirLight1 = new BABYLON.DirectionalLight("dirLight1", new BABYLON.Vector3(-1, -2, -1), scene);
dirLight1.position = new BABYLON.Vector3(50, 100, 50);
dirLight1.intensity = 1.5;
dirLight1.diffuse = new BABYLON.Color3(0.97, 0.45, 0.09); // Orange light glow

const dirLight2 = new BABYLON.DirectionalLight("dirLight2", new BABYLON.Vector3(1, 1, 1), scene);
dirLight2.position = new BABYLON.Vector3(-50, -20, -50);
dirLight2.intensity = 0.8;
dirLight2.diffuse = new BABYLON.Color3(0.6, 0.3, 0.9); // Purple secondary light

// Grid floor helper
const grid = BABYLON.MeshBuilder.CreateGround("grid", { width: 200, height: 200, subdivisions: 50 }, scene);
grid.position.y = -10;
const gridMaterial = new BABYLON.StandardMaterial("gridMat", scene);
gridMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
gridMaterial.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
gridMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.06);
gridMaterial.wireframe = true;
grid.material = gridMaterial;

// Generate Custom Manta Ray source mesh
const segments = 10;
const customMesh = new BABYLON.Mesh("mantaRaySource", scene);

const positions = [];
const colors = [];
const indices = [];

for (let j = 0; j <= segments; j++) {
    const z = (j / segments) * 2 - 1; // -1 to 1 (Z axis)
    for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * 2 - 1; // -1 to 1 (X axis)

        let wingScale = 1.0;
        if (z < 0) {
            wingScale = 1.0 + z * 0.8;
        } else if (z > 0.6) {
            wingScale = 1.0 - (z - 0.6) * 1.5;
        }
        wingScale = Math.max(0.05, wingScale);

        const posX = x * wingScale * 1.5;
        const posY = 0;
        const posZ = z * 2.0;

        positions.push(posX, posY, posZ);

        // Gradient based on wings distance (orange-yellow core to violet wingtips)
        const xAbs = Math.abs(x);
        const r = 0.9;
        const g = 0.3 + (1.0 - xAbs) * 0.5;
        const b = xAbs * 0.8;
        colors.push(r, g, b, 1.0); // RGBA in Babylon
    }
}

for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
        const a = j * (segments + 1) + i;
        const b = j * (segments + 1) + i + 1;
        const c = (j + 1) * (segments + 1) + i;
        const d = (j + 1) * (segments + 1) + i + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
    }
}

const vertexData = new BABYLON.VertexData();
vertexData.positions = positions;
vertexData.indices = indices;
vertexData.colors = colors;

// Calculate normals for lighting
const normals = [];
BABYLON.VertexData.ComputeNormals(positions, indices, normals);
vertexData.normals = normals;

vertexData.applyToMesh(customMesh);

const material = new BABYLON.StandardMaterial("mantaMaterial", scene);
material.backFaceCulling = false; // Double-sided
material.roughness = 0.3;
material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
material.useVertexColors = true; // Use vertex color gradient
customMesh.material = material;
customMesh.isVisible = false; // hide the source mesh

// Create 500 instances
const count = 500;
const instances = [];
const instanceData = [];

for (let i = 0; i < count; i++) {
    const instance = customMesh.createInstance("manta_instance_" + i);
    instances.push(instance);

    // Initial swarm flight data
    instanceData.push({
        radius: 15 + Math.random() * 45,
        angle: Math.random() * Math.PI * 2,
        speed: (0.1 + Math.random() * 0.4) * 0.05,
        yOffset: -5 + Math.random() * 25,
        yFreq: 0.5 + Math.random() * 1.5,
        yAmp: 2 + Math.random() * 6,
        rollSpeed: 0.5 + Math.random() * 1.0,
        rollOffset: Math.random() * Math.PI,
        scaleMult: 0.6 + Math.random() * 0.8
    });
}

// UI events
speedSlider.addEventListener('input', (e) => {
    animSpeed = parseFloat(e.target.value);
    speedLabel.textContent = animSpeed.toFixed(1) + 'x';
});

scaleSlider.addEventListener('input', (e) => {
    instanceScale = parseFloat(e.target.value);
    scaleLabel.textContent = instanceScale.toFixed(1);
});

btnTogglePlay.addEventListener('click', () => {
    isPlaying = !isPlaying;
    btnTogglePlay.textContent = isPlaying ? 'Pausar Animación' : 'Reanudar Animación';
    if (!isPlaying) {
        btnTogglePlay.style.background = 'linear-gradient(135deg, var(--success), #059669)';
    } else {
        btnTogglePlay.style.background = 'linear-gradient(135deg, var(--accent-color), #ea580c)';
    }
});

// FPS monitor updates
let lastFpsTime = performance.now();
let fpsCount = 0;

function updateFPSChart(fpsVal) {
    const bar = document.createElement('div');
    bar.className = 'fps-bar';
    bar.style.height = Math.min((fpsVal / 60) * 100, 100) + '%';
    if (fpsVal >= 45) bar.style.backgroundColor = 'var(--success)';
    else if (fpsVal >= 30) bar.style.backgroundColor = 'var(--warning)';
    else bar.style.backgroundColor = 'var(--danger)';

    fpsChartEl.appendChild(bar);
    if (fpsChartEl.children.length > 20) {
        fpsChartEl.removeChild(fpsChartEl.firstChild);
    }
}

// Main Render Loop
let time = 0;
engine.runRenderLoop(() => {
    if (isPlaying) {
        time += 0.016 * animSpeed;

        for (let i = 0; i < count; i++) {
            const instance = instances[i];
            const data = instanceData[i];

            // 1. Position calculation
            data.angle += data.speed * animSpeed;
            const x = Math.cos(data.angle) * data.radius;
            const z = Math.sin(data.angle) * data.radius;
            const y = data.yOffset + Math.sin(time * data.yFreq + i) * data.yAmp;

            instance.position.set(x, y, z);

            // 2. Rotation calculation (Facing direction and rolling)
            const tx = -Math.sin(data.angle);
            const tz = Math.cos(data.angle);
            const yaw = Math.atan2(tx, tz);
            const pitch = Math.cos(time * data.yFreq + i) * 0.15;
            const roll = Math.sin(time * data.rollSpeed + data.rollOffset) * 0.25;

            instance.rotation.set(pitch, yaw, roll);

            // 3. Scaling calculation
            const sc = data.scaleMult * instanceScale;
            instance.scaling.set(sc, sc, sc);
        }
    }

    scene.render();

    // FPS update
    fpsCount++;
    const now = performance.now();
    if (now >= lastFpsTime + 1000) {
        const currentFps = Math.round((fpsCount * 1000) / (now - lastFpsTime));
        fpsValueEl.textContent = currentFps + ' FPS';

        if (currentFps >= 45) {
            fpsValueEl.style.color = 'var(--success)';
        } else if (currentFps >= 30) {
            fpsValueEl.style.color = 'var(--warning)';
        } else {
            fpsValueEl.style.color = 'var(--danger)';
        }

        updateFPSChart(currentFps);

        fpsCount = 0;
        lastFpsTime = now;
    }
});

// Resize handler
window.addEventListener("resize", () => {
    engine.resize();
});
