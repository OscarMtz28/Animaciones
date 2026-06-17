import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Configuración de la escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b1a);
scene.fog = new THREE.FogExp2(0x050b1a, 0.008);

// Configuración de la cámara
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 2, 5);
camera.lookAt(0, 0, 0);

// Configuración del renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = true;
controls.enablePan = true;
controls.target.set(0, 0, 0);

// ============================================
// DEFINICIÓN DEL SHADER BLINN-PHONG
// ============================================

// Vertex Shader
const vertexShader = `
    varying vec3 vViewPosition;
    varying vec3 vNormal;
    
    void main() {
        // Transformar la normal al espacio de vista
        vNormal = normalize(normalMatrix * normal);
        
        // Posición en espacio de vista
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        // Posición final
        gl_PointSize = 1.0;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// Fragment Shader - Implementación de Blinn-Phong
const fragmentShader = `
    uniform vec3 uDiffuseColor;
    uniform vec3 uSpecularColor;
    uniform float uShininess;
    uniform vec3 uLightPosition;
    uniform vec3 uCameraPosition;
    
    varying vec3 vViewPosition;
    varying vec3 vNormal;
    
    void main() {
        // Normalizar vectores
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(uLightPosition - vViewPosition);
        vec3 viewDir = normalize(-vViewPosition);
        
        // Componente Difusa (Ley de Lambert)
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uDiffuseColor * diff;
        
        // Componente Especular Blinn-Phong
        // Vector Halfway entre lightDir y viewDir
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfVec), 0.0), uShininess);
        vec3 specular = uSpecularColor * spec;
        
        // Combinar componentes
        vec3 color = diffuse + specular;
        
        // Pequeña cantidad de luz ambiente para no tener negros totales
        vec3 ambient = vec3(0.15, 0.15, 0.2);
        color += ambient;
        
        // Clamp para asegurar valores en rango [0,1]
        color = clamp(color, 0.0, 1.0);
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// ============================================
// CREACIÓN DEL MATERIAL CON SHADER
// ============================================

// Geometría (esfera con alta resolución)
const geometry = new THREE.SphereGeometry(1.2, 128, 128);

// Valores iniciales
let diffuseColor = '#ff8844';
let specularColor = '#ffffff';
let shininess = 32;

// Posición de la luz (se moverá)
const lightPosition = new THREE.Vector3(3, 3, 2);

// Material con shader personalizado
const material = new THREE.ShaderMaterial({
    uniforms: {
        uDiffuseColor: { value: new THREE.Color(diffuseColor) },
        uSpecularColor: { value: new THREE.Color(specularColor) },
        uShininess: { value: shininess },
        uLightPosition: { value: lightPosition },
        uCameraPosition: { value: camera.position }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide  // Para mejor visualización de la especularidad
});

// Crear la malla
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// ============================================
// ELEMENTOS AUXILIARES
// ============================================

// Luz auxiliar visual (pequeña esfera que muestra la posición de la luz)
const lightHelperGeometry = new THREE.SphereGeometry(0.08, 16, 16);
const lightHelperMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0x442200 });
const lightHelper = new THREE.Mesh(lightHelperGeometry, lightHelperMaterial);
scene.add(lightHelper);

// Línea que muestra la trayectoria de la luz
const orbitPoints = [];
const orbitRadius = 3.5;
for (let i = 0; i <= 100; i++) {
    const angle = (i / 100) * Math.PI * 2;
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;
    orbitPoints.push(new THREE.Vector3(x, 2.2, z));
}
const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.3 });
const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
scene.add(orbitLine);

// Grid helper (suelo)
const gridHelper = new THREE.GridHelper(10, 20, 0x3a4a8c, 0x1a2a4c);
gridHelper.position.y = -1.3;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.4;
scene.add(gridHelper);

// Ejes auxiliares (opcional)
const axesHelper = new THREE.AxesHelper(2.5);
axesHelper.material.transparent = true;
axesHelper.material.opacity = 0.15;
scene.add(axesHelper);

// Pequeñas estrellas de fondo
const starGeometry = new THREE.BufferGeometry();
const starCount = 800;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 200;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 40;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.6 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// ============================================
// INTERFAZ DE USUARIO
// ============================================

// Color difuso
const diffuseInput = document.getElementById('diffuseColor');
diffuseInput.addEventListener('input', (e) => {
    diffuseColor = e.target.value;
    material.uniforms.uDiffuseColor.value.set(diffuseColor);
});

// Color especular
const specularInput = document.getElementById('specularColor');
specularInput.addEventListener('input', (e) => {
    specularColor = e.target.value;
    material.uniforms.uSpecularColor.value.set(specularColor);
});

// Shininess
const shininessInput = document.getElementById('shininess');
const shininessValue = document.getElementById('shininessValue');
shininessInput.addEventListener('input', (e) => {
    shininess = parseFloat(e.target.value);
    shininessValue.textContent = shininess;
    material.uniforms.uShininess.value = shininess;
});

// ============================================
// ANIMACIÓN
// ============================================

let time = 0;
const lightOrbitRadius = 3.5;
const lightHeight = 2.2;

function animate() {
    // Actualizar tiempo
    time += 0.008;
    
    // Mover la luz en una órbita circular
    const lightX = Math.cos(time) * lightOrbitRadius;
    const lightZ = Math.sin(time) * lightOrbitRadius;
    lightPosition.set(lightX, lightHeight, lightZ);
    
    // Actualizar uniforme de la luz
    material.uniforms.uLightPosition.value = lightPosition;
    
    // Actualizar posición de la cámara en el shader
    material.uniforms.uCameraPosition.value = camera.position;
    
    // Actualizar posición visual de la luz auxiliar
    lightHelper.position.copy(lightPosition);
    
    // Rotación lenta de las estrellas
    stars.rotation.y += 0.0005;
    stars.rotation.x += 0.0003;
    
    // Actualizar controles de cámara
    controls.update();
    
    // Renderizar
    renderer.render(scene, camera);
    
    // Solicitar siguiente frame
    requestAnimationFrame(animate);
}

// Iniciar animación
animate();

// ============================================
// MANEJO DE RESIZE DE VENTANA
// ============================================

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Console log para confirmar
console.log('Blinn-Phong Shader cargado correctamente');
console.log('Características:');
console.log('- Iluminación difusa (Lambert)');
console.log('- Componente especular (Blinn-Phong)');
console.log('- Parámetros ajustables: color difuso, color especular, shininess');