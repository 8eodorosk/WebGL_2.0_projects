class ShaderBuilder{
    constructor(gl, vertShader, fragShader){
        if(vertShader.length < 20){
            this.program = ShaderUtil.domShaderProgram(gl, vertShader, fragShader, true);
        }else{
            this.program = ShaderUtil.createProgramFromText(gl, vertShader, fragShader, true);
        }

        if (this.program != null) {
            this.gl = gl;
            gl.useProgram(this.program);
            this.mUniformList = []; // key = UNIFORM_NAME {loc, type}
            this.mTextureList = []; // Indexed {loc, tex}

            this.noCulling = false; // if true disables culling
            this.doBlending = false; // if true, allows aplha to work
        }
    }

    //(UniformName, UniformType) : (uColors, 3fv)
    prepareUniforms(){
        if (arguments.length % 2 != 0) { 
            console.log('prepareUniforms needs arguments to be in pairs');
            return this;
        }

        let loc;
        for (var i = 0; i < arguments.length; i+=2) {
            loc = gl.getUniformLocation(this.program, arguments[i]);
            if (loc != null) {
                this.mUniformList[arguments[i]] = {
                    loc     : loc,
                    type    : arguments[i]
                };
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
        for (var i = 0; i < arguments.length; i+=2) {
            tex = this.gl.mTextureCache[arguments[i+1]];

            if (tex === undefined) {
                console.log('Texture ot found in cache' + arguments[i+1]);
                continue;
            }

            loc = gl.getUniformLocation(this.program, arguments[i]);
            if (loc != null) {
                this.mTextureList.push({loc:loc, tex:tex});
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
        for (var i = 0; i <arguments.length; i+=2) {
            name = arguments[i];
            if (this.mUniformList === undefined) {
                console.log('uniform not found' + name);
                return this;
            }

            switch (this.mUniformList[name].type) {
                case "2fv":     this.gl.uniform2fv(this.mUniformList[name].loc, new Float32Array(arguments[i+1])); break;
                case "3fv":     this.gl.uniform3fv(this.mUniformList[name].loc, new Float32Array(arguments[i+1])); break;
                case "4fv":     this.gl.uniform4fv(this.mUniformList[name].loc, new Float32Array(arguments[i+1])); break;
                case "mat4":    this.gl.uniformMatrix4fv(this.mUniformList[name].loc, false, arguments[i+1]); break;
                default:        console.log('uknown uniform type for ' + name); break;
            }
        }
        return this;
    }


    //methods
    activate(){
        this.gl.useProgram(this.program);
        return this;
    }
    deactivate(){
        this.gl.useProgram(null);
        return this;
    }

    dispose(){
        if (this.gl.getParameter(this.gl.CURRENT_PROGRAM) === this.program) this.gl.useProgram(null);
        this.gl.deleteProgram(this.program);
    }

    preRender(){
        this.gl.useProgram(this.program);

        if(arguments.length >0 ) this.setUniforms.apply(this, arguments);

        if (this.mTextureList.length > 0) {
            let texSlot;
            for (var i = 0; i < this.mTextureList.length; i++) {
                texSlot =  this.gl["TEXTURE" + i];
                this.gl.activeTexture(texSlot);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.mTextureList[i].tex);
                this.gl.uniform1i(this.mTextureList[i].loc, i);
            }
        }
        return this;
    }

    renderModel(model, doShaderClose){
        this.setUniforms("uMVMatrix", model.transform.getViewMatrix());
        this.gl.bindVertexArray(model.mesh.vao);
        if (model.mesh.noCulling || this.noCulling) this.gl.disable(this.gl.CULL_FACE);
        if (model.mesh.doBlending || this.doBlending) this.gl.disable(this.gl.BLEND);

        if (model.mesh.indexCount) this.gl.drawElements(model.mesh.drawMode, model.mesh.indexCount, gl.UNSIGNED_SHORT, 0);
        else this.gl.drawArrays(model.mesh.drawMode, 0, model.mesh.vertexCount );  //reboot server in single user mode

        //celanup
        this.bindVertexArray(null);
        if (model.mesh.noCulling || this.noCulling) this.gl.enable(this.gl.CULL_FACE);
        if (model.mesh.doBlending || this.doBlending) this.gl.disable(this.gl.BLEND);

        if (doShaderClose) this.gl.useProgram(null);

        return this;
    }
}



class ShaderUtil{
    static domShaderSrc(elmID){
        let elm = document.getElementById(elmID);

        if (!elm || elm.text == "") {
            console.log(elmID + "shader not found or no text");
            return null;
        }
        return elm.text;
    }


    static createShader(gl,src,type){
        let shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Error compiling Shader: ' + src, gl.ShaderInfoLog(shader));
            g.deleteShader(shader);
            return null;
        }
        return shader;
    }

    static createProgram(gl, vShader, fShader, doValidate){
        let prog = gl.createProgram();
        gl.attachShader(prog, vShader);
        gl.attachShader(prog, fShader);
       

        //force predefined locations for specific attributes.
        //if the attribute is not used in the shaderits location will default to -1
        gl.bindAttribLocation(prog, ATTR_POSITION_LOC, ATTR_POSITION_NAME);
        gl.bindAttribLocation(prog, ATTR_NORMAL_LOC, ATTR_NORMAL_NAME);
        gl.bindAttribLocation(prog, ATTR_UV_LOC, ATTR_UV_NAME);


        //we need to bind
        gl.linkProgram(prog);
        
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("Error creating shader program", gl.getProgramInfoLog(prog));
            gl.deleteProgram(prog);
        }
        
        if (doValidate) {
            gl.validateProgram(prog);
            if (!gl.getProgramParameter(prog, gl.VALIDATE_STATUS)) {
                console.error("error validating program", gl.getProgramInfoLog(prog));
                gl.deleteProgram(prog);
                return null;
            }
        }

        gl.detachShader(prog,vShader);
        gl.detachShader(prog,fShader);
        gl.deleteShader(fShader);
        gl.deleteShader(vShader);

        return prog;
    }

    static domShaderProgram(gl, vectID, fragID, doValidate){

        let vShaderTxt = ShaderUtil.domShaderSrc(vectID);                           if (!vShaderTxt)    return null;
        let fShaderTxt = ShaderUtil.domShaderSrc(fragID);                           if (!fShaderTxt)    return null;
        let vShader = ShaderUtil.createShader(gl, vShaderTxt, gl.VERTEX_SHADER);    if(!vShader)        return null;
        let fShader = ShaderUtil.createShader(gl, fShaderTxt, gl.FRAGMENT_SHADER);  if(!fShader){       gl.delteShader(vShader); return null;}

        return ShaderUtil.createProgram(gl, vShader, fShader, true);
    }

    static createProgramFromText(gl, vShaderTxt, fShaderTxt, doValidate){
        let vShader = ShaderUtil.createShader(gl, vShaderTxt, gl.VERTEX_SHADER);    if(!vShader)        return null;
        let fShader = ShaderUtil.createShader(gl, fShaderTxt, gl.FRAGMENT_SHADER);  if(!fShader){       gl.deleteShader(vShader); return null;}

        return ShaderUtil.createProgram(gl, vShader, fShader, true);
    }


    //get the locations of standard attributes that we will mostly be using. Location will =-1 if attibute is not found
    static getStandardAttribLocation(gl, program){
        return {
            position:   gl.getAttribLocation(program, ATTR_POSITION_NAME),
            norm:       gl.getAttribLocation(program, ATTR_NORMAL_NAME),
            uv:         gl.getAttribLocation(program, ATTR_UV_NAME)
        };
    }

    static getStandardUniformLocation(gl, program){
        return{
            perspective:    gl.getUniformLocation(program, "uPMatrix"), 
            modalMatrix:    gl.getUniformLocation(program, "uMVMatrix"),
            cameraMatrix:   gl.getUniformLocation(program, "uCameraMatrix"),
            mainTexture:    gl.getUniformLocation(program, "uMainTex")  
        }
    }
}