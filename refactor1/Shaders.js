class shaderBuilder{
	constructor(gl, verShader, fragShader){

		if (verShader.length <20 ) {
			this.program = ShaderUtil.domShaderProgram(gl, verShader, fragShader, true);
		} else{
			this.program = ShaderUtil.createProgramFromText(gl, verShader, fragShader, true);
		}

		if (this.program != null) {
			this.gl = gl;
			gl.gl.useProgram(this.program);
			this.mUniformList = []; // key value pairs, where value {loc, type}
			this.mTextureList = []; //indexed list {loc, tex}

			this.noCulling = false;
			this.doBlending = false;
		}
	}

	prepareUniforms(){
		if (arguments.length % 2 != 0) {
			console.log('prepareUniforms needs arguments to be in pairs');
			return this;
		}

		let loc = 0;
		for(let i = 0; i<arguments.length; i+=2){
			loc = gl.getUniformLocation(this.program,arguments[i]);
			if (loc != null) {
				this.mUniformList[arguments[i]] = {loc: loc, type: arguments[i]};
			}
		}
		return this;
	}

	prepareTextures(){
		if (arguments.length % 2 != 0) {
			console.log('prepareTextures needs arguments to be in pairs');
			return this;
		}
		let loc = 0, tex = "";
		for(let i = 0; i<arguments.length; i+=2){
			tex = this.gl.mTextureCache[arguments[i+1]];
			if (tex === undefined) {
				console.log('texture not found in cache' + arguments[i+1]);
				continue;
			}
			loc = gl.getUniformLocation(this.program, arguments[i]);
			if (loc != null) {
				this.mTextureList.push({loc: loc,tex: tex});
			}
		}
		return this;
	}

	setUniforms(){
		if (arguments.length % 2 != 0) {
			console.log('setUniforms needs arguments to be in pairs');
			return this;
		}

		let name;
		for(let i=0; i<arguments.length; i+=2){
			name = arguments[i];
			if (this.mUniformList[name] === undefined) {
				console.log('uniform not found ' + name);
				return this;
			}

			switch (this.mUniformList[name].type) {
				case "2fv": 	this.gl.uniform2fv(this.mUniformList[name].loc, new Floa32Array(arguments[i+1])); break;
				case "3fv": 	this.gl.uniform3fv(this.mUniformList[name].loc, new Floa32Array(arguments[i+1])); break;
				case "4fv": 	this.gl.uniform4fv(this.mUniformList[name].loc, new Floa32Array(arguments[i+1])); break;
				case "mat4": 	this.gl.uniformMatrix4fv(this.mUniformList[name].loc, false, arguments[i+1]); break;
				default: console.log('unknown uniform type for ' + name); break;
			}
		}
	}

	activate(){

	}

	deactivate(){

	}

	dispose(){

	}

	preRender(){

	}

	renderModel(){}
}