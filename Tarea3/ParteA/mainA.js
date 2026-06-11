// ======================================================================
// 1. SHADERS (GLSL 300 es) - Blinn-Phong Difuso + Especular
// ======================================================================
const vertexShaderSource = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_normalMatrix;

out vec3 v_normal;
out vec3 v_fragPos;

void main() {
    vec4 worldPosition = u_model * vec4(a_position, 1.0);
    v_fragPos = worldPosition.xyz;
    v_normal = mat3(u_normalMatrix) * a_normal;
    gl_Position = u_projection * u_view * worldPosition;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_fragPos;

uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform vec3 u_baseColor;
uniform float u_shininess;

out vec4 outColor;

void main() {
    vec3 lightColor = vec3(1.0, 1.0, 1.0);
    vec3 ambient = 0.15 * u_baseColor;

    vec3 norm = normalize(v_normal);
    vec3 lightDir = normalize(u_lightPos - v_fragPos);
    vec3 viewDir = normalize(u_viewPos - v_fragPos);

    // Lambert
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * u_baseColor;

    // Blinn-Phong
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(norm, halfwayDir), 0.0), u_shininess);
    vec3 specular = spec * lightColor;

    vec3 result = ambient + diffuse + specular;
    outColor = vec4(result, 1.0);
}
`;

// ======================================================================
// 2. LIBRERÍA MATEMÁTICA MINIMALISTA Y STACK DE MATRICES
// ======================================================================
const Mat4 = {
    create: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    perspective: (out, fovy, aspect, near, far) => {
        let f = 1.0 / Math.tan(fovy / 2);
        out.fill(0);
        out[0] = f / aspect; out[5] = f;
        out[10] = (far + near) / (near - far); out[11] = -1;
        out[14] = (2 * far * near) / (near - far);
    },
    lookAt: (out, eye, center, up) => {
        let z0 = eye[0]-center[0], z1 = eye[1]-center[1], z2 = eye[2]-center[2];
        let len = 1/Math.hypot(z0, z1, z2); z0*=len; z1*=len; z2*=len;
        let x0 = up[1]*z2 - up[2]*z1, x1 = up[2]*z0 - up[0]*z2, x2 = up[0]*z1 - up[1]*z0;
        len = 1/Math.hypot(x0, x1, x2); x0*=len; x1*=len; x2*=len;
        let y0 = z1*x2 - z2*x1, y1 = z2*x0 - z0*x2, y2 = z0*x1 - z1*x0;
        out[0]=x0; out[1]=y0; out[2]=z0; out[3]=0;
        out[4]=x1; out[5]=y1; out[6]=z1; out[7]=0;
        out[8]=x2; out[9]=y2; out[10]=z2; out[11]=0;
        out[12]=-(x0*eye[0] + x1*eye[1] + x2*eye[2]);
        out[13]=-(y0*eye[0] + y1*eye[1] + y2*eye[2]);
        out[14]=-(z0*eye[0] + z1*eye[1] + z2*eye[2]); out[15]=1;
    },
    multiply: (out, a, b) => {
        let a00=a[0], a01=a[1], a02=a[2], a03=a[3], a10=a[4], a11=a[5], a12=a[6], a13=a[7];
        let a20=a[8], a21=a[9], a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
        let b0=b[0], b1=b[1], b2=b[2], b3=b[3];
        out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30; out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32; out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        b0=b[4]; b1=b[5]; b2=b[6]; b3=b[7];
        out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30; out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32; out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        b0=b[8]; b1=b[9]; b2=b[10]; b3=b[11];
        out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30; out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[10]= b0*a02 + b1*a12 + b2*a22 + b3*a32; out[11]= b0*a03 + b1*a13 + b2*a23 + b3*a33;
        b0=b[12]; b1=b[13]; b2=b[14]; b3=b[15];
        out[12]= b0*a00 + b1*a10 + b2*a20 + b3*a30; out[13]= b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[14]= b0*a02 + b1*a12 + b2*a22 + b3*a32; out[15]= b0*a03 + b1*a13 + b2*a23 + b3*a33;
    },
    translate: (out, m, v) => {
        let x=v[0], y=v[1], z=v[2];
        out[12] = m[0]*x + m[4]*y + m[8]*z + m[12];
        out[13] = m[1]*x + m[5]*y + m[9]*z + m[13];
        out[14] = m[2]*x + m[6]*y + m[10]*z + m[14];
        out[15] = m[3]*x + m[7]*y + m[11]*z + m[15];
    },
    scale: (out, m, v) => {
        let x=v[0], y=v[1], z=v[2];
        out[0]=m[0]*x; out[1]=m[1]*x; out[2]=m[2]*x; out[3]=m[3]*x;
        out[4]=m[4]*y; out[5]=m[5]*y; out[6]=m[6]*y; out[7]=m[7]*y;
        out[8]=m[8]*z; out[9]=m[9]*z; out[10]=m[10]*z; out[11]=m[11]*z;
    },
    rotateY: (out, m, rad) => {
        let s=Math.sin(rad), c=Math.cos(rad);
        let m00=m[0], m01=m[1], m02=m[2], m03=m[3], m20=m[8], m21=m[9], m22=m[10], m23=m[11];
        out[0] = m00*c - m20*s; out[1] = m01*c - m21*s; out[2] = m02*c - m22*s; out[3] = m03*c - m23*s;
        out[8] = m00*s + m20*c; out[9] = m01*s + m21*c; out[10]= m02*s + m22*c; out[11]= m03*s + m23*c;
    },
    rotateZ: (out, m, rad) => {
        let s=Math.sin(rad), c=Math.cos(rad);
        let m00=m[0], m01=m[1], m02=m[2], m03=m[3], m10=m[4], m11=m[5], m12=m[6], m13=m[7];
        out[0] = m00*c + m10*s; out[1] = m01*c + m11*s; out[2] = m02*c + m12*s; out[3] = m03*c + m13*s;
        out[4] = m10*c - m00*s; out[5] = m11*c - m01*s; out[6] = m12*c - m02*s; out[7] = m13*c - m03*s;
    },
    transpose: (out, m) => {
        out[0]=m[0]; out[1]=m[4]; out[2]=m[8]; out[3]=m[12];
        out[4]=m[1]; out[5]=m[5]; out[6]=m[9]; out[7]=m[13];
        out[8]=m[2]; out[9]=m[6]; out[10]=m[10]; out[11]=m[14];
        out[12]=m[3]; out[13]=m[7]; out[14]=m[11]; out[15]=m[15];
    }
};

// Pila de matrices para las jerarquías (push y pop manuales)
class MatrixStack {
    constructor() {
        this.stack = [];
        this.current = Mat4.create();
    }
    push() { this.stack.push(new Float32Array(this.current)); }
    pop() { this.current = this.stack.pop(); }
    translate(x, y, z) { Mat4.translate(this.current, this.current, [x, y, z]); }
    scale(x, y, z) { Mat4.scale(this.current, this.current, [x, y, z]); }
    rotateY(rad) { Mat4.rotateY(this.current, this.current, rad); }
    rotateZ(rad) { Mat4.rotateZ(this.current, this.current, rad); }
}

// ======================================================================
// 3. GENERADOR DE GEOMETRÍA MANUAL (Cubo para el brazo)
// ======================================================================
function createCubeData() {
    // 24 vértices para normales rígidas
    const p = [
        -1,-1, 1,   1,-1, 1,   1, 1, 1,  -1, 1, 1, // Front
        -1,-1,-1,  -1, 1,-1,   1, 1,-1,   1,-1,-1, // Back
        -1, 1,-1,  -1, 1, 1,   1, 1, 1,   1, 1,-1, // Top
        -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1, // Bottom
         1,-1,-1,   1, 1,-1,   1, 1, 1,   1,-1, 1, // Right
        -1,-1,-1,  -1,-1, 1,  -1, 1, 1,  -1, 1,-1  // Left
    ];
    const n = [
         0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
         0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,
         0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
         0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,
         1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
    ];
    const i = [
        0,1,2, 0,2,3,       4,5,6, 4,6,7,
        8,9,10, 8,10,11,    12,13,14, 12,14,15,
        16,17,18, 16,18,19, 20,21,22, 20,22,23
    ];
    return { positions: new Float32Array(p), normals: new Float32Array(n), indices: new Uint16Array(i) };
}

// ======================================================================
// 4. INICIALIZACIÓN WEBGL2
// ======================================================================
const canvas = document.getElementById('glcanvas');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const gl = canvas.getContext('webgl2');

if (!gl) alert('WebGL 2 no está disponible en este navegador');

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

// Uniform Locations
const locModel = gl.getUniformLocation(program, "u_model");
const locView = gl.getUniformLocation(program, "u_view");
const locProj = gl.getUniformLocation(program, "u_projection");
const locNormalMat = gl.getUniformLocation(program, "u_normalMatrix");
const locColor = gl.getUniformLocation(program, "u_baseColor");
const locLightPos = gl.getUniformLocation(program, "u_lightPos");
const locViewPos = gl.getUniformLocation(program, "u_viewPos");
const locShininess = gl.getUniformLocation(program, "u_shininess");

function setupVAO(geoData) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geoData.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geoData.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geoData.indices, gl.STATIC_DRAW);

    return { vao, count: geoData.indices.length };
}

const vaoCube = setupVAO(createCubeData());

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.05, 0.05, 0.08, 1.0);

// ======================================================================
// 5. LÓGICA DE RENDERIZADO (JERARQUÍA DEL BRAZO)
// ======================================================================
const mStack = new MatrixStack();

let projMatrix = Mat4.create();
let viewMatrix = Mat4.create();
let normalMatrix = Mat4.create(); 

function drawMesh(vaoInfo, r, g, b, shininess = 32.0) {
    gl.uniformMatrix4fv(locModel, false, mStack.current);
    
    // NormalMatrix = transpose(inverse(model)) aproximado con transpose 
    // (funciona correctamente si usamos escalas uniformes en el pipeline general)
    Mat4.transpose(normalMatrix, mStack.current);
    gl.uniformMatrix4fv(locNormalMat, false, normalMatrix);

    gl.uniform3f(locColor, r, g, b);
    gl.uniform1f(locShininess, shininess);

    gl.bindVertexArray(vaoInfo.vao);
    gl.drawElements(gl.TRIANGLES, vaoInfo.count, gl.UNSIGNED_SHORT, 0);
}

// ======================================================================
// 6. RENDER LOOP
// ======================================================================
function render(time) {
    let t = time * 0.001;
    
    // Auto-Resize del canvas
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Configuración de la Cámara y Proyección
    Mat4.perspective(projMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
    gl.uniformMatrix4fv(locProj, false, projMatrix);

    const viewPos = [0, 8, 15];
    Mat4.lookAt(viewMatrix, viewPos, [0, 4, 0], [0, 1, 0]);
    gl.uniformMatrix4fv(locView, false, viewMatrix);
    gl.uniform3f(locViewPos, viewPos[0], viewPos[1], viewPos[2]);
    gl.uniform3f(locLightPos, 10, 20, 10);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Animaciones calculadas
    let rBaseY = Math.sin(t) * 1.5;
    let rHombroZ = Math.sin(t * 1.2) * 0.6;
    let rCodoZ = Math.cos(t * 1.5) * 0.8;
    let rMunecaZ = Math.sin(t * 2.0) * 0.5;

    // ----- CONSTRUCCIÓN JERÁRQUICA -----
    mStack.current = Mat4.create(); 
    
    // 1. Base
    mStack.push();
        mStack.translate(0, 0.5, 0);
        mStack.rotateY(rBaseY);
        
        mStack.push(); 
            mStack.scale(2, 0.5, 2);
            drawMesh(vaoCube, 0.3, 0.3, 0.3); // Base Gris
        mStack.pop();

        // 2. Hombro
        mStack.translate(0, 0.5, 0); 
        mStack.rotateZ(rHombroZ);
        
        mStack.push();
            mStack.translate(0, 2, 0); 
            mStack.scale(0.5, 2, 0.5);
            drawMesh(vaoCube, 0.0, 0.5, 1.0); // Hombro Azul
        mStack.pop();

        // 3. Codo
        mStack.translate(0, 4, 0); 
        mStack.rotateZ(rCodoZ);
        
        mStack.push();
            mStack.translate(0, 1.5, 0); 
            mStack.scale(0.4, 1.5, 0.4);
            drawMesh(vaoCube, 1.0, 0.2, 0.2); // Codo Rojo
        mStack.pop();

        // 4. Muñeca
        mStack.translate(0, 3, 0);
        mStack.rotateZ(rMunecaZ);
        
        mStack.push();
            mStack.translate(0, 1, 0);
            mStack.scale(0.3, 1, 0.3);
            drawMesh(vaoCube, 1.0, 0.8, 0.0); // Muñeca Amarilla
        mStack.pop();

        // 5. Dedos (Pinza)
        mStack.translate(0, 2, 0); 
        let apertura = 0.3 + (Math.sin(t * 4) * 0.2); 
        
        // Dedo Izquierdo
        mStack.push();
            mStack.translate(-0.3, 0, 0);
            mStack.rotateZ(apertura); 
            mStack.translate(0, 0.5, 0);
            mStack.scale(0.1, 0.5, 0.2);
            drawMesh(vaoCube, 0.2, 0.8, 0.2); // Dedo Verde
        mStack.pop();

        // Dedo Derecho
        mStack.push();
            mStack.translate(0.3, 0, 0);
            mStack.rotateZ(-apertura); 
            mStack.translate(0, 0.5, 0);
            mStack.scale(0.1, 0.5, 0.2);
            drawMesh(vaoCube, 0.2, 0.8, 0.2); // Dedo Verde
        mStack.pop();

    mStack.pop(); // Fin de la jerarquía global

    requestAnimationFrame(render);
}
requestAnimationFrame(render);