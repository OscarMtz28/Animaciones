/**
 * Normal Map (Bump) Shader para Three.js
 * Compara dos esferas con geometría idéntica, una lisa y otra perturbada por un mapa de normales procedural.
 */

const vertexShaderCode = `
    attribute vec4 tangent;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vWorldTangent;
    varying vec3 vWorldBitangent;
    varying vec2 vUv;

    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // Normal, tangente y bitangente en espacio de mundo
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vWorldTangent = normalize(mat3(modelMatrix) * tangent.xyz);
        vWorldBitangent = normalize(cross(vWorldNormal, vWorldTangent) * tangent.w);
        
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const fragmentShaderCode = `
    uniform vec3 uDiffuseColor;
    uniform vec3 uSpecularColor;
    uniform float uShininess;
    uniform vec3 uLightPosition;
    uniform vec3 uCameraPosition;
    
    uniform sampler2D uNormalMap;
    uniform float uUseNormalMap;
    uniform float uNormalScale;
    
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec3 vWorldTangent;
    varying vec3 vWorldBitangent;
    varying vec2 vUv;
    
    void main() {
        vec3 normal = normalize(vWorldNormal);
        
        if (uUseNormalMap > 0.5) {
            // Escalar UVs para repetir el patrón
            vec2 scaledUv = vUv * uNormalScale;
            
            // Obtener y desempaquetar vector normal en espacio tangente [-1, 1]
            vec3 normalSample = texture2D(uNormalMap, scaledUv).xyz * 2.0 - 1.0;
            
            // Re-normalizar vectores TBN
            vec3 T = normalize(vWorldTangent);
            vec3 B = normalize(vWorldBitangent);
            vec3 N = normalize(vWorldNormal);
            
            // Crear matriz TBN de transformación a Espacio de Mundo
            mat3 TBN = mat3(T, B, N);
            
            // Transformar normal y normalizar
            normal = normalize(TBN * normalSample);
        }
        
        // Componente de iluminación Blinn-Phong en Espacio de Mundo
        vec3 lightDir = normalize(uLightPosition - vWorldPosition);
        vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
        
        // Difusa
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff;
        
        // Especular
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), uShininess);
        vec3 specular = uSpecularColor * spec;
        
        // Ambiente
        vec3 ambient = vec3(0.06, 0.08, 0.14);
        
        vec3 finalColor = ambient + diffuse + specular;
        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
    }
