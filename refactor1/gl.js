//--------------------------------------------------
// Global Constants 
//--------------------------------------------------
const ATTR_POSITION_NAME	= "a_position";
const ATTR_POSITION_LOC		= 0;
const ATTR_NORMAL_NAME		= "a_norm";
const ATTR_NORMAL_LOC		= 1;
const ATTR_UV_NAME			= "a_uv";
const ATTR_UV_LOC			= 2;


class GlUtil{
	static rgbArray(){
		if (arguments.length == 0) return null;
		let rtn = [];
		let c,p;

		for(let i= 0; i< arguments.length; i++){
			if (arguments[i].length < 6) continue;
			c = arguments[i];
			p = (c[0] == "#")?1:0;

			rtn.push(
				parseInt(c[p]	+c[p+1],16)	/ 255.0,
				parseInt(c[p+2]	+c[p+3],16)	/ 255.0,
				parseInt(c[p+4]	+c[p+5],16)	/ 255.0
			);
		}
		return rtn;	
	}
}


function GLInstance(canvasID){
	let canvas = document.getElementById(canvasID);
	let gl = canvas.getContext("webgl2");

	if (!gl) { console.error("WebGL context is not available."); return null; }

	//...................................................
	//Setup custom properties
	gl.mMeshCache = [];	//Cache all the mesh structs, easy to unload buffers if they all exist in one place.
	gl.mTextureCache = [];

	//...................................................
	//Setup GL, Set all the default configurations we need.
	gl.cullFace(gl.BACK);								//Back is also default
	gl.frontFace(gl.CCW);								//Dont really need to set it, its ccw by default.
	gl.enable(gl.DEPTH_TEST);							//Shouldn't use this, use something else to add depth detection
	gl.enable(gl.CULL_FACE);							//Cull back face, so only show triangles that are created clockwise
	gl.depthFunc(gl.LEQUAL);							//Near things obscure far things
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);	//Setup default alpha blending
	gl.clearColor(1.0,1.0,1.0,1.0);	//Set clear color


	gl.fClear = function(){
		this.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		return this;
	}

	gl.fCreateArrayBuffer = function(floatArry, isStatic){
		if (isStatic === undefined) isStatic = true;
		
		let buf = this.gl.createBuffer();
		this.bindBuffer(this.ARRAY_BUFFER, buf);
		this.bufferData(this.ARRAY_BUFFER, floatArry, (isStatic)? this.STATIC_DRAW : this.DYNAMIC_DRAW);
		this.bindBuffer(this.ARRAY_BUFFER, null);
	}

	gl.fCreateMeshVao = function(name, aryInd, aryVert, aryNorm, aryUV, vertLen){
		let rtn = {
			drawMode: this.TRIANGLES;
		}

		rtn.vao = this.createVertexArray();
		this.bindVertexArray(rtn.vao); //Bind it so all the calls to vertexAttribPointer/enableVertexAttribArray is saved to the vao.

		//vertices
		if(aryVert !== undefined && aryVert != null){
			rtn.bufVertices = this.createBuffer();
			rtn.vertexComponentLen = vertLen || 3;
			rtn.vertexCount = aryVert.length / rtn.vertexComponentLen;
			
			this.bindBuffer(this.ARRAY_BUFFER, rtn.bufVertices);
			this.bufferData(this.ARRAY_BUFFER, new Float32Array(aryVert), this.STATIC_DRAW);
			this.enableVertexAttribArray(ATTR_POSITION_LOC);
			this.vertexAttribPointer(ATTR_POSITION_LOC, rtn.vertexComponentLen, this.FLOAT, false, 0,0); //Put buffer at location of the vao

		}

		// normals
		if(aryNorm !== undefined && aryNorm != null){
			rtn.bufNormals = this.createBuffer();
			this.bindBuffer(this.ARRAY_BUFFER, rtn.bufNormals);
			this.bufferData(this.ARRAY_BUFFER, new Float32Array(aryNorm), this.STATIC_DRAW);
			this.enableVertexAttribArray(ATTR_NORMAL_LOC);
			this.vertexAttribPointer(ATTR_NORMAL_LOC, 3, this.FLOAT, false, 0, 0);
		}

		//UV
		if(aryUV !== undefined && aryUV != null){
			rtn.bufUV = this.createBuffer();
			this.bindBuffer(this.ARRAY_BUFFER, rtn.bufUV);
			this.bufferData(this.ARRAY_BUFFER, new Float32Array(aryUV), this.STATIC_DRAW);
			this.enableVertexAttribArray(ATTR_UV_LOC);
			this.vertexAttribPointer(ATTR_UV_LOC, 2, this.FLOAT, false, 0, 0);

		}

		// index
		if(aryInd !== undefined && aryInd != null){
			rtn.bufIndex = this.createBuffer();
			rtn.indexCount = aryInd.length;
			// gl.ELEMENT_ARRAY_BUFFER: Buffer used for element indices.
			this.bindBuffer(this.ELEMENT_ARRAY_BUFFER, rtn.bufIndex);
			this.bufferData(this.ELEMENT_ARRAY_BUFFER, new Uint16Array(aryInd), this.STATIC_DRAW);
		}

		//Clean up
		this.bindVertexArray(null);					//Unbind the VAO, very Important. always unbind when your done using one.
		this.bindBuffer(this.ARRAY_BUFFER,null);	//Unbind any buffers that might be set
		if(aryInd != null && aryInd !== undefined)  this.bindBuffer(this.ELEMENT_ARRAY_BUFFER,null);
		
		this.mMeshCache[name] = rtn;
		return rtn;
	}

	gl.fLoadTexture =  function(name, img, doYFlip){
		let tex = this.createTexture();
		if (doYFlip) this.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

		this.bindTexture(this.TEXTURE_2D, tex); //Set text buffer for work
		this.texImage2D(this.TEXTURE_2D, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, img); //Push image to GPU.

		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, this.LINEAR);					//Setup up scaling
		this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, this.LINEAR_MIPMAP_NEAREST);	//Setup down scaling
		this.generateMipmap(this.TEXTURE_2D);	//Precalc different sizes of texture for better quality rendering.

		this.bindTexture(this.TEXTURE_2D,null);									//Unbind
		this.mTextureCache[name] = tex;											//Save ID for later unloading
		
		if(doYFlip == true) this.pixelStorei(this.UNPACK_FLIP_Y_WEBGL, false);	//Stop flipping textures
		return tex;		
	}


					/* this was a copy pasta...KEK */
	//imgAry must be 6 elements long and images placed in the right order
	//RIGHT,LEFT,TOP,BOTTOM,BACK,FRONT
	gl.fLoadCubeMap = function(name,imgAry){
		if(imgAry.length != 6) return null;

		//Cube Constants values increment, so easy to start with right and just add 1 in a loop
		//To make the code easier costs by making the imgAry coming into the function to have
		//the images sorted in the same way the constants are set.
		//	TEXTURE_CUBE_MAP_POSITIVE_X - Right	:: TEXTURE_CUBE_MAP_NEGATIVE_X - Left
		//	TEXTURE_CUBE_MAP_POSITIVE_Y - Top 	:: TEXTURE_CUBE_MAP_NEGATIVE_Y - Bottom
		//	TEXTURE_CUBE_MAP_POSITIVE_Z - Back	:: TEXTURE_CUBE_MAP_NEGATIVE_Z - Front

		var tex = this.createTexture();
		this.bindTexture(this.TEXTURE_CUBE_MAP,tex);

		//push image to specific spot in the cube map.
		for(var i=0; i < 6; i++){
			this.texImage2D(this.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, imgAry[i]);
		}

		this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_MAG_FILTER, this.LINEAR);	//Setup up scaling
		this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_MIN_FILTER, this.LINEAR);	//Setup down scaling
		this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_S, this.CLAMP_TO_EDGE);	//Stretch image to X position
		this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_T, this.CLAMP_TO_EDGE);	//Stretch image to Y position
		this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_R, this.CLAMP_TO_EDGE);	//Stretch image to Z position
		//this.generateMipmap(this.TEXTURE_CUBE_MAP);

		this.bindTexture(this.TEXTURE_CUBE_MAP,null);
		this.mTextureCache[name] = tex;
		return tex;
	}

	gl.fSetSize = function(w,h){
		this.canvas.style.width = w + "px";
		this.canvas.style.height = h + "px";
		this.canvas.width = w;
		this.canvas.height = h;
	}

	gl.fFitScreen = function(wp, hp){
		return this.fSetSize(window.innerWidth * (wp || 1), window.innerHeight * (hp || 1));
	}

	return gl;

}