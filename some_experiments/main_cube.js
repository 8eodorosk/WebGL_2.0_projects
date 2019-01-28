document.addEventListener("DOMContentLoaded", start);

let gl;

function start(){
	console.log('I startted');
	let canvas = document.getElementById("renderCanvas");
	gl = canvas.getContext("webgl2");



	let vertices = [
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

    let faceColors = [
     	[1.0, 0.0, 0.0, 1.0], // Front face
        [0.0, 1.0, 0.0, 1.0], // Back face
        [0.0, 0.0, 1.0, 1.0], // Top face
        [1.0, 1.0, 0.0, 1.0], // Bottom face
        [1.0, 0.0, 1.0, 1.0], // Right face
        [0.0, 1.0, 1.0, 1.0] // Left face
    ];

    let colors = [];
    faceColors.forEach(function(color){
    	for(i=0; i<6; i++){
    		colors = colors.concat(color);
    	}
    });
	// let triangleVertices = [
	// 1.0, -1.0, 0.0,
	// 0.0, 1.0, 0.0,
	// -1.0, -1.0, 0.0];

	let positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);


	// let triangleColors = [
	// 1.0, 0.0, 0.0, 1.0,
	// 0.0, 1.0, 0.0, 1.0,
	// 0.0, 0.0, 1.0, 1.0,
	// ];


	let colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);



	// let triangleData =  [
	// 	1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
	// 	0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0,
	// 	-1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0,
	// ];


	// let triangleVertexColorAndPositionBuffer = gl.createBuffer();
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorAndPositionBuffer);
	// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleData), gl.STATIC_DRAW);




	let vertShader = getAndCompileShader("vertexShader");
	let fragShader = getAndCompileShader("fragmentShader");

	let shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertShader);
	gl.attachShader(shaderProgram, fragShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not link shaders");
	}


	gl.useProgram(shaderProgram);
	let vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	let positionAttributeLocation  = gl.getAttribLocation(shaderProgram, "position");
	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

	let colorAttributeLocation  = gl.getAttribLocation(shaderProgram, "color");
	gl.enableVertexAttribArray(colorAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
	gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);

	gl.bindVertexArray(null);

	// const FLOAT_SIZE = 4;
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorAndPositionBuffer);
	// gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 7*FLOAT_SIZE, 0);
	// gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 7*FLOAT_SIZE, 3*FLOAT_SIZE);


	let projectionMatrix = mat4.create();
	let viewMatrix = mat4.create();
	let modelMatrix = mat4.create();


	mat4.perspective(projectionMatrix, 45*Math.PI/180.0, canvas.width/canvas.height, 0.1, 10);

	let modelMatrixLocation = gl.getUniformLocation(shaderProgram, "modelMatrix");
	let viewMatrixLocation = gl.getUniformLocation(shaderProgram, "viewMatrix");
	let projectionMatrixLocation = gl.getUniformLocation(shaderProgram, "projectionMatrix");

	
	let angle = 0.0;

	requestAnimationFrame(runRenderLoop);


	function runRenderLoop(){

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);

		//first cube
		mat4.identity(modelMatrix);
		mat4.translate(modelMatrix, modelMatrix, [-2,0,-7]);
		mat4.rotateY(modelMatrix, modelMatrix, angle*0.05);
		mat4.rotateX(modelMatrix, modelMatrix, 0.25);
		angle+=0.1;
		


		gl.uniformMatrix4fv(modelMatrixLocation, false,modelMatrix);
		gl.uniformMatrix4fv(viewMatrixLocation, false,viewMatrix);
		gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

		gl.useProgram(shaderProgram);
		gl.bindVertexArray(vao);
		gl.drawArrays(gl.TRIANGLES, 0, 36);
		gl.bindVertexArray(null);


		//second cube
		mat4.identity(modelMatrix);
		mat4.translate(modelMatrix, modelMatrix, [0,0,-7]);
		mat4.rotateY(modelMatrix, modelMatrix, angle*0.25);
		mat4.rotateX(modelMatrix, modelMatrix, 0.25);
		angle+=0.1;
		


		gl.uniformMatrix4fv(modelMatrixLocation, false,modelMatrix);
		gl.uniformMatrix4fv(viewMatrixLocation, false,viewMatrix);
		gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

		gl.useProgram(shaderProgram);
		gl.bindVertexArray(vao);
		gl.drawArrays(gl.TRIANGLES, 0, 36);
		gl.bindVertexArray(null);

		//thrid cube
		mat4.identity(modelMatrix);
		mat4.translate(modelMatrix, modelMatrix, [2,0,-7]);
		mat4.rotateY(modelMatrix, modelMatrix, angle);
		mat4.rotateX(modelMatrix, modelMatrix, 0.25);
		angle+=0.1;
		


		gl.uniformMatrix4fv(modelMatrixLocation, false,modelMatrix);
		gl.uniformMatrix4fv(viewMatrixLocation, false,viewMatrix);
		gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

		gl.useProgram(shaderProgram);
		gl.bindVertexArray(vao);
		gl.drawArrays(gl.TRIANGLES, 0, 36);
		gl.bindVertexArray(null);

		requestAnimationFrame(runRenderLoop);
	}
}

function getAndCompileShader(id){
	let shader;

	let shaderElement = document.getElementById(id);
	let shaderText = shaderElement.text.trim();

	if (id == "vertexShader") {
		shader = gl.createShader(gl.VERTEX_SHADER);	
	}else{
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	}
	
		
	gl.shaderSource(shader, shaderText);
	gl.compileShader(shader);

	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

