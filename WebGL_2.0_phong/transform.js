class Transform{
	constructor(){
		this.position  = new Vector3(0,0,0);		// Traditional X,Y,Z 3d rotation
		this.scale =  new Vector3(1,1,1); 			// how much to scale a mesh, having 1 means scaling is done
		this.rotation = new Vector3(0,0,0); 		// Hold rotation values based on degrees, object will translate into radians
		this.matView = new Matrix4(); 				// cache the results when calling updatematrix
		this.matNormal = new Float32Array(9); 		//this is Mat3, raw array to hold the values is enuf

		// direction Vectors
		this.up = new Float32Array(4); 			//When rotating, keep track of what forwars direction is
		this.forward =  new Float32Array(4);	//What the up direction is, invert to go bottom
		this.right =  new Float32Array(4);		//what the right direction is, invert to go left
	}

	//methods
	
	updateMatrix(){
		this.matView.reset() //ola ta matrix operations. ORDER IS VERY IMPORTANT
			.vtranslate(this.position)
			.rotateX(this.rotation.x * Transform.deg2rad)
			.rotateZ(this.rotation.z * Transform.deg2rad)
			.rotateY(this.rotation.y * Transform.deg2rad)
			.vscale(this.scale);

		//calculate the normal matrix which doesnt nee translate, then transpose and inverses the mat4 to mat3
		Matrix4.normalMat3(this.matNormal, this.matView.raw);
		// determin directions after all the transformations
		Matrix4.transformVec4(this.forward,	[0,0,1,0], this.matView.raw); //Z
		Matrix4.transformVec4(this.up,		[0,1,0,0], this.matView.raw); //Y1206
		Matrix4.transformVec4(this.right,	[1,0,0,0], this.matView.raw); //X

		return this.matView.raw;
	}


	updateDirection(){
		Matrix4.transformVec4(this.forward,	[0,0,1,0], this.matView.raw); //Z
		Matrix4.transformVec4(this.up,		[0,1,0,0], this.matView.raw); //Y1206
		Matrix4.transformVec4(this.right,	[1,0,0,0], this.matView.raw); //X

		return this;
	}

	getViewMatrix(){return this.matView.raw;}
	getNormalMatrix(){return this.matNormal;}

	reset(){
		this.position.set(0,0,0);
		this.scale.set(1,1,1);
		this.rotation.set(0,0,0);
	}
}

Transform.deg2rad = Math.PI/180; //cache result, one less operation to do for each update