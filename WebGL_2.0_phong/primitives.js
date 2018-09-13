let Primitives = {}; 


Primitives.Cube = class{
	static createModal(gl, name, keepRawData){
		return new Modal(Primitives.Cube.createMesh(gl, name || "Cube", 1,1,1,0,0,0, keepRawData));
	}

	static createMesh(gl, name, width, height, depth, x,y,z, keepRawData){
		let w = width * 0.5, h = height * 0.5, d = depth * 0.5;
		let x0 = x-w, x1 = x+w, y0 = y-h, y1 = y+h, z0 = z-d, z1 = z+d;


		var aVert = [
			x0, y1, z1, 0,	//0 Front
			x0, y0, z1, 0,	//1
			x1, y0, z1, 0,	//2
			x1, y1, z1, 0,	//3 

			x1, y1, z0, 1,	//4 Back
			x1, y0, z0, 1,	//5
			x0, y0, z0, 1,	//6
			x0, y1, z0, 1,	//7 

			x0, y1, z0, 2,	//7 Left
			x0, y0, z0, 2,	//6
			x0, y0, z1, 2,	//1
			x0, y1, z1, 2,	//0

			x0, y0, z1, 3,	//1 Bottom
			x0, y0, z0, 3,	//6
			x1, y0, z0, 3,	//5
			x1, y0, z1, 3,	//2

			x1, y1, z1, 4,	//3 Right
			x1, y0, z1, 4,	//2 
			x1, y0, z0, 4,	//5
			x1, y1, z0, 4,	//4

			x0, y1, z0, 5,	//7 Top
			x0, y1, z1, 5,	//0
			x1, y1, z1, 5,	//3
			x1, y1, z0, 5	//4
		];


		let aIndex = [];
		for (var i = 0; i < aVert.length/4; i+=2) {
			aIndex.push(i, i +1, (Math.floor(i/4)*4) + ((i+2)%4));
		}

		let aUV = [];
		for (var i = 0; i < 6; i++) {
			aUV.push(0,0, 0,1, 1,1, 1,0);
		}

		var aNorm = [
			 0, 0, 1,	 0, 0, 1,	 0, 0, 1,	 0, 0, 1,		//Front
			 0, 0,-1,	 0, 0,-1,	 0, 0,-1,	 0, 0,-1,		//Back
			-1, 0, 0,	-1, 0, 0,	-1, 0,0 ,	-1, 0, 0,		//Left
			 0,-1, 0,	 0,-1, 0,	 0,-1, 0,	 0,-1, 0,		//Bottom
			 1, 0, 0,	 1, 0, 0,	 1, 0, 0,	 1, 0, 0,		//Right
			 0, 1, 0,	 0, 1, 0,	 0, 1, 0,	 0, 1, 0		//Top
		];


		const mesh = gl.fCreateMeshVAO(name, aIndex, aVert, aNorm, aUV, 4);
		mesh.noCulling = true;

		if (keepRawData) {
			mesh.aIndex = aIndex;
			mesh.aVert 	= aVert;
			mesh.aNorm 	= aNorm;
		}
		return mesh;
	}



}

Primitives.CubeBad = class{
	static createModal(gl){
		return new Modal(Primitives.CubeBad.createMesh(gl));
	}

	static createMesh(gl){
		let aVert = [
				-0.5,0.5,0,0, -0.5,-0.5,0,0, 0.5,-0.5,0,0, 0.5,0.5,0,0,			//Front
				0.5,0.5,-1,1, 0.5,-0.5,-1,1, -0.5,-0.5,-1,1, -0.5,0.5,-1,1		//Back
			],
			aUV = [
				0,1, 0,1, 1,1, 1,0,
				0,0, 0,1, 1,1, 1,0 
			],
			aIndex = [
				0,1,2, 2,3,0,
				4,5,6, 6,7,4,
				7,0,3, 3,4,7,
				7,6,1, 1,0,7
			];
		return gl.fCreateMeshVAO("Cube", aIndex, aVert, null, aUV,4);
	}
}


