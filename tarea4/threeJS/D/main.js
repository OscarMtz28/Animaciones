/**
 * Vertex Wobble Shader para Three.js
 * Modificación dinámica de vértices a lo largo de su vector normal en función del tiempo.
 */

const vertexShaderCode = `
    uniform float uTime;
    uniform float uAmplitude;
    uniform float uFrequency;
    uniform float uSpeed;
    uniform int uDirection; // 0: X, 1: Y, 2: Z

    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        // Seleccionar eje para la ola
        float coord = position.y;
        if (uDirection == 0) {
            coord = position.x;
        } else if (uDirection == 2) {
            coord = position.z;
        }
        
        // Calcular el factor de deformación
        float wave = sin(coord * uFrequency + uTime * uSpeed) * uAmplitude;
        
        // Deformar la posición a lo largo de la normal
        vec3 deformedPosition = position + normal * wave;
        
        vec4 worldPosition = modelMatrix * vec4(deformedPosition, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // Mantener la normal para cálculos de iluminación
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const fragmentShaderCode = `
    uniform vec3 uDiffuseColor;
    uniform vec3 uSpecularColor;
    uniform float uShininess;
    uniform vec3 uLightPosition;
    uniform vec3 uCameraPosition;
    
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    
    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 lightDir = normalize(uLightPosition - vWorldPosition);
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        
        // Difusa
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff;
        
        // Especular Blinn-Phong
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), uShininess);
        vec3 specular = uSpecularColor * spec;
        
        // Ambiente
        vec3 ambient = vec3(0.08, 0.1, 0.18);
        
        vec3 color = ambient + diffuse + specular;
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
`;

document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    
    // 1. Escena y Render
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030816);
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    
    // 2. ShaderMaterial
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderCode,
        fragmentShader: fragmentShaderCode,
        uniforms: {
            uTime: { value: 0.0 },
            uAmplitude: { value: 0.15 },
            uFrequency: { value: 4.0 },
            uSpeed: { value: 2.5 },
            uDirection: { value: 1 }, // Eje Y por defecto
            
            uDiffuseColor: { value: new THREE.Color(0xf59e0b) }, // Color oro/naranja
            uSpecularColor: { value: new THREE.Color(0xffffff) },
            uShininess: { value: 64.0 },
            uLightPosition: { value: new THREE.Vector3(3.0, 2.5, 2.0) },
            uCameraPosition: { value: new THREE.Vector3() }
        }
    });
    
    // 3. Malla: Esfera de muy alta resolución (más segmentos = deformación más suave)
    const geometry = new THREE.SphereGeometry(0.9, 128, 128);
    const sphere = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(sphere);
    
    // 4. Elementos Visuales Auxiliares
    const gridHelper = new THREE.GridHelper(12, 24, 0xf59e0b, 0x1e293b);
    gridHelper.position.y = -1.2;
    gridHelper.material.opacity = 0.18;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Luz visual
    const lightHelperGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const lightHelperMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const lightHelper = new THREE.Mesh(lightHelperGeom, lightHelperMat);
    scene.add(lightHelper);
    
    // Órbita de la luz
    const orbitRadius = 3.2;
    const orbitHeight = 2.2;
    const orbitPoints = [];
    for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, orbitHeight, Math.sin(theta) * orbitRadius));
    }
    const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.25 });
    const orbitLine = new THREE.Line(orbitGeom, orbitMat);
    scene.add(orbitLine);
    
    // Estrellas
    const starsCount = 1000;
    const starsGeom = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
        const radius = 20 + Math.random() * 20;
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        starsPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
        starsPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starsPositions[i + 2] = radius * Math.cos(phi);
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 16;
    starCanvas.height = 16;
    const starCtx = starCanvas.getContext('2d');
    const grad = starCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    starCtx.fillStyle = grad;
    starCtx.fillRect(0, 0, 16, 16);
    
    const starTexture = new THREE.CanvasTexture(starCanvas);
    const starsMat = new THREE.PointsMaterial({
        size: 0.15,
        map: starTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const starField = new THREE.Points(starsGeom, starsMat);
    scene.add(starField);
    
    // 5. Vincular Interfaz UI
    
    // Amplitud
    const amplitudeInput = document.getElementById('amplitude');
    const amplitudeValue = document.getElementById('amplitudeValue');
    amplitudeInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        amplitudeValue.textContent = val.toFixed(2);
        shaderMaterial.uniforms.uAmplitude.value = val;
    });
    
    // Frecuencia
    const frequencyInput = document.getElementById('frequency');
    const frequencyValue = document.getElementById('frequencyValue');
    frequencyInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        frequencyValue.textContent = val.toFixed(1);
        shaderMaterial.uniforms.uFrequency.value = val;
    });
    
    // Velocidad
    const speedInput = document.getElementById('speed');
    const speedValue = document.getElementById('speedValue');
    speedInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        speedValue.textContent = val.toFixed(1);
        shaderMaterial.uniforms.uSpeed.value = val;
    });
    
    // Dirección
    const directionSelect = document.getElementById('direction');
    directionSelect.addEventListener('change', (e) => {
        const axis = e.target.value;
        let axisValue = 1; // Y
        if (axis === 'X') axisValue = 0;
        else if (axis === 'Z') axisValue = 2;
        shaderMaterial.uniforms.uDirection.value = axisValue;
    });
    
    // 6. Bucle de Animación
    let clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const elapsed = clock.getElapsedTime();
        const orbitTime = elapsed * 0.4;
        
        // Actualizar uniforme uTime para el wobble
        shaderMaterial.uniforms.uTime.value = elapsed;
        
        // Mover luz
        const lightX = Math.cos(orbitTime) * orbitRadius;
        const lightZ = Math.sin(orbitTime) * orbitRadius;
        const lightPos = new THREE.Vector3(lightX, orbitHeight, lightZ);
        
        shaderMaterial.uniforms.uLightPosition.value.copy(lightPos);
        lightHelper.position.copy(lightPos);
        
        // Cámara para Blinn-Phong
        shaderMaterial.uniforms.uCameraPosition.value.copy(camera.position);
        
        // Rotar levemente la esfera
        sphere.rotation.y = elapsed * 0.1;
        
        // Rotar estrellas
        starField.rotation.y = elapsed * 0.005;
        
        controls.update();
        renderer.render(scene, camera);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    statusDiv.textContent = 'Three.js Activo | Vertex Wobble';
    
    console.log('Three.js Vertex Wobble inicializado con éxito');
});
