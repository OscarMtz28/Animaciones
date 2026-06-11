/**
 * Blinn-Phong Shader para Babylon.js
 * Implementación completa de iluminación difusa (Lambert) + especular (Blinn-Phong) en Espacio de Mundo
 */

window.addEventListener('DOMContentLoaded', () => {
    // Obtener el canvas
    const canvas = document.getElementById('renderCanvas');
    
    // Crear el motor de Babylon.js
    const engine = new BABYLON.Engine(canvas, true);
    
    // Crear la escena
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.01, 0.03, 0.09, 1.0);
    
    // Crear cámara con controles de órbita
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
    
    // Definir los shaders en espacio de mundo
    const vertexShaderCode = `
        precision highp float;
        
        // Atributos
        attribute vec3 position;
        attribute vec3 normal;
        
        // Uniforms
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        
        // Varying
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        
        void main() {
            // Calcular posición en espacio de mundo
            vec4 worldPosition = world * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            
            // Calcular normal en espacio de mundo (asumiendo escala uniforme)
            mat3 normalMatrix = mat3(world);
            vWorldNormal = normalize(normalMatrix * normal);
            
            // Posición proyectada final
            gl_Position = worldViewProjection * vec4(position, 1.0);
        }
    `;
    
    const fragmentShaderCode = `
        precision highp float;
        
        // Uniforms
        uniform vec3 uDiffuseColor;
        uniform vec3 uSpecularColor;
        uniform float uShininess;
        uniform vec3 uLightPosition;
        uniform vec3 uCameraPosition;
        
        // Varying
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        
        void main() {
            // Normalizar vectores
            vec3 normal = normalize(vWorldNormal);
            vec3 lightDir = normalize(uLightPosition - vWorldPosition);
            vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
            
            // Componente Difusa (Ley de Lambert)
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = uDiffuseColor * diff;
            
            // Componente Especular Blinn-Phong (Vector medio)
            vec3 halfVec = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfVec), 0.0), uShininess);
            vec3 specular = uSpecularColor * spec;
            
            // Componente Ambiente
            vec3 ambient = vec3(0.08, 0.1, 0.18);
            
            // Combinar componentes
            vec3 color = ambient + diffuse + specular;
            color = clamp(color, 0.0, 1.0);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    // Registrar los shaders en Babylon.js
    BABYLON.Effect.ShadersStore["blinnPhongVertexShader"] = vertexShaderCode;
    BABYLON.Effect.ShadersStore["blinnPhongFragmentShader"] = fragmentShaderCode;
    
    // Crear el material con shader personalizado
    const shaderMaterial = new BABYLON.ShaderMaterial(
        "blinnPhongMaterial",
        scene,
        {
            vertex: "blinnPhong",
            fragment: "blinnPhong",
        },
        {
            attributes: ["position", "normal"],
            uniforms: [
                "world", "worldViewProjection",
                "uDiffuseColor", "uSpecularColor", "uShininess",
                "uLightPosition", "uCameraPosition"
            ]
        }
    );
    
    // Configurar valores iniciales
    let diffuseColorHex = '#ff8844';
    let specularColorHex = '#ffffff';
    let shininess = 32;
    
    // Función para convertir hex a Color3
    function hexToColor3(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return new BABYLON.Color3(r, g, b);
    }
    
    // Aplicar valores iniciales
    const initialDiffuse = hexToColor3(diffuseColorHex);
    const initialSpecular = hexToColor3(specularColorHex);
    shaderMaterial.setVector3("uDiffuseColor", new BABYLON.Vector3(initialDiffuse.r, initialDiffuse.g, initialDiffuse.b));
    shaderMaterial.setVector3("uSpecularColor", new BABYLON.Vector3(initialSpecular.r, initialSpecular.g, initialSpecular.b));
    shaderMaterial.setFloat("uShininess", shininess);
    
    // Posición de la luz (se moverá)
    const lightPosition = new BABYLON.Vector3(3, 2.5, 2);
    shaderMaterial.setVector3("uLightPosition", lightPosition);
    
    // Posición de la cámara
    shaderMaterial.setVector3("uCameraPosition", camera.position);
    
    // Crear esfera con alta resolución
    const sphere = BABYLON.MeshBuilder.CreateSphere(
        "sphere",
        { diameter: 1.8, segments: 128 },
        scene
    );
    sphere.material = shaderMaterial;
    sphere.position = new BABYLON.Vector3(0, 0, 0);
    
    // ============================================
    // ELEMENTOS VISUALES AUXILIARES
    // ============================================
    
    // Grid helper (suelo)
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.5);
    groundMaterial.alpha = 0.25;
    groundMaterial.wireframe = true;
    
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        { width: 12, height: 12, subdivisions: 24 },
        scene
    );
    ground.material = groundMaterial;
    ground.position.y = -1.2;
    
    // Luz auxiliar visual (pequeña esfera que muestra la posición de la luz)
    const lightHelperMat = new BABYLON.StandardMaterial("lightHelperMat", scene);
    lightHelperMat.emissiveColor = new BABYLON.Color3(1.0, 0.6, 0.2);
    lightHelperMat.diffuseColor = new BABYLON.Color3(1.0, 0.6, 0.2);
    
    const lightHelper = BABYLON.MeshBuilder.CreateSphere(
        "lightHelper",
        { diameter: 0.16, segments: 16 },
        scene
    );
    lightHelper.material = lightHelperMat;
    
    // Línea de órbita para la luz
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
    orbitLineMat.emissiveColor = new BABYLON.Color3(1.0, 0.53, 0.27);
    orbitLineMat.alpha = 0.3;
    
    const orbitLine = BABYLON.MeshBuilder.CreateLines(
        "orbitLine",
        { points: orbitPoints },
        scene
    );
    orbitLine.material = orbitLineMat;
    
    // Crear sistema de partículas para las estrellas
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
    
    const statusDiv = document.getElementById('status');
    
    // Color difuso
    const diffuseInput = document.getElementById('diffuseColor');
    diffuseInput.addEventListener('input', (e) => {
        const color = hexToColor3(e.target.value);
        shaderMaterial.setVector3("uDiffuseColor", new BABYLON.Vector3(color.r, color.g, color.b));
    });
    
    // Color especular
    const specularInput = document.getElementById('specularColor');
    specularInput.addEventListener('input', (e) => {
        const color = hexToColor3(e.target.value);
        shaderMaterial.setVector3("uSpecularColor", new BABYLON.Vector3(color.r, color.g, color.b));
    });
    
    // Shininess
    const shininessInput = document.getElementById('shininess');
    const shininessValue = document.getElementById('shininessValue');
    shininessInput.addEventListener('input', (e) => {
        shininess = parseFloat(e.target.value);
        shininessValue.textContent = shininess;
        shaderMaterial.setFloat("uShininess", shininess);
    });
    
    // ============================================
    // ANIMACIÓN - LUZ EN MOVIMIENTO
    // ============================================
    
    let time = 0;
    const lightOrbitRadius = 3.2;
    const lightHeight = 2.2;
    
    // Actualizar posición de la luz en cada frame
    scene.registerBeforeRender(() => {
        // Actualizar tiempo
        time += 0.008;
        
        // Mover la luz en órbita circular
        const lightX = Math.cos(time) * lightOrbitRadius;
        const lightZ = Math.sin(time) * lightOrbitRadius;
        lightPosition.set(lightX, lightHeight, lightZ);
        
        // Actualizar uniforme de la luz
        shaderMaterial.setVector3("uLightPosition", lightPosition);
        
        // Actualizar posición de la cámara (en espacio de mundo)
        shaderMaterial.setVector3("uCameraPosition", camera.position);
        
        // Actualizar posición visual de la luz auxiliar
        lightHelper.position.copyFrom(lightPosition);
        
        // Rotación suave de la esfera
        sphere.rotation.y = time * 0.1;
    });
    
    // ============================================
    // RENDER LOOP
    // ============================================
    
    engine.runRenderLoop(() => {
        scene.render();
    });
    
    // Manejar resize de ventana
    window.addEventListener('resize', () => {
        engine.resize();
    });
    
    // Actualizar estado
    statusDiv.textContent = 'Babylon.js Activo | Blinn-Phong';
    
    console.log('Babylon.js Blinn-Phong inicializado con éxito');
});