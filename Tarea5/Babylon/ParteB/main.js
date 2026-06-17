// Babylon.js - Parte B: Vertex Animation Texture (VAT) Instancing
const canvas = document.getElementById("renderCanvas");
const fpsValueEl = document.getElementById('fps-value');
const drawCallsEl = document.getElementById('draw-calls');
const fpsChartEl = document.getElementById('fps-chart');

// UI Controls
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const amplitudeSlider = document.getElementById('amplitude-slider');
const amplitudeLabel = document.getElementById('amplitude-label');
const btnTogglePlay = document.getElementById('btn-toggle-play');

let isPlaying = true;
let animSpeed = 1.0;
let amplitude = 0.3;
const count = 500;
const numFrames = 60;
const fpsVal = 30; // Baked animation speed

// Initialize engine and scene
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.04, 0.035, 0.047, 1.0); // subtle dark purple/gray tone
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogColor = new BABYLON.Color3(0.04, 0.035, 0.047);
scene.fogDensity = 0.012;

// Camera
const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 75, new BABYLON.Vector3(0, 10, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 10;
camera.upperRadiusLimit = 200;
camera.maxBeta = Math.PI / 2 + 0.1;

// Lights
const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
light1.intensity = 0.2;
light1.diffuse = new BABYLON.Color3(1, 1, 1);

const dirLight1 = new BABYLON.DirectionalLight("dirLight1", new BABYLON.Vector3(-1, -2, -1), scene);
dirLight1.position = new BABYLON.Vector3(50, 100, 50);
dirLight1.intensity = 1.4;
dirLight1.diffuse = new BABYLON.Color3(0.66, 0.33, 1.0); // Purple glow light

const dirLight2 = new BABYLON.DirectionalLight("dirLight2", new BABYLON.Vector3(1, 1, 1), scene);
dirLight2.position = new BABYLON.Vector3(-50, -20, -50);
dirLight2.intensity = 0.8;
dirLight2.diffuse = new BABYLON.Color3(0.09, 0.71, 0.97); // Cyan secondary light

// Grid floor helper
const grid = BABYLON.MeshBuilder.CreateGround("grid", { width: 200, height: 200, subdivisions: 50 }, scene);
grid.position.y = -15;
const gridMaterial = new BABYLON.StandardMaterial("gridMat", scene);
gridMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05);
gridMaterial.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
gridMaterial.emissiveColor = new BABYLON.Color3(0.08, 0.06, 0.1);
gridMaterial.wireframe = true;
grid.material = gridMaterial;

// 1. Generate base Manta Ray geometry data
const segments = 10;
const positions = [];
const colors = [];
const indices = [];

