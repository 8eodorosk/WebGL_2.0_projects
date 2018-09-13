const ATTR_POSITION_NAME    = "a_position";
const ATTR_POSITION_LOC     = 0;
const ATTR_NORMAL_NAME      = "a_norm";
const ATTR_NORMAL_LOC       = 1;
const ATTR_UV_NAME          = "a_uv";
const ATTR_UV_LOC           = 2;



class GlUtil{

    static rgbArray(){
        if (arguments.length == 0) { return null; }

        let rtn = [];


        for (var i = 0,c,p; i < arguments.length; i++) {
            if(arguments[i].length < 6) continue;
            c=arguments[i];
            p= (c[0] == '#')?1:0;


            rtn.push(
                parseInt(c[p] + c[p+1], 16) / 255,
                parseInt(c[p+2] + c[p+3], 16) / 255,
                parseInt(c[p+4] + c[p+5], 16) / 255
                );
        }
        return rtn;
    }

}



/**
 * [GLInstance description]
 * @param {[type]} canvasID [description]
 */
function GLInstance(canvasID){

    let canvas =  document.getElementById(canvasID),        
    gl = canvas.getContext("webgl2");

    if (!gl) {
        console.error("WebGL context is not available");
        return null;
    }

    gl.mMeshCache = []; //cache all the mesh structs, easy to unload buffers if thery all exist in one place.
    gl.mtextureCache = [];


    // Setup GL, Sett all the default configurations we need
    gl.cullFace(gl.BACK);                               //back is alse default
    gl.frontFace(gl.CCW);                               // counter clockwise
    gl.enable(gl.DEPTH_TEST);                           // Fragment Pixels closer to camera overrides further ones
    gl.enable(gl.CULL_FACE);                            // Cull back face, so only show triangles that are cerated clockwise
    gl.depthFunc(gl.LEQUAL);                            // Near things obcure far things    
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // setup default aplha blending
    gl.clearColor(1.0,1.0,1.0,1.0);                     // Set clear color

    /**
     * [fClear description]
     * @return {[type]} [description]
     */
    gl.fClear = function()  {
        this.clear(this.COLOR_BUFFER_BIT | this.DEPTH_BUFFER_BIT);
        return this;
    }

    gl.fCreateArrayBuffer = function(floatAry, isStatic ){
        if(isStatic === undefined) isStatic == true;

        let buff = this.createBuffer();
        this.bindBuffer(this.ARRAY_BUFFER, buff);
        this.bufferData(this.ARRAY_BUFFER, floatAry, (isStatic)? this.STATIC_DRAW : this.DYNAMIC_DRAW);
        this.bindBuffer(this.ARRAY_BUFFER, null);

        return buff;
    }

    gl.fCreateMeshVAO = function(name, aryInd, aryVert, aryNorm, aryUV, vertLen) {
        let rtn = {
            drawMode: this.TRIANGLES
        };

        //create and bind VAO
        rtn.vao = this.createVertexArray();
        this.bindVertexArray(rtn.vao);

        if (aryVert !== undefined && aryVert != null) {
            rtn.bufVertices  = this.createBuffer();  //create buffer
            rtn.vertexComponentLen = vertLen || 3;  // how many floats make up a vertex
            rtn.vertexCount = aryVert.length / rtn.vertexComponentLen; //how many vertices in the array 

            this.bindBuffer(this.ARRAY_BUFFER, rtn.bufVertices);
            this.bufferData(this.ARRAY_BUFFER, new Float32Array(aryVert), this.STATIC_DRAW);
            this.enableVertexAttribArray(ATTR_POSITION_LOC);
            // this.vertexAttribPointer(ATTR_POSITION_LOC,3,this.FLOAT,false,0,0);
            this.vertexAttribPointer(ATTR_POSITION_LOC, rtn.vertexComponentLen, this.FLOAT, false, 0, 0);
        }
        if(aryNorm !== undefined && aryNorm != null){
            rtn.bufNormals = this.createBuffer();
            this.bindBuffer(this.ARRAY_BUFFER, rtn.bufNormals);
            this.bufferData(this.ARRAY_BUFFER, new Float32Array(aryNorm), this.STATIC_DRAW);
            this.enableVertexAttribArray(ATTR_NORMAL_LOC);
            this.vertexAttribPointer(ATTR_NORMAL_LOC,3,this.FLOAT,false,0,0);
        }
        if(aryUV !== undefined && aryUV != null){
            rtn.bufUV = this.createBuffer();
            this.bindBuffer(this.ARRAY_BUFFER, rtn.bufUV);
            this.bufferData(this.ARRAY_BUFFER, new Float32Array(aryUV), this.STATIC_DRAW);
            this.enableVertexAttribArray(ATTR_UV_LOC);
            this.vertexAttribPointer(ATTR_UV_LOC,2,this.FLOAT,false,0,0);
        }
        if(aryInd !== undefined && aryInd != null){
            rtn.buffIndex = this.createBuffer();
            rtn.indexCount = aryInd.length;
            this.bindBuffer(this.ELEMENT_ARRAY_BUFFER, rtn.buffIndex);
            this.bufferData(this.ELEMENT_ARRAY_BUFFER, new Uint16Array(aryInd), this.STATIC_DRAW);
            // this.bindBuffer(this.ELEMENT_ARRAY_BUFFER, null);
        }
        // dispose the buffers after they are created
        this.bindVertexArray(null);  //unbind vao IMPORTANT
        this.bindBuffer(this.ARRAY_BUFFER, null); //unbid any buffers that might be set 
        if(aryInd != null && aryInd !== undefined)  this.bindBuffer(this.ELEMENT_ARRAY_BUFFER,null);
        this.mMeshCache[name] = rtn;
        //console.log(rtn);
        return rtn;
    }

    gl.fLoadTexture = function(name, img, doYFlip){
        let tex = this.createTexture();
        if (doYFlip) {
            this.pixelStorei(this.UNPACK_FLIP_Y_WEBGL, true); //flip texture by the Y position
        }

        this.bindTexture(this.TEXTURE_2D, tex); 
        gl.texImage2D(this.TEXTURE_2D , 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, img);  // push image to the gpu


        // set ups how textures will be scaled as your mesh gets scaled 
        this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, this.LINEAR); // Setup Scaling 
        this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER , this.LINEAR_MIPMAP_NEAREST);  // Set down scalling
        this.generateMipmap(this.TEXTURE_2D, null); // probably is optional,
        // optimizes the resolution for us, as the mesh scales it uses the one that fits...

        this.bindTexture(this.TEXTURE_2D, null);
        this.mtextureCache[name] = tex;

        if (doYFlip == true) {
            this.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false); // stop flipping textures
        }
        return tex;

    }

    gl.fLoadCubeMap = function(name, imgAry){
        if (imgAry.length != 6 ) {return null;}

        let tex = this.createTexture();
        this.bindTexture(this.TEXTURE_CUBE_MAP, tex);

        for (var i = 0; i < 6; i++) {
            this.texImage2D(this.   TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, imgAry[i]);
        }

        this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_MAG_FILTER, this.LINEAR);         //Setup up scalling
        this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_MIN_FILTER, this.LINEAR);         //Setup down scalling
        this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_S, this.CLAMP_TO_EDGE);   //stretch image to X position
        this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_T, this.CLAMP_TO_EDGE);   //stretch image to Y position
        this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_R, this.CLAMP_TO_EDGE);   //stretch image to X position
        

        this.bindTexture(this.TEXTURE_CUBE_MAP, null);
        this.mtextureCache[name] = tex;
        return tex;
    }

    gl.fSetSize = function(w,h){
        this.canvas.style.width = w + "px";
        this.canvas.style.height = h + "px";
        this.canvas.width = w;
        this.canvas.height = h;

        this.viewport(0,0,w,h);
        return this;
    }

    gl.fFitScreen = function(wp, hp){
        return this.fSetSize(window.innerWidth * (wp || 1), window.innerHeight * (hp || 1));
    }

    return gl;
}

/* WHAT this REFERS TO. HOLY BIBLE OF this!!
With function invocation, this refers to the global object, even if the function is being invoked from a method, 
and the function belongs to the same class as the method invoking it. Douglas Crockford has described this as "mistake in the design of the language" 
[Crockford 28]

With method invocation, this refers to the object on which the method is being invoked.

With apply invocation, this refers to whatever you set it to when calling apply.

With constructor invocation, this refers to the object that is created for you behind the scenes,
which is returned when the constructor exits (provided you don't misguidedly return your own object from a constructor).
*/