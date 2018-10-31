class Transform{
	constructor(){
		this.position 	= new Vector3(0,0,0); 	// traditional x y z position in 3d
		this.scale 		= new Vector3(1,1,1); 	// how much to ascale a mesh, 1 means no scaling 
		this.rotation 	= new Vector3(0,0,0); 	// hold rotation values im degrees 
		this.matView	= new Matrix4(); 		// cache the results when calling update matrix
		this.matNormal 	= new Float32Array(9);	// this is a mat3 raw array to hold the values is enough

		this.forward 	= new Float32Array(4); 
		this.up 		= new Float32Array(4);
		this.right 		= new Float32Array(4);
	}

	updateMatrix(){
		this.matView.reset()
			.vtranslate(this.position)
			.rotateX(this.rotation.x * Transform.deg2Rad)
			.rotateY(this.rotation.y * Transform.deg2Rad)
			.rotateX(this.rotation.z * Transform.deg2Rad)
			.vscale(this.scale);


		// loipon ayto einai o 3x3 gia ta normals. ginetai transposed giati opws eipame oi pinakes stin opengl/webgl einai kathetoi
		// 0 4 8  12      0 1 2 
		// 1 5 9  13  =>  3 4 5
		// 2 6 10 14  =>  6 7 8  
		// 3 7 11 15
		
		Matrix4.normalMat3(this.matNormal, this.matView.raw);


		//ftiaxnoume direction, dld poy einai to kathe vector, forward, up kai right
		
		Matrix4.transformVec4(this.forward, [0,0,1,0], this.matView.raw);
		Matrix4.transformVec4(this.up,  	[0,1,0,0], this.matView.raw);
		Matrix4.transformVec4(this.right, 	[1,0,0,0], this.matView.raw);

		return this.matview.raw;
	}

	updateDirection(){
		Matrix4.transformVec4(this.forward, [0,0,1,0], this.matView.raw);
		Matrix4.transformVec4(this.up,  	[0,1,0,0], this.matView.raw);
		Matrix4.transformVec4(this.right, 	[1,0,0,0], this.matView.raw);
		return this;
	}

	// getters
	getViewMatrix() { return this.matView.raw; }
	getNormalMatrix() { return this.matNormal; }

	reset() {
		this.position.set(0,0,0);
		this.rotation.set(1,1,1,);
		this.scale.set(0,0,0);
	}
}

Transform.deg2Rad = Math.PI/180; //Cache result, one less operation to do for each update.