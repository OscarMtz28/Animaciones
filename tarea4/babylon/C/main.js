/**
 * Normal Map (Bump) Shader para Babylon.js (Método de Derivadas de Pantalla - Sin Tangentes)
 * Compara dos esferas con geometría idéntica, una lisa y otra perturbada por un mapa de normales procedural.
 * Utiliza dFdx/dFdy en el Fragment Shader para calcular el espacio tangente al vuelo, asegurando compatibilidad total.
 */

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.03, 0.09, 1.0);

    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        4.5,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 10;
    camera.wheelPrecision = 50;

    // 1. Definir los Shaders (Sin atributo tangent)
    const vertexShaderCode = `
        precision highp float;
        
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
            vec4 worldPosition = world * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            
            // Normal en espacio de mundo
            mat3 normalMatrix = mat3(world);
            vWorldNormal = normalize(normalMatrix * normal);
            
            vUv = uv;
            gl_Position = worldViewProjection * vec4(position, 1.0);
        }
    `;

    const fragmentShaderCode = `
        precision highp float;
        
        uniform vec3 uDiffuseColor;
        uniform vec3 uSpecularColor;
        uniform float uShininess;
        uniform vec3 uLightPosition;
        uniform vec3 uCameraPosition;
        
        uniform sampler2D uNormalMap;
        uniform float uUseNormalMap;
        uniform float uNormalScale;
        
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        // Perturbación de normal usando derivadas espaciales en pantalla (TBN dinámico)
        vec3 perturbNormal(vec3 surf_pos, vec3 surf_norm, vec2 uv) {
            vec2 scaledUv = uv * uNormalScale;
            vec3 normalSample = texture2D(uNormalMap, scaledUv).xyz * 2.0 - 1.0;
            
            // Obtener derivadas de posición y de coordenadas de textura
            vec3 p_dx = dFdx(surf_pos);
            vec3 p_dy = dFdy(surf_pos);
            vec2 tc_dx = dFdx(scaledUv);
            vec2 tc_dy = dFdy(scaledUv);
            
            // Resolver vectores tangente (T) y bitangente (B) en espacio de mundo
            vec3 p_dy_x_N = cross(p_dy, surf_norm);
            vec3 N_x_p_dx = cross(surf_norm, p_dx);
            
            vec3 T = p_dy_x_N * tc_dx.x + N_x_p_dx * tc_dy.x;
            vec3 B = p_dy_x_N * tc_dx.y + N_x_p_dx * tc_dy.y;
            
            float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
            return normalize(T * (normalSample.x * invmax) + B * (normalSample.y * invmax) + surf_norm * normalSample.z);
        }
        
        void main() {
            vec3 normal = normalize(vWorldNormal);
            
            if (uUseNormalMap > 0.5) {
                normal = perturbNormal(vWorldPosition, normal, vUv);
            }
            
            // Blinn-Phong en Espacio de Mundo
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
            
            vec3 color = ambient + diffuse + specular;
            gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    `;

    // Registrar shaders en store
    BABYLON.Effect.ShadersStore["bumpVertexShader"] = vertexShaderCode;
    BABYLON.Effect.ShadersStore["bumpFragmentShader"] = fragmentShaderCode;

    // 2. Crear Textura Dinámica para el Mapa de Normales
    const normalTexture = new BABYLON.DynamicTexture("normalTexture", { width: 512, height: 512 }, scene, true);
    const ctx = normalTexture.getContext();

    // Dibujar patrón de normales en la textura dinámica
    const freq = 0.09;
    const amp = 4.0;
    const width = 512;
    const height = 512;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // h(x,y) = sin(x*freq)*cos(y*freq)
            const dhdx = freq * Math.cos(x * freq) * Math.cos(y * freq) * amp;
            const dhdy = -freq * Math.sin(x * freq) * Math.sin(y * freq) * amp;

            const nx = -dhdx;
            const ny = -dhdy;
            const nz = 1.0;

            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const r = ((nx / len) * 0.5 + 0.5) * 255;
            const g = ((ny / len) * 0.5 + 0.5) * 255;
            const b = ((nz / len) * 0.5 + 0.5) * 255;

            const idx = (y * width + x) * 4;
            data[idx] = Math.floor(r);
            data[idx + 1] = Math.floor(g);
            data[idx + 2] = Math.floor(b);
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    normalTexture.update(); // Actualizar textura en GPU

    normalTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    normalTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

    // 3. Crear Materiales (Atributos simplificados)
    // Izquierda (Liso)
    const materialSmooth = new BABYLON.ShaderMaterial(
        "smoothMaterial",
        scene,
        { vertex: "bump", fragment: "bump" },
        {
            attributes: ["position", "normal", "uv"],
            uniforms: [
                "world", "worldViewProjection",
                "uDiffuseColor", "uSpecularColor", "uShininess",
                "uLightPosition", "uCameraPosition",
                "uUseNormalMap", "uNormalScale"
            ],
            samplers: ["uNormalMap"]
        }
    );

    // Derecha (Bumped)
    const materialBump = new BABYLON.ShaderMaterial(
        "bumpMaterial",
        scene,
        { vertex: "bump", fragment: "bump" },
        {
            attributes: ["position", "normal", "uv"],
            uniforms: [
                "world", "worldViewProjection",
                "uDiffuseColor", "uSpecularColor", "uShininess",
                "uLightPosition", "uCameraPosition",
                "uUseNormalMap", "uNormalScale"
            ],
            samplers: ["uNormalMap"]
        }
    );

    // Valores iniciales
    let diffuseColorHex = '#5588ff';
    let shininess = 40.0;
    let normalScale = 2.0;

    function hexToColor3(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return new BABYLON.Color3(r, g, b);
    }

    const initDiff = hexToColor3(diffuseColorHex);

    // Configurar smooth material
    materialSmooth.setVector3("uDiffuseColor", new BABYLON.Vector3(initDiff.r, initDiff.g, initDiff.b));
    materialSmooth.setVector3("uSpecularColor", new BABYLON.Vector3(1.0, 1.0, 1.0));
    materialSmooth.setFloat("uShininess", shininess);
    materialSmooth.setFloat("uUseNormalMap", 0.0); // DESACTIVADO
    materialSmooth.setFloat("uNormalScale", normalScale);
    materialSmooth.setTexture("uNormalMap", normalTexture);

    // Configurar bump material
    materialBump.setVector3("uDiffuseColor", new BABYLON.Vector3(initDiff.r, initDiff.g, initDiff.b));
    materialBump.setVector3("uSpecularColor", new BABYLON.Vector3(1.0, 1.0, 1.0));
    materialBump.setFloat("uShininess", shininess);
    materialBump.setFloat("uUseNormalMap", 1.0); // ACTIVADO
    materialBump.setFloat("uNormalScale", normalScale);
    materialBump.setTexture("uNormalMap", normalTexture);

    // 4. Crear Mallas (Geometría estándar sin necesidad de calcular tangentes en JS)
    const sphereLeft = BABYLON.MeshBuilder.CreateSphere("sphereLeft", { diameter: 1.7, segments: 128 }, scene);
    sphereLeft.position.set(-1.2, 0, 0);

    const sphereRight = BABYLON.MeshBuilder.CreateSphere("sphereRight", { diameter: 1.7, segments: 128 }, scene);
    sphereRight.position.set(1.2, 0, 0);

    sphereLeft.material = materialSmooth;
    sphereRight.material = materialBump;

    // ============================================
    // ELEMENTOS VISUALES AUXILIARES
    // ============================================

    // Grid
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.5);
    groundMaterial.alpha = 0.2;
    groundMaterial.wireframe = true;

    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 12, height: 12, subdivisions: 24 }, scene);
    ground.material = groundMaterial;
    ground.position.y = -1.2;

    // Luz visual
    const lightHelperMat = new BABYLON.StandardMaterial("lightHelperMat", scene);
    lightHelperMat.emissiveColor = new BABYLON.Color3(1.0, 0.6, 0.2);
    lightHelperMat.diffuseColor = new BABYLON.Color3(1.0, 0.6, 0.2);

    const lightHelper = BABYLON.MeshBuilder.CreateSphere("lightHelper", { diameter: 0.16, segments: 16 }, scene);
    lightHelper.material = lightHelperMat;

    // Órbita
    const orbitPoints = [];
    const orbitRadius = 3.5;
    const orbitHeight = 2.0;
    for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        orbitPoints.push(new BABYLON.Vector3(x, orbitHeight, z));
    }

    const orbitLineMat = new BABYLON.StandardMaterial("orbitLineMat", scene);
    orbitLineMat.emissiveColor = new BABYLON.Color3(0.35, 0.55, 1.0);
    orbitLineMat.alpha = 0.25;

    const orbitLine = BABYLON.MeshBuilder.CreateLines("orbitLine", { points: orbitPoints }, scene);
    orbitLine.material = orbitLineMat;

    // Campo de estrellas
    const particleSystem = new BABYLON.ParticleSystem("stars", 800, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/flare.png", scene);
    particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    particleSystem.minEmitBox = new BABYLON.Vector3(-25, -15, -20);
    particleSystem.maxEmitBox = new BABYLON.Vector3(25, 15, 20);
    particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.8);
    particleSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 0.6);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    particleSystem.minSize = 0.03;
    particleSystem.maxSize = 0.08;
    particleSystem.minLifeTime = 8;
    particleSystem.maxLifeTime = 15;
    particleSystem.emitRate = 60;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    particleSystem.direction1 = new BABYLON.Vector3(-0.3, -0.3, -0.3);
    particleSystem.direction2 = new BABYLON.Vector3(0.3, 0.3, 0.3);
    particleSystem.minEmitPower = 0.05;
    particleSystem.maxEmitPower = 0.15;
    particleSystem.updateSpeed = 0.01;
    particleSystem.start();

    // ============================================
    // INTERFAZ DE USUARIO
    // ============================================

    // Color de luz
    document.getElementById('diffuseColor').addEventListener('input', (e) => {
        const color = hexToColor3(e.target.value);
        const vecColor = new BABYLON.Vector3(color.r, color.g, color.b);
        materialSmooth.setVector3("uDiffuseColor", vecColor);
        materialBump.setVector3("uDiffuseColor", vecColor);
    });

    // Shininess
    document.getElementById('shininess').addEventListener('input', (e) => {
        shininess = parseFloat(e.target.value);
        document.getElementById('shininessValue').textContent = shininess;
        materialSmooth.setFloat("uShininess", shininess);
        materialBump.setFloat("uShininess", shininess);
    });

    // Escala del mapa de normales
    document.getElementById('mapScale').addEventListener('input', (e) => {
        normalScale = parseFloat(e.target.value);
        document.getElementById('mapScaleValue').textContent = normalScale.toFixed(1);
        materialSmooth.setFloat("uNormalScale", normalScale);
        materialBump.setFloat("uNormalScale", normalScale);
    });

    // ============================================
    // BUCLE DE RENDERIZADO
    // ============================================

    let time = 0;
    const lightPosition = new BABYLON.Vector3(0, orbitHeight, orbitRadius);

    scene.registerBeforeRender(() => {
        time += 0.007;

        // Mover la luz
        const lightX = Math.cos(time) * orbitRadius;
        const lightZ = Math.sin(time) * orbitRadius;
        lightPosition.set(lightX, orbitHeight, lightZ);

        materialSmooth.setVector3("uLightPosition", lightPosition);
        materialBump.setVector3("uLightPosition", lightPosition);
        lightHelper.position.copyFrom(lightPosition);

        // Posición de cámara para cálculos especulares
        materialSmooth.setVector3("uCameraPosition", camera.position);
        materialBump.setVector3("uCameraPosition", camera.position);

        // Rotar esferas
        sphereLeft.rotation.y = time * 0.15;
        sphereRight.rotation.y = time * 0.15;
    });

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener('resize', () => {
        engine.resize();
    });

    document.getElementById('status').textContent = 'Babylon.js Activo | Comparación Normal Map';

    console.log('Babylon.js Normal Map inicializado con éxito');
});
