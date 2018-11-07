class Gridfloor{
	constructor(gl, incAxis){
		this.transform = new Transform();
		this.gl = gl;
		// first create mesh
		this.createMesh(gl, incAxis || false);
		// second create shader
		this.createShader();
	}

	createMesh(gl, incAxis){

			//Dynamiclly create a grid
		var verts = [],
			size = 2,			// W/H of the outer box of the grid, from origin we can only go 1 unit in each direction, so from left to right is 2 units max
			div = 10.0,			// How to divide up the grid
			step = size / div,	// Steps between each line, just a number we increment by for each line in the grid.
			half = size / 2;	// From origin the starting position is half the size.

		var p;	//Temp variable for position value.
		for(var i=0; i <= div; i++){
			//Vertical line
			p = -half + (i * step);
			verts.push(p);		//x1
			verts.push(0);		//y1 verts.push(half);
			verts.push(half);	//z1 verts.push(0);
			verts.push(0);		//c2

			verts.push(p);		//x2
			verts.push(0);		//y2 verts.push(-half);
			verts.push(-half);	//z2 verts.push(0);	
			verts.push(0);		//c2 verts.push(1);

			//Horizontal line
			p = half - (i * step);
			verts.push(-half);	//x1
			verts.push(0);		//y1 verts.push(p);
			verts.push(p);		//z1 verts.push(0);
			verts.push(0);		//c1

			verts.push(half);	//x2
			verts.push(0);		//y2 verts.push(p);
			verts.push(p);		//z2 verts.push(0);
			verts.push(0);		//c2 verts.push(1);
		}

		// the x, y z lines for axis
		if(incAxis){
			//x axis
			verts.push(-1.1);	//x1
			verts.push(0);		//y1
			verts.push(0);		//z1
			verts.push(1);		//c2

			verts.push(1.1);	//x2
			verts.push(0);		//y2
			verts.push(0);		//z2
			verts.push(1);		//c2

			//y axis
			verts.push(0);//x1
			verts.push(-1.1);	//y1
			verts.push(0);		//z1
			verts.push(2);		//c2

			verts.push(0);		//x2
			verts.push(1.1);	//y2
			verts.push(0);		//z2
			verts.push(2);		//c2

			//z axis
			verts.push(0);		//x1
			verts.push(0);		//y1
			verts.push(-1.1);	//z1
			verts.push(3);		//c2

			verts.push(0);		//x2
			verts.push(0);		//y2
			verts.push(1.1);	//z2
			verts.push(3);		//c2
		}

		// setup
		let attrColorLoc = 4;
		let strideLen;
		let mesh = {
			drawMode: gl.LINES,
			vao: gl.createVertexArray()
		};

		mesh.vertexComponentLen = 4;
		mesh.vertexCount = verts.length / mesh.vertexComponentLen;
		strideLen = Float32Array.BYTES_PERELEMENT * mesh.vertexComponentLen; //Stride Length is the Vertex Size for the buffer in Bytes

		//setup buffer
		mesh.bufVertices = gl.createBuffer();
		gl.bindVertexArray(mesh.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.bufVertices);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(ATTR_POSITION_LOC);
		gl.enableVertexAttribArray(attrColorLoc);

		gl.vertexAttribPointer(ATTR_POSITION_LOC, 3, gl.FLOAT, false, strideLen, 0);
		gl.vertexAttribPointer(attrColorLoc, 1, gl.FLOAT, false, strideLen, Float32Array.BYTES_PERELEMENT * 3);

		//cleanup
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER,null);
		gl.mMeshCache["grid"] = mesh;
		this.mesh = mesh;
	}


	createShader(){
		let vShader = '#version 300 es\n' +
			'in vec3 a_position;' +
			'layout(location=4) in float a_color;' +
			'uniform mat4 uPMatrix;' +
			'uniform mat4 uMVMatrix;' +
			'uniform mat4 uCameraMatrix;' +
			'uniform vec3 uColorAry[4];' +
			'out lowp vec4 color;' +
			'void main(void){' +
				'color = vec4(uColorAry[ int(a_color) ],1.0);' +
				'gl_Position = uPMatrix * uCameraMatrix * uMVMatrix * vec4(a_position, 1.0);' +
			'}';
		let fShader = '#version 300 es\n' +
			'precision mediump float;' +
			'in vec4 color;' +
			'out vec4 finalColor;' +
			'void main(void){ finalColor = color; }';

		this.mShader = 		ShaderUtil.createProgramFromText(this.gl, vShader, fShader, true);
	}
}