`;

// Generador procedural de mapa de normales
function generateProceduralNormalMap(width = 512, height = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    
    // Usaremos un patrón de ondas cruzadas
    const freq = 0.09;
    const amp = 4.0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // h(x,y) = sin(x*freq)*cos(y*freq)
            // Derivadas
            const dhdx = freq * Math.cos(x * freq) * Math.cos(y * freq) * amp;
            const dhdy = -freq * Math.sin(x * freq) * Math.sin(y * freq) * amp;
            
            // Vector normal en espacio tangente: normalize(-dhdx, -dhdy, 1.0)
            const nx = -dhdx;
            const ny = -dhdy;
            const nz = 1.0;
            
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            const r = ((nx / len) * 0.5 + 0.5) * 255;
            const g = ((ny / len) * 0.5 + 0.5) * 255;
            const b = ((nz / len) * 0.5 + 0.5) * 255;
            
            const idx = (y * width + x) * 4;
            data[idx] = Math.floor(r);
            data[idx+1] = Math.floor(g);
            data[idx+2] = Math.floor(b);
            data[idx+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    
    // 1. Escena y Render
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030816);
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 4.5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    
    // Generar textura de normales a partir de canvas procedural
    const normalCanvas = generateProceduralNormalMap();
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    
    // 2. Materiales de Shader
    // Material 1: Sin normal map
    const materialSmooth = new THREE.ShaderMaterial({
        vertexShader: vertexShaderCode,
        fragmentShader: fragmentShaderCode,
        uniforms: {
            uDiffuseColor: { value: new THREE.Color(0x5588ff) },
            uSpecularColor: { value: new THREE.Color(0xffffff) },
            uShininess: { value: 40.0 },
            uLightPosition: { value: new THREE.Vector3(0.0, 2.0, 3.0) },
            uCameraPosition: { value: new THREE.Vector3() },
            uNormalMap: { value: normalTexture },
            uUseNormalMap: { value: 0.0 }, // Desactivado
            uNormalScale: { value: 2.0 }
        }
    });
    
    // Material 2: Con normal map
    const materialBump = new THREE.ShaderMaterial({
        vertexShader: vertexShaderCode,
        fragmentShader: fragmentShaderCode,
        uniforms: {
            uDiffuseColor: { value: new THREE.Color(0x5588ff) },
            uSpecularColor: { value: new THREE.Color(0xffffff) },
            uShininess: { value: 40.0 },
            uLightPosition: { value: new THREE.Vector3(0.0, 2.0, 3.0) },
            uCameraPosition: { value: new THREE.Vector3() },
            uNormalMap: { value: normalTexture },
            uUseNormalMap: { value: 1.0 }, // Activado
            uNormalScale: { value: 2.0 }
        }
    });
    
    // 3. Crear Mallas con atributos de Tangentes
    const sphereGeometry = new THREE.SphereGeometry(0.85, 128, 128);
    sphereGeometry.computeTangents(); // ¡Critico para que el shader TBN funcione!
    
    // Esfera Izquierda: Lisa
    const sphereLeft = new THREE.Mesh(sphereGeometry, materialSmooth);
    sphereLeft.position.set(-1.2, 0, 0);
    scene.add(sphereLeft);
    
    // Esfera Derecha: Bumped
    const sphereRight = new THREE.Mesh(sphereGeometry, materialBump);
    sphereRight.position.set(1.2, 0, 0);
    scene.add(sphereRight);
    
    // 4. Ayudas Visuales
    const gridHelper = new THREE.GridHelper(12, 24, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -1.2;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Luz visual
    const lightHelperGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const lightHelperMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const lightHelper = new THREE.Mesh(lightHelperGeom, lightHelperMat);
    scene.add(lightHelper);
    
    // Órbita
    const orbitRadius = 3.5;
    const orbitHeight = 2.0;
    const orbitPoints = [];
    for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, orbitHeight, Math.sin(theta) * orbitRadius));
    }
    const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x5588ff, transparent: true, opacity: 0.3 });
    const orbitLine = new THREE.Line(orbitGeom, orbitMat);
    scene.add(orbitLine);
    
    // Campo de estrellas
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
    
    // 5. Vincular Controles UI
    
    function hexToRgb(hex) {
        return new THREE.Color(hex);
    }
    
    // Color de luz
    const diffuseInput = document.getElementById('diffuseColor');
    diffuseInput.addEventListener('input', (e) => {
        const color = hexToRgb(e.target.value);
        materialSmooth.uniforms.uDiffuseColor.value.copy(color);
        materialBump.uniforms.uDiffuseColor.value.copy(color);
    });
    
    // Shininess
    const shininessInput = document.getElementById('shininess');
    const shininessValue = document.getElementById('shininessValue');
    shininessInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        shininessValue.textContent = val;
        materialSmooth.uniforms.uShininess.value = val;
        materialBump.uniforms.uShininess.value = val;
    });
    
    // Escala del mapa de normales (repetición)
    const mapScaleInput = document.getElementById('mapScale');
    const mapScaleValue = document.getElementById('mapScaleValue');
    mapScaleInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        mapScaleValue.textContent = val.toFixed(1);
        materialSmooth.uniforms.uNormalScale.value = val;
        materialBump.uniforms.uNormalScale.value = val;
    });
    
    // 6. Animación
    let clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime() * 0.35; // Velocidad de órbita
        
        // Mover luz en órbita
        const lightX = Math.cos(time) * orbitRadius;
        const lightZ = Math.sin(time) * orbitRadius;
        const lightPos = new THREE.Vector3(lightX, orbitHeight, lightZ);
        
        materialSmooth.uniforms.uLightPosition.value.copy(lightPos);
        materialBump.uniforms.uLightPosition.value.copy(lightPos);
        lightHelper.position.copy(lightPos);
        
        // Cámara para Blinn-Phong
        materialSmooth.uniforms.uCameraPosition.value.copy(camera.position);
        materialBump.uniforms.uCameraPosition.value.copy(camera.position);
        
        // Rotar esferas juntas
        sphereLeft.rotation.y = time * 0.15;
        sphereRight.rotation.y = time * 0.15;
        
        // Rotar estrellas
        starField.rotation.y = time * 0.008;
        
        controls.update();
        renderer.render(scene, camera);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    statusDiv.textContent = 'Three.js Activo | Comparación Normal Map';
    
    console.log('Three.js Normal Map inicializado con éxito');
});
