'use strict';

let canvas = document.getElementById("gl-canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gl = canvas.getContext("webgl2");
if(!gl){
	console.error("WebGL is not available");
	document.body.innerHTML = "this example requires  webgl 2";
}

gl.clearColor(0.0,0.0,0.0,1.0);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.blendFunc(gl.ONE, gl.ONE);

if(!gl.getExtension("EXT_color_buffer_float")){
	console.error("FLOAT color buffer is not available");
	document.body.innerHTML = "this example requires  EXT_color_buffer_float";
}

const loadShader = (src, type) =>{
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
		const program = gl.createProgram();
		shaders.forEach(shader => gl.attachShader(program, shader));
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(program));
		}
		return program;
	})



const gBufferProgram = loadProgram('./glsl/geo_vs.glsl','./glsl/geo_fs.glsl');


const returnProgram = () => 
	Promise.all([
		loadProgram('./glsl/geo_vs.glsl','./glsl/geo_fs.glsl'),
		loadProgram('./glsl/main_vs.glsl','./glsl/main_fs.glsl')
	]);


returnProgram().then(programs => {
	// console.log(programs[0]);


	const geoProgram = programs[0];
	const mainProgram = programs[1];

	//////////////////////////////////////////
    // GET GBUFFFER PROGRAM UNIFORM LOCATIONS
    //////////////////////////////////////////
    var matrixUniformLocation = gl.getUniformBlockIndex(geoProgram, "Matrices");
    gl.uniformBlockBinding(geoProgram, matrixUniformLocation, 0);
    ////////////////////////////
    // GBUFFER SETUP
    ////////////////////////////
    var gBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gBuffer);

    gl.activeTexture(gl.TEXTURE0);

    var positionTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, positionTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, positionTarget, 0);

    var normalTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, normalTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, normalTarget, 0);

    var uvTarget = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, uvTarget);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16F, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, uvTarget, 0);

    var depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

    gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
        gl.COLOR_ATTACHMENT1,
        gl.COLOR_ATTACHMENT2
    ]);


    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


    //////////////////////////////////////////////
    // GET MAIN PROGRAM UNIFORM LOCATIONS
    //////////////////////////////////////////////
    var lightUniformsLocation = gl.getUniformBlockIndex(mainProgram, "LightUniforms");
    gl.uniformBlockBinding(mainProgram, lightUniformsLocation, 0);
    var eyePositionLocation = gl.getUniformLocation(mainProgram, "uEyePosition");
    var positionBufferLocation = gl.getUniformLocation(mainProgram, "uPositionBuffer");
    var normalBufferLocation = gl.getUniformLocation(mainProgram, "uNormalBuffer");
    var uVBufferLocation = gl.getUniformLocation(mainProgram, "uUVBuffer");
    var textureMapLocation = gl.getUniformLocation(mainProgram, "uTextureMap");
    ///////////////////////
    // GEOMETRY SET UP
    ///////////////////////
    var cubeVertexArray = gl.createVertexArray();
    gl.bindVertexArray(cubeVertexArray);
    var box = utils.createBox();
    
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, box.positions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, box.normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    var uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, box.uvs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);

    var sphereVertexArray = gl.createVertexArray();
    gl.bindVertexArray(sphereVertexArray);

    var numCubeVertices = box.positions.length / 3;

    var sphere = utils.createSphere();

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
    var numSphereElements = sphere.indices.length;
    gl.bindVertexArray(null);
    
    ////////////////////
    // UNIFORM DATA
    ////////////////////
    var projMatrix = mat4.create();
    mat4.perspective(projMatrix, Math.PI / 2, canvas.width / canvas.height, 0.1, 10.0);
    var viewMatrix = mat4.create();
    var eyePosition = vec3.fromValues(1, 1, 1);
    mat4.lookAt(viewMatrix, eyePosition, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
    var viewProjMatrix = mat4.create();
    mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);
      
    var boxes = [
        {
            scale: [1, 1, 1],
            rotate: [0, 0, 0],
            translate: [0, 0, 0],
            modelMatrix: mat4.create(),
            mvpMatrix: mat4.create(),
        },
        {
            scale: [0.1, 0.1, 0.1],
            rotate: [0, 0, Math.PI / 3],
            translate: [0.8, 0.8, 0.4],
            modelMatrix: mat4.create(),
            mvpMatrix: mat4.create(),
        }
    ];

    var matrixUniformData = new Float32Array(32);
    var matrixUniformBuffer = gl.createBuffer();
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, matrixUniformBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 128, gl.DYNAMIC_DRAW);

    var lights = [
        {
            position: vec3.fromValues(0, 1, 0.5),
            color:    vec3.fromValues(0.8, 0.0, 0.0),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        },
        {
            position: vec3.fromValues(1, 1, 0.5),
            color:    vec3.fromValues(0.0, 0.0, 0.8),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        },
        {
            position: vec3.fromValues(1, 0, 0.5),
            color:    vec3.fromValues(0.0, 0.8, 0.0),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        },
        {
            position: vec3.fromValues(0.5, 0, 1),
            color:    vec3.fromValues(0.0, 0.8, 0.8),
            uniformData: new Float32Array(24),
            uniformBuffer: gl.createBuffer()
        }
    ];


})