for (let j = 0; j <= segments; j++) {
    const z = (j / segments) * 2 - 1; // -1 to 1
    for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * 2 - 1; // -1 to 1

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

        // Gradient based on wings distance (magenta to cyan wingtips)
        const xAbs = Math.abs(x);
        const r = xAbs * 0.8 + 0.1;
        const g = 0.1 + (1.0 - xAbs) * 0.3;
        const b = 0.95;
        colors.push(r, g, b, 1.0);
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

const numVertices = positions.length / 3;

// Create source Mesh
const customMesh = new BABYLON.Mesh("mantaRaySource", scene);
const vertexData = new BABYLON.VertexData();
vertexData.positions = positions;
vertexData.indices = indices;
vertexData.colors = colors;

// Add custom per-vertex attribute: aVertexIndex
const vertexIndices = new Float32Array(numVertices);
for (let i = 0; i < numVertices; i++) {
    vertexIndices[i] = i;
}
vertexData.applyToMesh(customMesh);
customMesh.setVerticesData("aVertexIndex", vertexIndices, false, 1);

// 2. Bake Animation into Float32 raw texture data
const textureData = new Float32Array(numVertices * numFrames * 4); // RGBA

for (let f = 0; f < numFrames; f++) {
    const angle = (f / numFrames) * Math.PI * 2;

    for (let v = 0; v < numVertices; v++) {
        const vx = positions[v * 3];
        const vy = positions[v * 3 + 1];
        const vz = positions[v * 3 + 2];

        // Flapping motion equation matching ThreeJS
        const xAbs = Math.abs(vx);
        const flapOffset = xAbs * 0.3 * Math.sin(angle - xAbs * 1.5);

        const pixelIndex = (f * numVertices + v) * 4;
        textureData[pixelIndex] = vx;
        textureData[pixelIndex + 1] = vy + flapOffset;
        textureData[pixelIndex + 2] = vz;
        textureData[pixelIndex + 3] = 1.0;
    }
}

const animTexture = BABYLON.RawTexture.CreateRGBATexture(
    textureData,
    numVertices,
    numFrames,
    scene,
    false,
    false,
    BABYLON.Texture.NEAREST_SAMPLINGMODE,
    BABYLON.Engine.TEXTURETYPE_FLOAT
);

// 3. Define Custom Shaders in Babylon ShadersStore
BABYLON.Effect.ShadersStore["vatVertexShader"] = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec4 color;
    attribute float aVertexIndex;
    attribute float aInstanceOffset;

    // Uniforms
    uniform mat4 view;
    uniform mat4 viewProjection;
    uniform sampler2D uAnimationTexture;
    uniform float uNumVertices;
    uniform float uNumFrames;
    uniform float uTime;
    uniform float uFPS;
    uniform float uSpeed;
    uniform float uAmplitude;

    // Varyings
    varying vec4 vColor;
    varying vec3 vViewPosition;

    #include<instancesDeclaration>

    void main(void) {
        vColor = color;
        
        #include<instancesVertex>
        
        // Calculate GPU animation frame with instance offset
        float frameIndex = mod(uTime * uFPS * uSpeed + aInstanceOffset, uNumFrames);
        
        // Texture UV coordinates
        float u = (aVertexIndex + 0.5) / uNumVertices;
        float v = (floor(frameIndex) + 0.5) / uNumFrames;
        
        // Sample baked position
        vec4 sampledPos = texture2D(uAnimationTexture, vec2(u, v));
        
        // Scale amplitude
        float amplitudeScale = uAmplitude / 0.3;
        float deltaY = (sampledPos.y - position.y) * amplitudeScale;
        vec3 finalPos = vec3(sampledPos.x, position.y + deltaY, sampledPos.z);
        
        // Transform by instanced matrix and projection
        vec4 worldPos = finalWorld * vec4(finalPos, 1.0);
        gl_Position = viewProjection * worldPos;
        
        // Compute view position for flat normal derivatives
        vec4 viewPos = view * worldPos;
        vViewPosition = viewPos.xyz;
    }
`;

BABYLON.Effect.ShadersStore["vatFragmentShader"] = `
    precision highp float;

    varying vec4 vColor;
    varying vec3 vViewPosition;

    void main(void) {
        // Calculate flat normal on-the-fly
        vec3 fdx = dFdx(vViewPosition);
        vec3 fdy = dFdy(vViewPosition);
        vec3 normal = normalize(cross(fdx, fdy));
        
        // Simple directional lighting
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
        float dotNL = max(dot(normal, lightDir), 0.0);
        
        // Orange neon glow rim light
        vec3 viewDir = normalize(vViewPosition);
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        vec3 rimColor = vec3(0.97, 0.45, 0.09) * pow(rim, 3.5) * 0.4;

        vec3 finalColor = vColor.rgb * (dotNL * 0.7 + 0.3) + rimColor;
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Create ShaderMaterial
const shaderMaterial = new BABYLON.ShaderMaterial(
    "vatMaterial",
    scene,
    {
        vertex: "vat",
        fragment: "vat"
    },
    {
        attributes: ["position", "color", "aVertexIndex", "aInstanceOffset"],
        uniforms: ["world", "view", "viewProjection", "uAnimationTexture", "uNumVertices", "uNumFrames", "uTime", "uFPS", "uSpeed", "uAmplitude"]
    }
);

shaderMaterial.backFaceCulling = false;
shaderMaterial.setTexture("uAnimationTexture", animTexture);
shaderMaterial.setFloat("uNumVertices", numVertices);
shaderMaterial.setFloat("uNumFrames", numFrames);
shaderMaterial.setFloat("uFPS", fpsVal);
shaderMaterial.setFloat("uSpeed", animSpeed);
shaderMaterial.setFloat("uAmplitude", amplitude);

customMesh.material = shaderMaterial;
customMesh.isVisible = false; // hide source

// 4. Register custom instanced buffer for aInstanceOffset
customMesh.registerInstancedBuffer("aInstanceOffset", 1);

// Parent node to rotate the entire helical vortex structure in 1 call on GPU
const parentNode = new BABYLON.TransformNode("vortexParent", scene);

// Create 500 instances in double-helix
for (let i = 0; i < count; i++) {
    const instance = customMesh.createInstance("manta_instance_" + i);
    instance.parent = parentNode;

    // Set time-offset attribute for the instance
    instance.instancedBuffers.aInstanceOffset = Math.random() * numFrames;

    // Compute spiral arrangement
    const t = i / count;
    const angle = t * Math.PI * 14;
    const radius = 10 + t * 35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = -10 + t * 45;

    instance.position.set(x, y, z);

    // Compute rotation facing out of helix
    const tangentX = -Math.sin(angle);
    const tangentZ = Math.cos(angle);
    const yaw = Math.atan2(tangentX, tangentZ) + Math.PI / 2;
    const pitch = 0.2;
    const roll = -0.3;
    instance.rotation.set(pitch, yaw, roll);

    // Scaling
    const sc = (0.5 + t * 0.7);
    instance.scaling.set(sc, sc, sc);
}

// UI controls
speedSlider.addEventListener('input', (e) => {
    animSpeed = parseFloat(e.target.value);
    speedLabel.textContent = animSpeed.toFixed(1) + 'x';
    shaderMaterial.setFloat("uSpeed", animSpeed);
});

amplitudeSlider.addEventListener('input', (e) => {
    amplitude = parseFloat(e.target.value);
    amplitudeLabel.textContent = amplitude.toFixed(2);
    shaderMaterial.setFloat("uAmplitude", amplitude);
});

btnTogglePlay.addEventListener('click', () => {
    isPlaying = !isPlaying;
    btnTogglePlay.textContent = isPlaying ? 'Pausar Animación' : 'Reanudar Animación';
    if (!isPlaying) {
        btnTogglePlay.style.background = 'linear-gradient(135deg, var(--success), #059669)';
        shaderMaterial.setFloat("uSpeed", 0.0);
    } else {
        btnTogglePlay.style.background = 'linear-gradient(135deg, var(--accent-color), #ea580c)';
        shaderMaterial.setFloat("uSpeed", animSpeed);
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
        time += 0.016;
        shaderMaterial.setFloat("uTime", time);
        // Rotate entire group slowly
        parentNode.rotation.y = time * 0.03;
    }

    scene.render();

    // Stats
    drawCallsEl.textContent = engine.drawCalls;

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
