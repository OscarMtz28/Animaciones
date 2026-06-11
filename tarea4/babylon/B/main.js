/**
 * Toon / Cel-shading Shader para Babylon.js
 * Implementación de iluminación cuantizada en bandas discretas y contorno silueta (silhouette outline)
 */

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);
    
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.03, 0.09, 1.0);
    
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 3,
        5,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 10;
    camera.wheelPrecision = 50;
    
    // 1. Shaders en espacio de mundo
    const vertexShaderCode = `
        precision highp float;
        
        attribute vec3 position;
        attribute vec3 normal;
        
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        
        void main() {
            vec4 worldPosition = world * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            
            mat3 normalMatrix = mat3(world);
            vWorldNormal = normalize(normalMatrix * normal);
            
            gl_Position = worldViewProjection * vec4(position, 1.0);
        }
    `;
    
    const fragmentShaderCode = `
        precision highp float;
        
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
            
            // Cuantización en niveles discretos
            float level = floor(intensity * uBands) / (uBands - 1.0);
            intensity = clamp(level, 0.15, 1.0);
            
            vec3 diffuseColor = uBaseColor * intensity;
            
            // 2. Especular Cel-shaded rígido
            vec3 halfVec = normalize(lightDir + viewDir);
            float NdotH = max(dot(normal, halfVec), 0.0);
            float spec = pow(NdotH, 60.0);
            float specIntensity = step(0.4, spec);
            vec3 specularColor = vec3(1.0) * specIntensity * 0.4;
            
            vec3 finalColor = diffuseColor + specularColor;
            
            // 3. Contorno Silueta (Silhouette Outline)
            float NdotV = dot(normal, viewDir);
            if (NdotV < uOutlineThickness) {
                float borderFactor = smoothstep(uOutlineThickness - 0.02, uOutlineThickness, NdotV);
                finalColor = mix(uOutlineColor, finalColor, borderFactor);
            }
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;
    
    // Registrar shaders
    BABYLON.Effect.ShadersStore["toonVertexShader"] = vertexShaderCode;
    BABYLON.Effect.ShadersStore["toonFragmentShader"] = fragmentShaderCode;
    
    // Crear ShaderMaterial
    const shaderMaterial = new BABYLON.ShaderMaterial(
        "toonMaterial",
        scene,
        {
            vertex: "toon",
            fragment: "toon",
        },
        {
            attributes: ["position", "normal"],
            uniforms: [
                "world", "worldViewProjection",
                "uBaseColor", "uOutlineColor", "uOutlineThickness", "uBands",
                "uLightPosition", "uCameraPosition"
            ]
        }
    );
    
    // Valores iniciales
    let baseColorHex = '#ff5555';
    let outlineColorHex = '#000000';
    let outlineThickness = 0.3;
    let bands = 4;
    
    function hexToColor3(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return new BABYLON.Color3(r, g, b);
    }
    
    const initBase = hexToColor3(baseColorHex);
    const initOutline = hexToColor3(outlineColorHex);
    
    shaderMaterial.setVector3("uBaseColor", new BABYLON.Vector3(initBase.r, initBase.g, initBase.b));
    shaderMaterial.setVector3("uOutlineColor", new BABYLON.Vector3(initOutline.r, initOutline.g, initOutline.b));
    shaderMaterial.setFloat("uOutlineThickness", outlineThickness);
    shaderMaterial.setFloat("uBands", bands);
    
    // Luz
    const lightPosition = new BABYLON.Vector3(3, 2.5, 2);
    shaderMaterial.setVector3("uLightPosition", lightPosition);
    shaderMaterial.setVector3("uCameraPosition", camera.position);
    
    // Malla: Torus Knot para curvas bonitas
    const knot = BABYLON.MeshBuilder.CreateTorusKnot(
        "knot",
        { radius: 0.65, tube: 0.2, radialSegments: 128, tubularSegments: 32 },
        scene
    );
    knot.material = shaderMaterial;
    knot.position = new BABYLON.Vector3(0, 0, 0);
    
    // ============================================
    // ELEMENTOS VISUALES AUXILIARES
    // ============================================
    
    // Grid
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.5, 0.3);
    groundMaterial.alpha = 0.15;
    groundMaterial.wireframe = true;
    
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 12, height: 12, subdivisions: 24 }, scene);
    ground.material = groundMaterial;
    ground.position.y = -1.2;
    
    // Luz visual
    const lightHelperMat = new BABYLON.StandardMaterial("lightHelperMat", scene);
    lightHelperMat.emissiveColor = new BABYLON.Color3(1.0, 0.9, 0.3);
    lightHelperMat.diffuseColor = new BABYLON.Color3(1.0, 0.9, 0.3);
    
    const lightHelper = BABYLON.MeshBuilder.CreateSphere("lightHelper", { diameter: 0.16, segments: 16 }, scene);
    lightHelper.material = lightHelperMat;
    
    // Órbita
    const orbitPoints = [];
    const orbitRadius = 3.2;
    const orbitHeight = 2.2;
    for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        orbitPoints.push(new BABYLON.Vector3(x, orbitHeight, z));
    }
    
    const orbitLineMat = new BABYLON.StandardMaterial("orbitLineMat", scene);
    orbitLineMat.emissiveColor = new BABYLON.Color3(0.1, 0.5, 0.3);
    orbitLineMat.alpha = 0.2;
    
    const orbitLine = BABYLON.MeshBuilder.CreateLines("orbitLine", { points: orbitPoints }, scene);
    orbitLine.material = orbitLineMat;
    
    // Campo de estrellas (Toon style: partículas más definidas)
    const particleSystem = new BABYLON.ParticleSystem("stars", 400, scene);
    
    // Crear textura de círculo nítida al vuelo para evitar texturas borrosas
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 16;
    starCanvas.height = 16;
    const starCtx = starCanvas.getContext('2d');
    starCtx.beginPath();
    starCtx.arc(8, 8, 4, 0, Math.PI * 2);
    starCtx.fillStyle = '#ffffff';
    starCtx.fill();
    
    const starTexture = new BABYLON.HtmlElementTexture("starTexture", starCanvas, { scene });
    particleSystem.particleTexture = starTexture;
    particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    particleSystem.minEmitBox = new BABYLON.Vector3(-20, -10, -20);
    particleSystem.maxEmitBox = new BABYLON.Vector3(20, 15, 20);
    particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.5);
    particleSystem.color2 = new BABYLON.Color4(0.9, 1.0, 0.9, 0.4);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    particleSystem.minSize = 0.08;
    particleSystem.maxSize = 0.15;
    particleSystem.minLifeTime = 10;
    particleSystem.maxLifeTime = 15;
    particleSystem.emitRate = 30;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    particleSystem.direction1 = new BABYLON.Vector3(-0.1, -0.1, -0.1);
    particleSystem.direction2 = new BABYLON.Vector3(0.1, 0.1, 0.1);
    particleSystem.minEmitPower = 0.01;
    particleSystem.maxEmitPower = 0.05;
    particleSystem.updateSpeed = 0.01;
    particleSystem.start();
    
    // ============================================
    // INTERFAZ DE USUARIO
    // ============================================
    
    const statusDiv = document.getElementById('status');
    
    // Color base
    document.getElementById('baseColor').addEventListener('input', (e) => {
        const color = hexToColor3(e.target.value);
        shaderMaterial.setVector3("uBaseColor", new BABYLON.Vector3(color.r, color.g, color.b));
    });
    
    // Color contorno
    document.getElementById('outlineColor').addEventListener('input', (e) => {
        const color = hexToColor3(e.target.value);
        shaderMaterial.setVector3("uOutlineColor", new BABYLON.Vector3(color.r, color.g, color.b));
    });
    
    // Grosor contorno
    const outlineThicknessInput = document.getElementById('outlineThickness');
    const outlineThicknessValue = document.getElementById('outlineThicknessValue');
    outlineThicknessInput.addEventListener('input', (e) => {
        outlineThickness = parseFloat(e.target.value);
        outlineThicknessValue.textContent = outlineThickness.toFixed(2);
        shaderMaterial.setFloat("uOutlineThickness", outlineThickness);
    });
    
    // Bandas
    const bandsInput = document.getElementById('bands');
    const bandsValue = document.getElementById('bandsValue');
    bandsInput.addEventListener('input', (e) => {
        bands = parseFloat(e.target.value);
        bandsValue.textContent = bands;
        shaderMaterial.setFloat("uBands", bands);
    });
    
    // ============================================
    // BUCLE DE ACTUALIZACIÓN
    // ============================================
    
    let time = 0;
    scene.registerBeforeRender(() => {
        time += 0.006;
        
        // Mover luz
        const lightX = Math.cos(time) * orbitRadius;
        const lightZ = Math.sin(time) * orbitRadius;
        lightPosition.set(lightX, orbitHeight, lightZ);
        
        shaderMaterial.setVector3("uLightPosition", lightPosition);
        shaderMaterial.setVector3("uCameraPosition", camera.position);
        
        lightHelper.position.copyFrom(lightPosition);
        
        // Rotar el nudo
        knot.rotation.y = time * 0.2;
        knot.rotation.x = time * 0.1;
    });
    
    engine.runRenderLoop(() => {
        scene.render();
    });
    
    window.addEventListener('resize', () => {
        engine.resize();
    });
    
    statusDiv.textContent = 'Babylon.js Activo | Cel-shading';
    
    console.log('Babylon.js Cel-shading inicializado con éxito');
});
