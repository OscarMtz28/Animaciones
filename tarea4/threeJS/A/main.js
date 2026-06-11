/**
 * Blinn-Phong Shader para Three.js
 * Implementación completa de iluminación difusa (Lambert) + especular (Blinn-Phong) en Espacio de Mundo
 */

// Shaders como strings
const vertexShaderCode = `
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
        // Transformar la posición a espacio de mundo
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // Transformar la normal a espacio de mundo (asumiendo escala uniforme)
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        
        vUv = uv;
        
        // Posición proyectada final
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
    varying vec2 vUv;
    
    void main() {
        // Normalizar vectores en espacio de mundo
        vec3 normal = normalize(vWorldNormal);
        vec3 lightDir = normalize(uLightPosition - vWorldPosition);
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        
        // Componente Difusa (Ley de Lambert)
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff;
        
        // Componente Especular Blinn-Phong (Vector a la mitad / Halfway vector)
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), uShininess);
        vec3 specular = uSpecularColor * spec;
        
        // Componente Ambiente
        vec3 ambient = vec3(0.08, 0.1, 0.18);
        
        // Combinar componentes
        vec3 color = ambient + diffuse + specular;
        
        // Limitar rango
        color = clamp(color, 0.0, 1.0);
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    
    // 1. Crear Escena y Renderizador
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030816);
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    
    // 2. Controladores de Cámara
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    
    // 3. Crear el material con shader personalizado (ShaderMaterial)
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderCode,
        fragmentShader: fragmentShaderCode,
        uniforms: {
            uDiffuseColor: { value: new THREE.Color(0xff8844) },
            uSpecularColor: { value: new THREE.Color(0xffffff) },
            uShininess: { value: 32.0 },
            uLightPosition: { value: new THREE.Vector3(3.0, 2.5, 2.0) },
            uCameraPosition: { value: new THREE.Vector3() }
        }
    });
    
    // 4. Crear la malla principal (Esfera de alta resolución)
    const geometry = new THREE.SphereGeometry(0.9, 128, 128);
    const sphere = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(sphere);
    
    // 5. Elementos Visuales Auxiliares
    
    // Grid Helper
    const gridHelper = new THREE.GridHelper(12, 24, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -1.2;
    // Hacer el grid un poco transparente
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Esfera auxiliar para representar la Luz
    const lightHelperGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const lightHelperMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const lightHelper = new THREE.Mesh(lightHelperGeom, lightHelperMat);
    scene.add(lightHelper);
    
    // Línea orbital de la luz
    const orbitRadius = 3.2;
    const orbitHeight = 2.2;
    const orbitPoints = [];
    for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, orbitHeight, Math.sin(theta) * orbitRadius));
    }
    const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.3 });
    const orbitLine = new THREE.Line(orbitGeom, orbitMat);
    scene.add(orbitLine);
    
    // 6. Fondo de estrellas (Partículas)
    const starsCount = 1000;
    const starsGeom = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount * 3; i += 3) {
        // Distribuir en una esfera grande alrededor del centro
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
    
    // Crear textura circular para las partículas
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
    
    // 7. Interfaz de Usuario y Eventos
    
    function hexToRgb(hex) {
        const color = new THREE.Color(hex);
        return color;
    }
    
    // Color difuso
    const diffuseInput = document.getElementById('diffuseColor');
    diffuseInput.addEventListener('input', (e) => {
        shaderMaterial.uniforms.uDiffuseColor.value = hexToRgb(e.target.value);
    });
    
    // Color especular
    const specularInput = document.getElementById('specularColor');
    specularInput.addEventListener('input', (e) => {
        shaderMaterial.uniforms.uSpecularColor.value = hexToRgb(e.target.value);
    });
    
    // Shininess
    const shininessInput = document.getElementById('shininess');
    const shininessValue = document.getElementById('shininessValue');
    shininessInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        shininessValue.textContent = val;
        shaderMaterial.uniforms.uShininess.value = val;
    });
    
    // 8. Bucle de Animación
    let clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime() * 0.5; // Velocidad de órbita
        
        // Mover la luz en círculo
        const lightX = Math.cos(time) * orbitRadius;
        const lightZ = Math.sin(time) * orbitRadius;
        const lightPos = new THREE.Vector3(lightX, orbitHeight, lightZ);
        
        shaderMaterial.uniforms.uLightPosition.value.copy(lightPos);
        lightHelper.position.copy(lightPos);
        
        // Pasar la posición de la cámara actualizada al shader
        shaderMaterial.uniforms.uCameraPosition.value.copy(camera.position);
        
        // Rotar levemente la esfera
        sphere.rotation.y = time * 0.1;
        
        // Rotar el campo de estrellas muy lentamente
        starField.rotation.y = time * 0.01;
        
        controls.update();
        renderer.render(scene, camera);
    }
    
    // Inicializar bucle
    animate();
    
    // Manejar redimensionamiento
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Actualizar estado
    statusDiv.textContent = 'Three.js Activo | Blinn-Phong';
    
    console.log('Three.js Blinn-Phong inicializado con éxito');
});