Primitives.MultiQuad = class {
	 static createModal(gl){
	 	return new Modal(Primitives.MultiQuad.createMesh(gl));
	 }
	 static createMesh(gl){
	 	let aIndex = [],
	 		aUV = [],
	 		aVert = [];


	 	for (var i = 0; i < 10; i++) {
	 		let size = 0.2 +(0.8 * Math.random()),
	 			half = size * 0.5,
	 			angle = Math.PI * 2 * Math.random(),
	 			dx = half * Math.cos(angle),
	 			dy = half * Math.sin(angle),
	 			x = -2.5 + (Math.random() * 5),
	 			y = -2.5 + (Math.random() * 5),
	 			z = 2.5 - (Math.random() * 5),
	 			p = i * 4;

	 		aVert.push(x-dx, y+half, z-dy);
	 		aVert.push(x-dx, y-half, z-dy);
	 		aVert.push(x+dx, y-half, z+dy);
	 		aVert.push(x+dx, y+half, z+dy);

	 		aUV.push(0,0, 0,1, 1,1, 1,0);
	 		aIndex.push(p, p+1, p+2, p+2, p+3, p);
	 	}

	 	var mesh = gl.fCreateMeshVAO("MultiQuad", aIndex, aVert, null, aUV);
	 	mesh.noCulling = true;
	 	mesh.doBlending = true;

	 	return mesh;
	 }
}


Primitives.Quad = class{
	static createModal(gl){
		return new Modal(Primitives.Quad.createMesh(gl));
	}

	static createMesh(gl){
		let aVert = [-0.5,0.5,0, -0.5,-0.5,0, 0.5,-0.5,0, 0.5,0.5,0];
		let aUV = [0,0, 0,1, 1,1, 1,0];
		let aIndex = [0,1,2, 2,3,0];

		// gl.fCreateMeshVAO = function(name, aryInd, aryVert, aryNorm, aryUV)
		let mesh = gl.fCreateMeshVAO("Quad", aIndex, aVert, null, aUV);
		mesh.noCulling = true;
		mesh.doBlending = true;

		return mesh;

	}
}


Primitives.GridAxis = class{

	static createModal(gl, incAxis){
		return new Modal(Primitives.GridAxis.createMesh(gl, incAxis));
	}

	static createMesh(gl, incAxis){
		// let verts = [0,0.5,0,0,  0,-0.5,0,1];
		let verts = [],
			size = 1.8,
			div = 10.0,
			step = size/div,
			half = size / 2; 

		let p;

		for (var i = 0; i <= div; i++) {
			//vertical line

			p = -half + (i * step);
			verts.push(p);		//x1
			verts.push(0);		//y1 verts.push(half);
			verts.push(half);	//z1 verts.push(0);
			verts.push(0);		//c1

			verts.push(p);		//x2
			verts.push(0);		//y2 verts.push(-half);
			verts.push(-half);	//z2 verts.push(0);
			verts.push(0);		//c2 verts.push(1);

			//horrizontal line
			p = half - (i * step);	
			verts.push(-half);		
			verts.push(0); 		//verts.push(p);		
			verts.push(p); 		//verts.push(0);
			verts.push(0);		

			verts.push(half);
			verts.push(0);		//verts.push(p);
			verts.push(p);		//verts.push(0);
			verts.push(0);		//verts.push(1);
		}


		if (incAxis) {
			//x Axis
			verts.push(-1.1);
			verts.push(0);
			verts.push(0);
			verts.push(0);

			verts.push(-1.1);
			verts.push(0);
			verts.push(0);
			verts.push(0);


			//y Axis
			verts.push(0);
			verts.push(-1.1);
			verts.push(0);
			verts.push(2);

			verts.push(0);
			verts.push(1.1);
			verts.push(0);
			verts.push(2);

			//z Axis
			verts.push(0);
			verts.push(0);
			verts.push(-1.1);
			verts.push(3);

			verts.push(0);
			verts.push(0);
			verts.push(1.1);
			verts.push(3);
		}

		let attrColorLoc = 4, 
			stridelen,
			mesh = {drawMode: gl.LINES, vao:gl.createVertexArray()};


		//do math kappa
		mesh.vertexComponentLen = 4;
		mesh.vertexCount = verts.length / mesh.vertexComponentLen;
		stridelen = Float32Array.BYTES_PER_ELEMENT * mesh.vertexComponentLen; //stride length is the Vertex size for the buffer in Bytes


		//Setup byuffer

		mesh.buffVertices = gl.createBuffer();
		gl.bindVertexArray(mesh.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffVertices);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(ATTR_POSITION_LOC)
		gl.enableVertexAttribArray(attrColorLoc);

		// gl.vertexAttribPointer(unit_index, int_size, enum_type, boolean_normalized, int_stride, int_offset)
		// attribute location, 
		// how big is the vector by number count
		// what type of number we passing in
		// does it need to be normalized??
		// How big is a vertex chunk of data
		// offset by how much
		gl.vertexAttribPointer(ATTR_POSITION_LOC, 3, gl.FLOAT, false, stridelen, 0);
		gl.vertexAttribPointer(attrColorLoc, 1, gl.FLOAT, false, stridelen, Float32Array.BYTES_PER_ELEMENT *3); // prosperase ta 3 prwta


		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.mMeshCache["grid"] = mesh;
		return mesh;
	}
}


