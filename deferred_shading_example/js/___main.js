var canvas = document.getElementById("gl-canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var gl = canvas.getContext("webgl2");

if (!gl) {
    console.error("WebGL 2 not available");
    document.body.innerHTML = "This example requires WebGL 2 which is unavailable on this system."
}

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.blendFunc(gl.ONE, gl.ONE);


if (!gl.getExtension("EXT_color_buffer_float")) {
    console.error("FLOAT color buffer not available");
    document.body.innerHTML = "This example requires EXT_color_buffer_float which is unavailable on this system."
}

const fCreateProgram = (vShaderText, fShaderText)=>{
    var vsSource =  vShaderText;
    var fsSource = fShaderText;

    var VertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(VertexShader, vsSource);
    gl.compileShader(VertexShader);
    if (!gl.getShaderParameter(VertexShader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(VertexShader));
    }

    var FragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(FragmentShader, fsSource);
    gl.compileShader(FragmentShader);
    if (!gl.getShaderParameter(FragmentShader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(FragmentShader));
    }
    var Program = gl.createProgram();
    gl.attachShader(Program, VertexShader);
    gl.attachShader(Program, FragmentShader);
    gl.linkProgram(Program);
    if (!gl.getProgramParameter(Program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(Program));
    }

    return Program;
}

