class GridFloor{

	constructor(gl, incAxis){
		this.transform =  new Transform();
		this.gl = gl;
		this.createMesh(gl, incAxis || false);
		this.createShader();
	}

	createShader(){

		var vShader = '#version 300 es\n' +
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
		var fShader = '#version 300 es\n' +
			'precision mediump float;' +
			'in vec4 color;' +
			'out vec4 finalColor;' +
			'void main(void){ finalColor = color; }';

		//uniforms
		this.mShader 			= ShaderUtil.createProgramFromText(this.gl, vShader, fShader, true);
		this.mUniformColor 		= this.gl.getUniformLocation(this.mShader, "uColorAry");
		this.mUniformProj 		= this.gl.getUniformLocation(this.mShader, "uPMatrix");
		this.mUniformCamera 	= this.gl.getUniformLocation(this.mShader, "uCameraMatrix");
		this.mUniformModelV 	= this.gl.getUniformLocation(this.mShader, "uMVMatrix");

		//Save colors in the shader 
		this.gl.useProgram(this.mShader);
		this.gl.uniform3fv(this.mUniformColor, new Float32Array([0.8,0.8,0.8, 1,0,0, 0,1,0, 0,0,1]));
		this.gl.useProgram(null);
	}

	render(camera){
		// update transform matrix (model view)
		this.transform.updateMatrix();

		// Prepare shader
		this.gl.useProgram(this.mShader);
		this.gl.bindVertexArray(this.mesh.vao);

		// Push Uniforms
		this.gl.uniformMatrix4fv(this.mUniformProj, false, camera.projectionMatrix);
		this.gl.uniformMatrix4fv(this.mUniformCamera, false, camera.viewMatrix);
		this.gl.uniformMatrix4fv(this.mUniformModelV, false, this.transform.getViewMatrix());

		// Draw the grid
		this.gl.drawArrays(this.mesh.drawMode, 0, this.mesh.vertexCount);

		// cleanup
		this.gl.bindVertexArray(null);
		this.gl.useProgram(null);		
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

		let attrColorLoc = 4, strideLen,
			mesh = {
				drawMode: gl.LINES,
				vao: gl.createVertexArray()
			};

		mesh.vertexComponentLen = 4;
		mesh.vertexCount = verts.length / mesh.vertexComponentLen;
		strideLen = Float32Array.BYTES_PER_ELEMENT * mesh.vertexComponentLen;
		// strideLen einai to mikos twn Vertsx gia ton buffer se bytes
		
		//setup buffer
		mesh.bufVertices = gl.createBuffer();
		gl.bindVertexArray(mesh.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.bufVertices);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		// ayto to kanoume giati ta 3 prwta einai gia to position kai to teleutaio einai gia to xrwma .xyz(position) .w(xrwma)
		gl.enableVertexAttribArray(ATTR_POSITION_LOC);
		gl.enableVertexAttribArray(attrColorLoc);
		// kai ayto to kanoume gia na deijoume ston buffer oti ta prwta 3 einai gia to position kai to 4o gia to xrwma
		gl.vertexAttribPointer(ATTR_POSITION_LOC, 3, gl.FLOAT, false, strideLen, 0);
		gl.vertexAttribPointer(attrColorLoc, 1, gl.FLOAT, false, strideLen, Float32Array.BYTES_PER_ELEMENTS * 3);

		// cleanup
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.mMeshCache["grid"] = mesh;
		this.mesh = mesh;
	}


}