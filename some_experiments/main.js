document.addEventListener("DOMContentLoaded", start);

let gl;

function start(){
	console.log('I startted');
	let canvas = document.getElementById("renderCanvas");
	gl = canvas.getContext("webgl2");


	// let triangleVertices = [
	// 1.0, -1.0, 0.0,
	// 0.0, 1.0, 0.0,
	// -1.0, -1.0, 0.0];

	// let triangleVertexPositionBuffer = gl.createBuffer();
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
	// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);


	// let triangleColors = [
	// 1.0, 0.0, 0.0, 1.0,
	// 0.0, 1.0, 0.0, 1.0,
	// 0.0, 0.0, 1.0, 1.0,
	// ];


	// let triangleVertexColorBuffer = gl.createBuffer();
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
	// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleColors), gl.STATIC_DRAW);



	let triangleData =  [
		1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
		0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0,
		-1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0,
	];


	let triangleVertexColorAndPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorAndPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleData), gl.STATIC_DRAW);




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
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
	// gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

	let colorAttributeLocation  = gl.getAttribLocation(shaderProgram, "color");
	gl.enableVertexAttribArray(colorAttributeLocation);
	// gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
	// gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);

	const FLOAT_SIZE = 4;
	gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorAndPositionBuffer);
	gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 7*FLOAT_SIZE, 0);
	gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 7*FLOAT_SIZE, 3*FLOAT_SIZE);


	requestAnimationFrame(runRenderLoop);


	function runRenderLoop(){

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);


		gl.useProgram(shaderProgram);
		gl.bindVertexArray(vao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
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

