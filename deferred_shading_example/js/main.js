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


returnProgram.then(programs => {
	console.log(programs);
})


