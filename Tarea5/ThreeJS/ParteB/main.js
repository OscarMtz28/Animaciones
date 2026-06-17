// Three.js - Parte B: Vertex Animation Texture (VAT) Instancing
let scene, camera, renderer, controls;
let instancedMesh;
const count = 500;
const numFrames = 60;
const fpsVal = 30; // Baked animation speed

// Animation controls
let isPlaying = true;
let animSpeed = 1.0;
let amplitude = 0.3;

// Stats elements
let lastTime = performance.now();
let frameCount = 0;
const fpsValueEl = document.getElementById('fps-value');
const drawCallsEl = document.getElementById('draw-calls');
const fpsChartEl = document.getElementById('fps-chart');

// UI Controls
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const amplitudeSlider = document.getElementById('amplitude-slider');
const amplitudeLabel = document.getElementById('amplitude-label');
const btnTogglePlay = document.getElementById('btn-toggle-play');

init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.012);

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 35, 75);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xa855f7, 1.2); // Purple primary
    dirLight1.position.set(50, 100, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 0.8); // Cyan secondary
    dirLight2.position.set(-50, -20, -50);
    scene.add(dirLight2);

    // Dark grid helper
    const gridHelper = new THREE.GridHelper(200, 50, 0x334155, 0x0f172a);
    gridHelper.position.y = -15;
    scene.add(gridHelper);

    // 1. Generate base Manta Ray geometry
    const segments = 10;
    const verticesList = [];
    const colorsList = [];
    const indicesList = [];

    for (let j = 0; j <= segments; j++) {
        const z = (j / segments) * 2 - 1; // -1 to 1
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * 2 - 1; // -1 to 1

            // Apply wing taper profile
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

            verticesList.push(posX, posY, posZ);

            // Purple to Cyan gradient
            const xAbs = Math.abs(x);
            const r = xAbs * 0.7 + 0.2;
            const g = 0.1 + (1.0 - xAbs) * 0.4;
            const b = 0.9;
            colorsList.push(r, g, b);
        }
    }

    for (let j = 0; j < segments; j++) {
        for (let i = 0; i < segments; i++) {
            const a = j * (segments + 1) + i;
            const b = j * (segments + 1) + i + 1;
            const c = (j + 1) * (segments + 1) + i;
            const d = (j + 1) * (segments + 1) + i + 1;

            indicesList.push(a, b, c);
            indicesList.push(b, d, c);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verticesList, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsList, 3));
    geometry.setIndex(indicesList);

    const numVertices = verticesList.length / 3;

    // 2. Add vertex index attribute for texture coordinate lookup in shader
    const vertexIndices = new Float32Array(numVertices);
    for (let i = 0; i < numVertices; i++) {
        vertexIndices[i] = i;
    }
    geometry.setAttribute('aVertexIndex', new THREE.BufferAttribute(vertexIndices, 1));

    // 3. Bake the Animation into a Float32 DataTexture
    // Texture width = numVertices, Height = numFrames
    const textureData = new Float32Array(numVertices * numFrames * 4); // RGBA format

    for (let f = 0; f < numFrames; f++) {
        const angle = (f / numFrames) * Math.PI * 2;

        for (let v = 0; v < numVertices; v++) {
            const vx = verticesList[v * 3];
            const vy = verticesList[v * 3 + 1];
            const vz = verticesList[v * 3 + 2];

            // Flapping wave motion equation:
            // Center spine (x = 0) stays stable, wingtips (x = ±1.5) flap with wave offset
            const xAbs = Math.abs(vx);
            const flapOffset = xAbs * 0.3 * Math.sin(angle - xAbs * 1.5);

            const pixelIndex = (f * numVertices + v) * 4;
            textureData[pixelIndex] = vx;
            textureData[pixelIndex + 1] = vy + flapOffset; // animate Y axis
            textureData[pixelIndex + 2] = vz;
            textureData[pixelIndex + 3] = 1.0; // padding
        }
    }

    const animTexture = new THREE.DataTexture(
        textureData,
        numVertices,
        numFrames,
        THREE.RGBAFormat,
        THREE.FloatType
    );
    animTexture.minFilter = THREE.NearestFilter;
    animTexture.magFilter = THREE.NearestFilter;
    animTexture.needsUpdate = true;

    // 4. Custom Vertex & Fragment Shaders
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uAnimationTexture: { value: animTexture },
            uNumVertices: { value: numVertices },
            uNumFrames: { value: numFrames },
            uTime: { value: 0 },
            uFPS: { value: fpsVal },
            uSpeed: { value: animSpeed },
            uAmplitude: { value: amplitude }
        },
        vertexShader: `
            attribute float aVertexIndex;
            attribute float aInstanceOffset;

            uniform sampler2D uAnimationTexture;
            uniform float uNumVertices;
            uniform float uNumFrames;
            uniform float uTime;
            uniform float uFPS;
            uniform float uSpeed;
            uniform float uAmplitude;

            varying vec3 vColor;
            varying vec3 vViewPosition;

            void main() {
                vColor = color;
                
                // Calculate time-offset frame index on the GPU
                float frameIndex = mod(uTime * uFPS * uSpeed + aInstanceOffset, uNumFrames);
                
                // Texture sampling coordinates
                float u = (aVertexIndex + 0.5) / uNumVertices;
                float v = (floor(frameIndex) + 0.5) / uNumFrames;
                
                // Fetch vertex coordinates
                vec4 sampledPos = texture2D(uAnimationTexture, vec2(u, v));
                
                // Scale flapping height based on amplitude
                // Original baked amplitude was 0.3
                float amplitudeScale = uAmplitude / 0.3;
                float deltaY = (sampledPos.y - position.y) * amplitudeScale;
                vec3 finalPos = vec3(sampledPos.x, position.y + deltaY, sampledPos.z);

                // Apply instanced mesh matrix transforms
                vec4 worldPos = modelMatrix * instanceMatrix * vec4(finalPos, 1.0);
                vec4 mvPosition = viewMatrix * worldPos;
                
                gl_Position = projectionMatrix * mvPosition;
                vViewPosition = -mvPosition.xyz;
            }
        `,
        fragmentShader: `
            precision mediump float;
            varying vec3 vColor;
            varying vec3 vViewPosition;

            void main() {
                // Calculate flat normal on-the-fly using screen-space derivatives
                vec3 fdx = dFdx(vViewPosition);
                vec3 fdy = dFdy(vViewPosition);
                vec3 normal = normalize(cross(fdx, fdy));
                
                // Directional lighting
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
                float dotNL = max(dot(normal, lightDir), 0.0);
                
                // Rim light / silhouette glow
                vec3 viewDir = normalize(vViewPosition);
                float rim = 1.0 - max(dot(normal, viewDir), 0.0);
                vec3 rimColor = vec3(0.66, 0.33, 1.0) * pow(rim, 3.5) * 0.5;

                vec3 finalColor = vColor * (dotNL * 0.7 + 0.3) + rimColor;
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        side: THREE.DoubleSide,
        vertexColors: true,
        extensions: {
            derivatives: true
        }
    });

    // 5. Add custom instance offset attribute
    const instanceOffsets = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        instanceOffsets[i] = Math.random() * numFrames; // random starting frame
    }
    geometry.setAttribute('aInstanceOffset', new THREE.InstancedBufferAttribute(instanceOffsets, 1));

    // 6. Setup InstancedMesh
    instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    scene.add(instancedMesh);

    // Initialize layout of the 500 instances in a majestic double-helix vortex shape
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyRot = new THREE.Euler();
    const dummyScale = new THREE.Vector3();
    const dummyQuaternion = new THREE.Quaternion();

    for (let i = 0; i < count; i++) {
        // Arrange in a giant upward swirl
        const t = i / count;
        const angle = t * Math.PI * 14; // Multi-turn spiral
        const radius = 10 + t * 35;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = -10 + t * 45; // stack upward

        dummyPos.set(x, y, z);

        // Turn to point along the spiral direction, face center, or tilt
        const tangentX = -Math.sin(angle);
        const tangentZ = Math.cos(angle);
        const yaw = Math.atan2(tangentX, tangentZ) + Math.PI / 2; // point outwards/sideways
        const pitch = 0.2; // slight nose-up angle
        const roll = -0.3; // bank angle

        dummyRot.set(pitch, yaw, roll);
        dummyQuaternion.setFromEuler(dummyRot);

        const sc = (0.5 + t * 0.7);
        dummyScale.set(sc, sc, sc);

        dummyMatrix.compose(dummyPos, dummyQuaternion, dummyScale);
        instancedMesh.setMatrixAt(i, dummyMatrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    // UI Event Listeners
    speedSlider.addEventListener('input', (e) => {
        animSpeed = parseFloat(e.target.value);
        speedLabel.textContent = animSpeed.toFixed(1) + 'x';
        material.uniforms.uSpeed.value = animSpeed;
    });

    amplitudeSlider.addEventListener('input', (e) => {
        amplitude = parseFloat(e.target.value);
        amplitudeLabel.textContent = amplitude.toFixed(2);
        material.uniforms.uAmplitude.value = amplitude;
    });

    btnTogglePlay.addEventListener('click', () => {
        isPlaying = !isPlaying;
        btnTogglePlay.textContent = isPlaying ? 'Pausar Animación' : 'Reanudar Animación';
        if (!isPlaying) {
            btnTogglePlay.style.background = 'linear-gradient(135deg, var(--success), #059669)';
            material.uniforms.uSpeed.value = 0.0;
        } else {
            btnTogglePlay.style.background = 'linear-gradient(135deg, var(--accent-color), #7e22ce)';
            material.uniforms.uSpeed.value = animSpeed;
        }
    });

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateFPS() {
    const now = performance.now();
    frameCount++;
    if (now >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        fpsValueEl.textContent = fps + ' FPS';

        if (fps >= 45) {
            fpsValueEl.style.color = 'var(--success)';
        } else if (fps >= 30) {
            fpsValueEl.style.color = 'var(--warning)';
        } else {
            fpsValueEl.style.color = 'var(--danger)';
        }

        // Update miniature chart
        const bar = document.createElement('div');
        bar.className = 'fps-bar';
        bar.style.height = Math.min((fps / 60) * 100, 100) + '%';
        if (fps >= 45) bar.style.backgroundColor = 'var(--success)';
        else if (fps >= 30) bar.style.backgroundColor = 'var(--warning)';
        else bar.style.backgroundColor = 'var(--danger)';

        fpsChartEl.appendChild(bar);
        if (fpsChartEl.children.length > 20) {
            fpsChartEl.removeChild(fpsChartEl.firstChild);
        }

        frameCount = 0;
        lastTime = now;
    }
}

function animate() {
    requestAnimationFrame(animate);

    updateFPS();

    // Rotate the entire swarm mesh very slowly.
    // Notice: We don't perform any CPU matrix or vertex updates per instance!
    if (isPlaying) {
        const time = performance.now() * 0.001;
        instancedMesh.material.uniforms.uTime.value = time;
        instancedMesh.rotation.y = time * 0.03;
    }

    controls.update();
    renderer.render(scene, camera);

    // Update draw call statistic
    drawCallsEl.textContent = renderer.info.render.calls;
}
