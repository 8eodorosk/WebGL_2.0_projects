'use strict';

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2');


const { width, height } = canvas.getBoundingClientRect();
// console.log(width, height)
gl.canvas.width =  900; //window.innerWidth;
gl.canvas.height =  450; //window.innerHeight;


const loadShader = (src, type) =>{
    // console.log(src);
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        console.log(src, gl.getShaderInfoLog(shader));      
    }
    return shader;
}

const loadProgram = (vsSrc, fsSrc) => 
    Promise.all([
        fetch(vsSrc).then(res => res.text()).then(vertShader => loadShader(vertShader, gl.VERTEX_SHADER)),
        fetch(fsSrc).then(res => res.text()).then(fragShader => loadShader(fragShader, gl.FRAGMENT_SHADER))
    ])
    .then(shaders => {
        // console.log(shaders);
        const program = gl.createProgram();
        shaders.forEach(shader => gl.attachShader(program, shader));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
        }
        return program;
    });

    loadProgram('./shaders/vertex_shader.glsl','./shaders/fragment_shader.glsl').then(program => {

        gl.useProgram(program);

        // uniform location
        const time_loc = gl.getUniformLocation(program, 'time');
        const res_loc = gl.getUniformLocation(program, 'Res');
        const uLvertices = gl.getUniformLocation(program, 'vertsCount');
        const uLSr = gl.getUniformLocation(program, 'uMeshData');
        const uNormData = gl.getUniformLocation(program, 'uNormData');
        const mouse_loc = gl.getUniformLocation(program, 'mouse');
        const uLocRot = gl.getUniformLocation(program, "uRot");

        gl.deleteProgram(program);


        // fullscreen quad
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Int8Array([-3, 1, 1, -3, 1, 1 , -4, 2, -4, -4, 2, -4 ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.BYTE, !1, 0, 0);
        gl.bindVertexArray(null);


        Promise.all([
            fetch('./geometry/finalVertex.txt').then(res => res.text()),
            fetch('./geometry/finalNormal.txt').then(res => res.text())
        ]).then(texts => {
            
            const verts = texts[0].split(',');
            const vertsNorm = texts[1].split(',');

            console.log(verts);
            console.log(vertsNorm);


             // bind texture
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);


             const meshVerts = new Float32Array(verts);
            const vertsLenght = meshVerts.length / 3;
            console.log(vertsLenght);
            gl.uniform1i(uLvertices, vertsLenght);

            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, vertsLenght, 1, 0, gl.RGB, gl.FLOAT, meshVerts);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


            const textureNorm = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, textureNorm);

            const meshNorm = new Float32Array(vertsNorm);
            const normLength = meshNorm.length /3;
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, normLength, 1, 0, gl.RGB, gl.FLOAT, meshNorm);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);



            const cEv = gl.canvas.addEventListener; // time safing, less typing

            let rMat = mat4.create();

            mat4.identity(rMat);

            let mouseDown = !1;
            let mousePosition = [];

            function mDown(e) {
                mouseDown = !0;
                mousePosition = [e.clientX, e.clientY];
            };

            function mUp() {
                mouseDown = !1;
            };

            function mMove(e) {
                if (mouseDown) {
                    let newX = e.clientX;
                    let newY = e.clientY;
                    let deltaX = (newX - mousePosition[0]);
                    let deltaY = (newY - mousePosition[1]);
                    const nRot = mat4.create();
                    mat4.rotateY(nRot, nRot, (deltaX * 0.5) * 0.01);
                    mat4.rotateX(rMat, rMat, (deltaY * 0.5) * 0.01);
                    mat4.multiply(rMat, nRot, rMat);
                    mousePosition = [newX, newY];
                }
            }

            cEv('mousemove', mMove, !1);
            cEv('mousedown', mDown, !1);
            cEv('mouseup', mUp, !1);



            const fpsElem = document.querySelector("#fps");

            let then = 0;

            function render(now){
                now *= 0.001;
                const deltaTime = now-then;
                then = now;
                const fps = 1/deltaTime;
                fpsElem.textContent = fps.toFixed(1);

                draw(now);

                requestAnimationFrame(render);
            }
            requestAnimationFrame(render);

            // animation
            const draw = (clock) => {
                // clock *= 0.001;
                gl.viewport(0.0, 0.0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, textureNorm);
                gl.uniform1i(uLSr, 0);
                gl.uniform1i(uNormData, 1);
                gl.uniformMatrix4fv(uLocRot, false, rMat);
                gl.uniform1f(time_loc, clock);
                gl.uniform2f(mouse_loc, mousePosition[0], mousePosition[1]);
                gl.uniform2f(res_loc, width, height);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
                // requestAnimationFrame(draw);
            };
            // requestAnimationFrame(draw);
        });
    });