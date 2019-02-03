document.addEventListener("DOMContentLoaded", start);

let gl;

function start(){
	console.log('I startted');
	let canvas = document.getElementById("renderCanvas");
	gl = canvas.getContext("webgl2");
 	let ready = false, ready2=false;


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

  textureCoordinates = [
          0.0, 0.0,
          1.0, 0.0,
          1.0, 1.0,
          1.0, 1.0,
          0.0, 1.0,
          0.0, 0.0,

          0.0, 0.0,
          1.0, 0.0,
          1.0, 1.0,
          1.0, 1.0,
          0.0, 1.0,
          0.0, 0.0,

          1.0, 0.0,
          1.0, 1.0,
          0.0, 1.0,
          0.0, 1.0,
          0.0, 0.0,
          1.0, 0.0,

          1.0, 0.0,
          1.0, 1.0,
          0.0, 1.0,
          0.0, 1.0,
          0.0, 0.0,
          1.0, 0.0,

          0.0, 1.0,
          1.0, 1.0,
          1.0, 0.0,
          1.0, 0.0,
          0.0, 0.0,
          0.0, 1.0,

          0.0, 1.0,
          1.0, 1.0,
          1.0, 0.0,
          1.0, 0.0,
          0.0, 0.0,
          0.0, 1.0
    ];
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


	let textureCoordinatesBuffer=  gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinatesBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

	// let triangleData =  [
	// 	1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
	// 	0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0,
	// 	-1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0,
	// ];


	// let triangleVertexColorAndPositionBuffer = gl.createBuffer();
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorAndPositionBuffer);
	// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleData), gl.STATIC_DRAW);


	let texture1 = gl.createTexture();
	texture1.image = new Image();
	texture1.image.src = "images/webgl.jpg";
	texture1.image.onload = function(){
		gl.bindTexture(gl.TEXTURE_2D, texture1);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture1.image);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		ready = true;
	}



	let texture2 = gl.createTexture();
	texture2.image = new Image();
	texture2.image.src = "images/logo.png";
	texture2.image.onload = function(){
		gl.bindTexture(gl.TEXTURE_2D, texture2);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texture2.image);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		ready2 = true;
	}

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



	let textureAttributeLocation  = gl.getAttribLocation(shaderProgram, "textureCoordinate");
	gl.enableVertexAttribArray(textureAttributeLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinatesBuffer);
	gl.vertexAttribPointer(textureAttributeLocation, 2, gl.FLOAT, false, 0, 0);

	

	gl.bindVertexArray(null);

	// const FLOAT_SIZE = 4;
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorAndPositionBuffer);
	// gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 7*FLOAT_SIZE, 0);
	// gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 7*FLOAT_SIZE, 3*FLOAT_SIZE);


	let projectionMatrix = mat4.create();
	let viewMatrix = mat4.create();
	let modelMatrix = mat4.create();


	let samplerUniformLocation = gl.getUniformLocation(shaderProgram, "sampler0");
	let samplerOneUniformLocation = gl.getUniformLocation(shaderProgram, "sampler1");
	// console.log(samplerUniformLocation1);


	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture1);
	gl.uniform1i(samplerUniformLocation, 0);
	console.log(gl.getParameter(gl.ACTIVE_TEXTURE));
	// gl.bindTexture(gl.TEXTURE_2D, null);	

	gl.activeTexture(gl.TEXTURΕ0+1);
	gl.bindTexture(gl.TEXTURE_2D, texture2);
	gl.uniform1i(samplerOneUniformLocation, 1);
	console.log(gl.getParameter(gl.ACTIVE_TEXTURE));
	

	mat4.perspective(projectionMatrix, 45*Math.PI/180.0, canvas.width/canvas.height, 0.1, 10);

	let modelMatrixLocation = gl.getUniformLocation(shaderProgram, "modelMatrix");
	let viewMatrixLocation = gl.getUniformLocation(shaderProgram, "viewMatrix");
	let projectionMatrixLocation = gl.getUniformLocation(shaderProgram, "projectionMatrix");

	
	let angle = 0.0;

	requestAnimationFrame(runRenderLoop);

	function runRenderLoop(){

		// if (!ready || !ready2) return;
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