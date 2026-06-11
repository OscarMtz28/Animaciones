/**
 * Toon / Cel-shading Shader para Three.js
 * Implementación de iluminación cuantizada en bandas discretas y contorno silueta (silhouette outline)
 */

const vertexShaderCode = `
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const fragmentShaderCode = `
    uniform vec3 uBaseColor;
    uniform vec3 uOutlineColor;
    uniform float uOutlineThickness;
    uniform float uBands;
    uniform vec3 uLightPosition;
    uniform vec3 uCameraPosition;
    
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    
    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 lightDir = normalize(uLightPosition - vWorldPosition);
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        
        // 1. Iluminación Difusa
        float NdotL = dot(normal, lightDir);
        float intensity = max(NdotL, 0.0);
        
        // Cuantización en bandas discretas
        float level = floor(intensity * uBands) / (uBands - 1.0);
        intensity = clamp(level, 0.15, 1.0); // 0.15 mínimo para sombras
        
        // Color difuso cuantizado
        vec3 diffuseColor = uBaseColor * intensity;
        
        // 2. Brillo Especular Cel-shaded (Brillo rígido / Sharp specular)
        vec3 halfVec = normalize(lightDir + viewDir);
        float NdotH = max(dot(normal, halfVec), 0.0);
        float spec = pow(NdotH, 60.0);
        float specIntensity = step(0.4, spec); // Brillo rígido binario
        vec3 specularColor = vec3(1.0) * specIntensity * 0.4;
        
        // Mezclar base + especular
        vec3 finalColor = diffuseColor + specularColor;
        
        // 3. Contorno silueta (Silhouette Outline)
        // El contorno es donde la normal es perpendicular a la cámara (N.V = 0)
        float NdotV = dot(normal, viewDir);
        
        // Aplicar outline color si estamos en el borde exterior
        if (NdotV < uOutlineThickness) {
            // Mezclar suavemente en el borde de transición del contorno para evitar aliasing
            float borderFactor = smoothstep(uOutlineThickness - 0.02, uOutlineThickness, NdotV);
            finalColor = mix(uOutlineColor, finalColor, borderFactor);
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    
    // 1. Escena y Renderizador
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Slate muy oscuro
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    
    // 2. Controles de Cámara
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    
    // 3. Material del Shader Personalizado
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderCode,
        fragmentShader: fragmentShaderCode,
        uniforms: {
            uBaseColor: { value: new THREE.Color(0xff5555) },
            uOutlineColor: { value: new THREE.Color(0x000000) },
            uOutlineThickness: { value: 0.3 },
            uBands: { value: 4.0 },
            uLightPosition: { value: new THREE.Vector3(3.0, 2.5, 2.0) },
            uCameraPosition: { value: new THREE.Vector3() }
        }
    });
    
    // 4. Malla (Toroide / Donut, resalta mucho mejor el contorno y bandas que una simple esfera!)
    // Vamos a crear un Toroide Nudo (TorusKnotGeometry) para dar un aspecto súper premium y orgánico
    const geometry = new THREE.TorusKnotGeometry(0.6, 0.22, 180, 24);
    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(mesh);
    
    // 5. Elementos Visuales Auxiliares
    
    // Grid Helper
    const gridHelper = new THREE.GridHelper(12, 24, 0x10b981, 0x1e293b);
    gridHelper.position.y = -1.2;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Esfera auxiliar para la Luz
    const lightHelperGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const lightHelperMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    const lightHelper = new THREE.Mesh(lightHelperGeom, lightHelperMat);
    scene.add(lightHelper);
    
    // Órbita
    const orbitRadius = 3.2;
    const orbitHeight = 2.2;
    const orbitPoints = [];
    for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, orbitHeight, Math.sin(theta) * orbitRadius));
    }
    const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.2 });
    const orbitLine = new THREE.Line(orbitGeom, orbitMat);
    scene.add(orbitLine);
    
    // Campo de estrellas (Toon style: partículas más grandes y nítidas)
    const starsCount = 400;
    const starsGeom = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount * 3; i += 3) {
        const radius = 15 + Math.random() * 15;
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        
        starsPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
        starsPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starsPositions[i + 2] = radius * Math.cos(phi);
    }
    
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    
    // Textura nítida de círculo para un look más Toon/Retro
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 16;
    starCanvas.height = 16;
    const starCtx = starCanvas.getContext('2d');
    starCtx.beginPath();
    starCtx.arc(8, 8, 4, 0, Math.PI * 2);
    starCtx.fillStyle = '#ffffff';
    starCtx.fill();
    
    const starTexture = new THREE.CanvasTexture(starCanvas);
    const starsMat = new THREE.PointsMaterial({
        size: 0.2,
        map: starTexture,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });
    
    const starField = new THREE.Points(starsGeom, starsMat);
    scene.add(starField);
    
    // 6. Enlazar interfaz de usuario
    
    function hexToRgb(hex) {
        return new THREE.Color(hex);
    }
    
    // Color base
    const baseColorInput = document.getElementById('baseColor');
    baseColorInput.addEventListener('input', (e) => {
        shaderMaterial.uniforms.uBaseColor.value = hexToRgb(e.target.value);
    });
    
    // Color contorno
    const outlineColorInput = document.getElementById('outlineColor');
    outlineColorInput.addEventListener('input', (e) => {
        shaderMaterial.uniforms.uOutlineColor.value = hexToRgb(e.target.value);
    });
    
    // Grosor contorno
    const outlineThicknessInput = document.getElementById('outlineThickness');
    const outlineThicknessValue = document.getElementById('outlineThicknessValue');
    outlineThicknessInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        outlineThicknessValue.textContent = val.toFixed(2);
        shaderMaterial.uniforms.uOutlineThickness.value = val;
    });
    
    // Niveles de bandas
    const bandsInput = document.getElementById('bands');
    const bandsValue = document.getElementById('bandsValue');
    bandsInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        bandsValue.textContent = val;
        shaderMaterial.uniforms.uBands.value = val;
    });
    
    // 7. Bucle de Renderizado
    let clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime() * 0.4; // Velocidad de órbita de luz
        
        // Mover la luz en círculo
        const lightX = Math.cos(time) * orbitRadius;
        const lightZ = Math.sin(time) * orbitRadius;
        const lightPos = new THREE.Vector3(lightX, orbitHeight, lightZ);
        
        shaderMaterial.uniforms.uLightPosition.value.copy(lightPos);
        lightHelper.position.copy(lightPos);
        
        // Actualizar uniforme de posición de cámara
        shaderMaterial.uniforms.uCameraPosition.value.copy(camera.position);
        
        // Rotar el Torus Knot suavemente
        mesh.rotation.y = time * 0.2;
        mesh.rotation.x = time * 0.1;
        
        // Rotación sutil de estrellas
        starField.rotation.y = time * 0.005;
        
        controls.update();
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Redimensionamiento
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    statusDiv.textContent = 'Three.js Activo | Cel-shading';
    
    console.log('Three.js Cel-shading inicializado con éxito');
});
