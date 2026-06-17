// Three.js - Parte A: CPU Instancing Animation
let scene, camera, renderer, controls;
let instancedMesh;
const count = 500;

// Global vectors / matrices to avoid garbage collection overhead in render loop
const dummyPos = new THREE.Vector3();
const dummyRot = new THREE.Euler();
const dummyScale = new THREE.Vector3();
const dummyQuaternion = new THREE.Quaternion();
const dummyMatrix = new THREE.Matrix4();

// Swarm data
const instanceData = [];
let isPlaying = true;
let animSpeed = 1.0;
let instanceScale = 1.0;

// FPS tracking
let lastTime = performance.now();
let frameCount = 0;
const fpsValueEl = document.getElementById('fps-value');
const fpsChartEl = document.getElementById('fps-chart');

// DOM elements
const speedSlider = document.getElementById('speed-slider');
const speedLabel = document.getElementById('speed-label');
const scaleSlider = document.getElementById('scale-slider');
const scaleLabel = document.getElementById('scale-label');
const btnTogglePlay = document.getElementById('btn-toggle-play');

// Initial setup
init();
animate();

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    // Add atmospheric fog
    scene.fog = new THREE.FogExp2(0x030712, 0.015);

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 60);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go too far below ground

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x3b82f6, 1.2); // Glowing blue
    dirLight1.position.set(50, 100, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8b5cf6, 0.8); // Glowing purple
    dirLight2.position.set(-50, -20, -50);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x10b981, 1.5, 100); // Glowing green core
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Grid helper (subtle, dark)
    const gridHelper = new THREE.GridHelper(200, 50, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    // Generate custom Manta Ray mesh
    const segments = 10;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const indices = [];

    // Create grid vertices
    for (let j = 0; j <= segments; j++) {
        const z = (j / segments) * 2 - 1; // -1 to 1 (z-axis)
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * 2 - 1; // -1 to 1 (x-axis)

            // Wing profile scale: tapers width at front (z > 0.8) and tail (z < -0.2)
            let wingScale = 1.0;
            if (z < 0) {
                wingScale = 1.0 + z * 0.8; // taper tail
            } else if (z > 0.6) {
                wingScale = 1.0 - (z - 0.6) * 1.5; // taper nose
            }
            wingScale = Math.max(0.05, wingScale);

            const posX = x * wingScale * 1.5; // Stretch wings horizontally
            const posY = 0;
            const posZ = z * 2.0;             // Lengthen body

            vertices.push(posX, posY, posZ);

            // Colorful palette mapping based on position
            // Wings are vibrant violet, body is bright cyan
            const xAbs = Math.abs(x);
            const r = xAbs * 0.7 + 0.1;
            const g = 0.3 + (1.0 - xAbs) * 0.6;
            const b = 0.9;
            colors.push(r, g, b);
        }
    }

    // Indices for triangles
    for (let j = 0; j < segments; j++) {
        for (let i = 0; i < segments; i++) {
            const a = j * (segments + 1) + i;
            const b = j * (segments + 1) + i + 1;
            const c = (j + 1) * (segments + 1) + i;
            const d = (j + 1) * (segments + 1) + i + 1;

            // Quad split
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Material
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.2,
        metalness: 0.8,
        side: THREE.DoubleSide,
        flatShading: true
    });

    // InstancedMesh setup
    instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // optimization flag for frequent updates
    scene.add(instancedMesh);

    // Initialize individual swarm entities
    for (let i = 0; i < count; i++) {
        // Orbit center, radius, heights, speeds
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

    // UI Event Listeners
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
            btnTogglePlay.style.background = 'linear-gradient(135deg, var(--accent-color), #2563eb)';
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

        // Add to miniature visual chart
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

    if (isPlaying) {
        const time = performance.now() * 0.001 * animSpeed;

        for (let i = 0; i < count; i++) {
            const data = instanceData[i];

            // 1. Calculate Orbit Position
            data.angle += data.speed * animSpeed;
            const x = Math.cos(data.angle) * data.radius;
            const z = Math.sin(data.angle) * data.radius;
            // Wave movement for height
            const y = data.yOffset + Math.sin(time * data.yFreq + i) * data.yAmp;

            dummyPos.set(x, y, z);

            // 2. Calculate Rotation (align with movement vector and tilt)
            // Movement tangent vector
            const tx = -Math.sin(data.angle);
            const tz = Math.cos(data.angle);

            // Yaw is angle of movement direction
            const yaw = Math.atan2(tx, tz);
            // Pitch is rising/falling angle
            const pitch = Math.cos(time * data.yFreq + i) * 0.15;
            // Roll is bank tilt on turning
            const roll = Math.sin(time * data.rollSpeed + data.rollOffset) * 0.25;

            dummyRot.set(pitch, yaw, roll);
            dummyQuaternion.setFromEuler(dummyRot);

            // 3. Set Scale
            const currentScale = data.scaleMult * instanceScale;
            dummyScale.set(currentScale, currentScale, currentScale);

            // Compose matrix and set
            dummyMatrix.compose(dummyPos, dummyQuaternion, dummyScale);
            instancedMesh.setMatrixAt(i, dummyMatrix);
        }
        // Mark matrix as needing upload to GPU
        instancedMesh.instanceMatrix.needsUpdate = true;
    }

    controls.update();
    renderer.render(scene, camera);
}
