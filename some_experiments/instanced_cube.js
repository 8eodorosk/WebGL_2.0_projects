// <reference path="js/glMatrix-0.9.5.max.js" />


document.addEventListener("DOMContentLoaded", start);
var gl;


function createCube()
{

    var cube = {};

    cube.vertices = [
      -0.5, -0.5, -0.5,
      0.5, -0.5, -0.5,
      0.5, 0.5, -0.5,
      0.5, 0.5, -0.5,
     -0.5, 0.5, -0.5,
     -0.5, -0.5, -0.5,

     -0.5, -0.5, 0.5,
      0.5, -0.5, 0.5,
      0.5, 0.5, 0.5,
      0.5, 0.5, 0.5,
     -0.5, 0.5, 0.5,
     -0.5, -0.5, 0.5,

     -0.5, 0.5, 0.5,
     -0.5, 0.5, -0.5,
     -0.5, -0.5, -0.5,
     -0.5, -0.5, -0.5,
     -0.5, -0.5, 0.5,
     -0.5, 0.5, 0.5,

      0.5, 0.5, 0.5,
      0.5, 0.5, -0.5,
      0.5, -0.5, -0.5,
      0.5, -0.5, -0.5,
      0.5, -0.5, 0.5,
      0.5, 0.5, 0.5,

     -0.5, -0.5, -0.5,
      0.5, -0.5, -0.5,
      0.5, -0.5, 0.5,
      0.5, -0.5, 0.5,
     -0.5, -0.5, 0.5,
     -0.5, -0.5, -0.5,

     -0.5, 0.5, -0.5,
      0.5, 0.5, -0.5,
      0.5, 0.5, 0.5,
      0.5, 0.5, 0.5,
     -0.5, 0.5, 0.5,
     -0.5, 0.5, -0.5
    ];


    cube.colors = [];

    var faceColors = [
        [1.0, 0.0, 0.0, 1.0], // Front face
        [0.0, 1.0, 0.0, 1.0], // Back face
        [0.0, 0.0, 1.0, 1.0], // Top face
        [1.0, 1.0, 0.0, 1.0], // Bottom face
        [1.0, 0.0, 1.0, 1.0], // Right face
        [0.0, 1.0, 1.0, 1.0] // Left face
    ];

    faceColors.forEach(function (color) {
        for (var i = 0 ; i < 6 ; i++) {
            cube.colors = cube.colors.concat(color);
        }
    }
    );


    cube.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cube.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);


    cube.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cube.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    cube.vertexShader = getAndCompileShader("vertexShader");
    cube.fragmentshader = getAndCompileShader("fragmentShader");
    cube.shaderProgram = gl.createProgram();
    gl.attachShader(cube.shaderProgram, cube.vertexShader);
    gl.attachShader(cube.shaderProgram, cube.fragmentshader);
    gl.linkProgram(cube.shaderProgram);

   if (!gl.getProgramParameter(cube.shaderProgram, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(cube.shaderProgram));
    }


    cube.vao = gl.createVertexArray();
    gl.bindVertexArray(cube.vao);

    cube.positionAttributeLocation = gl.getAttribLocation(cube.shaderProgram, "position");
    gl.enableVertexAttribArray(cube.positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, cube.positionBuffer);
    gl.vertexAttribPointer(cube.positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    cube.colorAttributeLocation = gl.getAttribLocation(cube.shaderProgram, "color");
    gl.enableVertexAttribArray(cube.colorAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, cube.colorBuffer);
    gl.vertexAttribPointer(cube.colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);

     gl.bindVertexArray(null);

    cube.modelMatrix = mat4.create();
    cube.modelMatrixLocation = gl.getUniformLocation(cube.shaderProgram, "modelMatrix");
    return cube;
}


function start() {

    var canvas = document.getElementById("renderCanvas");
    gl = canvas.getContext("webgl2");
        
    var cube = createCube();

    let uniformsColorsArray = [];
    uniformsColorsArray.push(vec4.fromValues(1,0,0,1));
    uniformsColorsArray.push(vec4.fromValues(0,1,0,1));
    uniformsColorsArray.push(vec4.fromValues(0,0,1,1));
    console.log(uniformsColorsArray);

    let offsetsVector = vec3.fromValues(-2, 0, 2);

    let colorsUniformArrayLocation0 = gl.getUniformLocation(cube.shaderProgram, "colorsUniformArray[0]");
    let colorsUniformArrayLocation1 = gl.getUniformLocation(cube.shaderProgram, "colorsUniformArray[1]");
    let colorsUniformArrayLocation2 = gl.getUniformLocation(cube.shaderProgram, "colorsUniformArray[2]")
    let offsetsLocation             = gl.getUniformLocation(cube.shaderProgram, "offsets");
    let timeLocation                = gl.getUniformLocation(cube.shaderProgram, "time");


    gl.useProgram(cube.shaderProgram);

    var viewMatrix = mat4.create();
    var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, 45 * Math.PI / 180.0, canvas.width / canvas.height, 0.1, 10);
    var viewMatrixLocation = gl.getUniformLocation(cube.shaderProgram, "viewMatrix");
    var projectionMatrixLocation = gl.getUniformLocation(cube.shaderProgram, "projectionMatrix");

    var angle = 0;
    let currentTime = 0.1;
    function runRenderLoop() {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        mat4.identity(cube.modelMatrix);

        mat4.translate(cube.modelMatrix, cube.modelMatrix, [0, 0, -7]);
        mat4.rotateY(cube.modelMatrix, cube.modelMatrix, angle);
        mat4.rotateX(cube.modelMatrix, cube.modelMatrix, .25);
      

        angle += .1;
        currentTime += .1;

        gl.uniformMatrix4fv(cube.modelMatrixLocation, false, cube.modelMatrix);
        gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);
        gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

        gl.uniform4fv(colorsUniformArrayLocation0, uniformsColorsArray[0]);
        gl.uniform4fv(colorsUniformArrayLocation1, uniformsColorsArray[1]);
        gl.uniform4fv(colorsUniformArrayLocation2, uniformsColorsArray[2]);
        gl.uniform3fv(offsetsLocation, offsetsVector);
        gl.uniform1f(timeLocation, currentTime);


        gl.useProgram(cube.shaderProgram);
        gl.bindVertexArray(cube.vao);

        gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, 3);
        gl.bindVertexArray(null);


        requestAnimationFrame(runRenderLoop);
    }

    requestAnimationFrame(runRenderLoop);

}

function getAndCompileShader(id) {
    var shader;
    var shaderElement = document.getElementById(id);
    var shaderText = shaderElement.text.trim();
    if (id == "vertexShader")
        shader = gl.createShader(gl.VERTEX_SHADER);
    else if (id == "fragmentShader")
        shader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(shader, shaderText);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      console.log( gl.getShaderInfoLog(shader));    
    }
    return shader;
}

