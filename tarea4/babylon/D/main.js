/**
 * Vertex Wobble Shader para Babylon.js
 * Modificación dinámica de vértices a lo largo de su vector normal en función del tiempo.
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
    
    // 1. Definir Shaders
    const vertexShaderCode = `
        precision highp float;
        
        attribute vec3 position;
        attribute vec3 normal;
        
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uFrequency;
        uniform float uSpeed;
        uniform float uDirection; // 0.0: X, 1.0: Y, 2.0: Z
        
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        
        void main() {
            // Seleccionar eje
            float coord = position.y;
            if (uDirection < 0.5) {
                coord = position.x;
            } else if (uDirection > 1.5) {
                coord = position.z;
            }
            
            // Calcular factor de ola
            float wave = sin(coord * uFrequency + uTime * uSpeed) * uAmplitude;
            
            // Deformar la posición a lo largo de la normal
            vec3 deformedPosition = position + normal * wave;
            
            vec4 worldPosition = world * vec4(deformedPosition, 1.0);
            vWorldPosition = worldPosition.xyz;
            
            mat3 normalMatrix = mat3(world);
            vWorldNormal = normalize(normalMatrix * normal);
            
            gl_Position = worldViewProjection * vec4(deformedPosition, 1.0);
        }
    `;
    
    const fragmentShaderCode = `
        precision highp float;
        
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
    
    // Registrar shaders en store
    BABYLON.Effect.ShadersStore["wobbleVertexShader"] = vertexShaderCode;
    BABYLON.Effect.ShadersStore["wobbleFragmentShader"] = fragmentShaderCode;
    
    // Crear ShaderMaterial
    const shaderMaterial = new BABYLON.ShaderMaterial(
        "wobbleMaterial",
        scene,
        {
            vertex: "wobble",
            fragment: "wobble",
        },
        {
            attributes: ["position", "normal"],
            uniforms: [
                "world", "worldViewProjection",
                "uTime", "uAmplitude", "uFrequency", "uSpeed", "uDirection",
                "uDiffuseColor", "uSpecularColor", "uShininess",
                "uLightPosition", "uCameraPosition"
            ]
        }
    );
    
    // Valores iniciales
    let diffuseColorHex = '#f59e0b'; // Naranja/oro
    let amplitude = 0.15;
    let frequency = 4.0;
    let speed = 2.5;
    let direction = 1.0; // Y
    let shininess = 64.0;
    
    function hexToColor3(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return new BABYLON.Color3(r, g, b);
    }
    
    const initDiff = hexToColor3(diffuseColorHex);
    
    shaderMaterial.setVector3("uDiffuseColor", new BABYLON.Vector3(initDiff.r, initDiff.g, initDiff.b));
    shaderMaterial.setVector3("uSpecularColor", new BABYLON.Vector3(1.0, 1.0, 1.0));
    shaderMaterial.setFloat("uShininess", shininess);
    
    shaderMaterial.setFloat("uTime", 0.0);
    shaderMaterial.setFloat("uAmplitude", amplitude);
    shaderMaterial.setFloat("uFrequency", frequency);
    shaderMaterial.setFloat("uSpeed", speed);
    shaderMaterial.setFloat("uDirection", direction);
    
    // Luz
    const lightPosition = new BABYLON.Vector3(3, 2.5, 2);
    shaderMaterial.setVector3("uLightPosition", lightPosition);
    shaderMaterial.setVector3("uCameraPosition", camera.position);
    
    // Malla: Esfera de alta resolución (más segmentos = deformación más fluida)
    const sphere = BABYLON.MeshBuilder.CreateSphere(
        "sphere",
        { diameter: 1.8, segments: 128 },
        scene
    );
    sphere.material = shaderMaterial;
    
    // ============================================
    // ELEMENTOS VISUALES AUXILIARES
    // ============================================
    
    // Grid
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.35, 0.1);
    groundMaterial.alpha = 0.18;
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
    const orbitRadius = 3.2;
    const orbitHeight = 2.2;
    for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        orbitPoints.push(new BABYLON.Vector3(x, orbitHeight, z));
    }
    
    const orbitLineMat = new BABYLON.StandardMaterial("orbitLineMat", scene);
    orbitLineMat.emissiveColor = new BABYLON.Color3(0.5, 0.35, 0.1);
    orbitLineMat.alpha = 0.25;
    
    const orbitLine = BABYLON.MeshBuilder.CreateLines("orbitLine", { points: orbitPoints }, scene);
    orbitLine.material = orbitLineMat;
    
    // Campo de estrellas
    const particleSystem = new BABYLON.ParticleSystem("stars", 1000, scene);
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
    particleSystem.emitRate = 70;
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
    
    // Amplitud
    document.getElementById('amplitude').addEventListener('input', (e) => {
        amplitude = parseFloat(e.target.value);
        document.getElementById('amplitudeValue').textContent = amplitude.toFixed(2);
        shaderMaterial.setFloat("uAmplitude", amplitude);
    });
    
    // Frecuencia
    document.getElementById('frequency').addEventListener('input', (e) => {
        frequency = parseFloat(e.target.value);
        document.getElementById('frequencyValue').textContent = frequency.toFixed(1);
        shaderMaterial.setFloat("uFrequency", frequency);
    });
    
    // Velocidad
    document.getElementById('speed').addEventListener('input', (e) => {
        speed = parseFloat(e.target.value);
        document.getElementById('speedValue').textContent = speed.toFixed(1);
        shaderMaterial.setFloat("uSpeed", speed);
    });
    
    // Dirección
    document.getElementById('direction').addEventListener('change', (e) => {
        const val = e.target.value;
        let axis = 1.0; // Y
        if (val === 'X') axis = 0.0;
        else if (val === 'Z') axis = 2.0;
        shaderMaterial.setFloat("uDirection", axis);
    });
    
    // ============================================
    // BUCLE DE ACTUALIZACIÓN
    // ============================================
    
    let totalTime = 0.0;
    scene.registerBeforeRender(() => {
        // Incrementar tiempo
        const delta = engine.getDeltaTime() / 1000.0;
        totalTime += delta;
        
        shaderMaterial.setFloat("uTime", totalTime);
        
        // Mover la luz en órbita
        const lightX = Math.cos(totalTime * 0.4) * orbitRadius;
        const lightZ = Math.sin(totalTime * 0.4) * orbitRadius;
        lightPosition.set(lightX, orbitHeight, lightZ);
        
        shaderMaterial.setVector3("uLightPosition", lightPosition);
        shaderMaterial.setVector3("uCameraPosition", camera.position);
        
        lightHelper.position.copyFrom(lightPosition);
        
        // Rotar esfera
        sphere.rotation.y = totalTime * 0.1;
    });
    
    engine.runRenderLoop(() => {
        scene.render();
    });
    
    window.addEventListener('resize', () => {
        engine.resize();
    });
    
    document.getElementById('status').textContent = 'Babylon.js Activo | Vertex Wobble';
    
    console.log('Babylon.js Vertex Wobble inicializado con éxito');
});
