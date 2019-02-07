(() => {
  'use strict';
  // vertex
  const vs = `#version 300 es\nin vec2 p;out vec2 vuv;void main(){gl_Position = vec4(vuv = p, 0, 1);}`;

  // fragment
  const fs = `#version 300 es\n
precision highp float;
precision highp int;
precision highp sampler2D; 
in vec2 vuv;
uniform float time;
uniform vec2 Res, mouse;
uniform sampler2D uMeshData;
uniform int vertsCount;
uniform mat4 uRot;
layout(location = 0) out lowp vec4 fragColor;
 
struct Ray {
  vec3 orig, dir;
}R_;
/*
// https://github.com/Jojendersie/gpugi/blob/5d18526c864bbf09baca02bfab6bcec97b7e1210/gpugi/shader/intersectiontests.glsl#L63
bool isTriangle(Ray ray, in vec3 p0, in vec3 p1, in vec3 p2, out vec3 N) {
  vec3 e0 = p1 - p0, e1 = p0 - p2;
  N = cross(e1, e0);
  vec3 e2 = (1.0 / dot(N, ray.dir)) * (p0 - ray.orig);
  vec3 i = cross(ray.dir, e2);
  vec3 b = vec3(0.0, dot(i, e1), dot(i, e0));
  b.x = 1.0 - (b.z + b.y);
  return (dot(N, e2) > 1e-8) && all(greaterThanEqual(b, vec3(0.0)));
}
*/
bool isTriangle(Ray ray, in vec3 a, in vec3 b, in vec3 c, out vec3 N) {
  float eps= 0.001;
   vec3 ab=b-a;
   vec3 ac=c-a;
   
   N = cross(ray.dir,ac);

   float det=dot(ab,N);
   // if the determinant is negative the triangle is backfacing
   // if the determinant is close to 0, the ray misses the triangl
   if(det<=eps){ return false;}
   
   vec3 ao=ray.orig-a;
   float u=dot(ao,N)/det;
   if(u<0.0 || u>1.0){ return false;}
    
   vec3 e = cross(ao,ab);
   
   float v=dot(ray.dir,e)/det;
   
   if(v<0.0||u+v>1.0){ return false;}

   float t= dot(ac,e)/det;
   N = vec3(u,v,t);
   return true;
}
void Camera(out Ray ray, vec3 lookAt, vec3 up, float angle, float aspect) {
  vec3 g = normalize(lookAt - ray.orig);
  vec3 u = normalize(cross(g, up));
  vec3 v = normalize(cross(u, g));
  u = u * tan(radians(angle * .5));
  v = v * tan(radians(angle * .5)) / aspect;
  ray.dir = normalize(g + ray.dir.x * u + ray.dir.y * v);
}

#define rmat(a, b) mat3(1, 0, 0, 0, cos(b), -sin(b), 0, sin(b), cos(b)) * mat3(cos(a), 0, sin(a), 0, 1, 0, -sin(a), 0, cos(a))

void main() {
  vec3 SceneCol = vec3(0.5);
  
  vec3 hit = vec3(0.);
  vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);
  
  R_ = Ray(vec3(0.0, 0.0, 3.0), vec3(vuv, -1.));

	Camera(R_, vec3(0., 0., 1.), vec3(0., 1., 0.), 90.0, (Res.x / Res.y));
  
  // rotation
  R_.dir = mat3(uRot) * R_.dir;
  R_.orig = mat3(uRot) * R_.orig;
  
  float mindist = -1000.0;

	// here comes this importend part unpack the texture
  for (int i = 0; i < vertsCount; i += 3) 
  {

    a =  texelFetch(uMeshData, ivec2(i, 0), 0);
    b =  texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
    c =  texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));
    
 
  
    if (isTriangle(R_, a.xyz, b.xyz, c.xyz, hit))
    {
      float z = hit.z;
      if (z > mindist) {
      
				 float dif = max(0.0, dot(normalize(hit), normalize( vec3(0., 5., 5. ))));
				 SceneCol.rgb = vec3(1.0, 1.0, 1.0) * dif +.2 ;
         mindist = z;
      };
    }
  }
  
  vec3 sky = vec3(0.5, 0.25, 0.1) * (-R_.dir.y - 0.1);
  fragColor.rgb =  SceneCol ;
  fragColor.a = 1.0;
}`;
  const canvas = document.getElementById('c');
  const gl = canvas.getContext('webgl2', {
    alpha: !1,
    depth: !1,
    stencil: !1,
    antialias: !1,
    premultipliedAlpha: !1,
    presereDrawingBuffer: !1,
    failIfMajorPerformanceCaveat: !1
  });

  const {
    width,
    height
  } = canvas.getBoundingClientRect();
  gl.canvas.width = width;
  gl.canvas.height = height;

  // init
  const P = gl.createProgram();

  const Fp = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(Fp, fs);
  gl.compileShader(Fp);
  if (!gl.getShaderParameter(Fp, gl.COMPILE_STATUS)) throw '! F r a g: ' + gl.getShaderInfoLog(Fp);
  gl.attachShader(P, Fp);

  const Vp = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(Vp, vs);
  gl.compileShader(Vp);
  if (!gl.getShaderParameter(Vp, gl.COMPILE_STATUS)) throw '! V e r t: ' + gl.getShaderInfoLog(Vp);
  gl.attachShader(P, Vp);

  // link use program
  gl.linkProgram(P);
  gl.useProgram(P);

  // uniform location
  const time_loc = gl.getUniformLocation(P, 'time');
  const res_loc = gl.getUniformLocation(P, 'Res');
  const uLvertices = gl.getUniformLocation(P, 'vertsCount');
  const uLSr = gl.getUniformLocation(P, 'uMeshData');
  const mouse_loc = gl.getUniformLocation(P, 'mouse');
  const uLocRot = gl.getUniformLocation(P, "uRot");

  // free resources
  gl.detachShader(P, Fp);
  gl.detachShader(P, Vp);
  gl.deleteProgram(P);

  // fullscreen quad
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Int8Array([-3, 1, 1, -3, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.BYTE, !1, 0, 0);
  gl.bindVertexArray(null);

  // bind texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);


  const verts = [
    1.000000, 1.000000, -1.000000, 1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, 1.000000, -1.000000, 1.000000, 1.000000, -1.000000,
    1.000000, 0.999999, 1.000000, -1.000000, 1.000000, 1.000000, -1.000000, -1.000000, 1.000000, -1.000000, -1.000000, 1.000000, 0.999999, -1.000001, 1.000000, 1.000000, 0.999999, 1.000000,
    1.000000, 1.000000, -1.000000, 1.000000, 0.999999, 1.000000, 0.999999, -1.000001, 1.000000,
    0.999999, -1.000001, 1.000000, 1.000000, -1.000000, -1.000000, 1.000000, 1.000000, -1.000000,
    1.000000, -1.000000, -1.000000, 0.999999, -1.000001, 1.000000, -1.000000, -1.000000, 1.000000, -1.000000, -1.000000, 1.000000, -1.000000, -1.000000, -1.000000, 1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, -1.000000, 1.000000, -1.000000, 1.000000, 1.000000, -1.000000, 1.000000, 1.000000, -1.000000, 1.000000, -1.000000, -1.000000, -1.000000, -1.000000,
    1.000000, 0.999999, 1.000000, 1.000000, 1.000000, -1.000000, -1.000000, 1.000000, -1.000000, -1.000000, 1.000000, -1.000000, -1.000000, 1.000000, 1.000000, 1.000000, 0.999999, 1.000000
  ];

  const meshVerts = new Float32Array(verts);
  const vertsLenght = meshVerts.length / 3;
  gl.uniform1i(uLvertices, vertsLenght);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, vertsLenght, 1, 0, gl.RGB, gl.FLOAT, meshVerts);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


  const cEv = gl.canvas.addEventListener; // time safing, less typing

  let rMat = mat4.create();

  mat4.identity(rMat);

  let mouseDown = !1;
  let mousePosition = [];

  function mDown(e) {
    mouseDown = !0;
    mousePosition = [e.clientX, e.clientY];
  };

  function mUp() {
    mouseDown = !1;
  };

  function mMove(e) {
    if (mouseDown) {
      let newX = e.clientX;
      let newY = e.clientY;
      let deltaX = (newX - mousePosition[0]);
      let deltaY = (newY - mousePosition[1]);
      const nRot = mat4.create();
      mat4.rotateY(nRot, nRot, (deltaX * 0.5) * 0.01);
      mat4.rotateX(rMat, rMat, (deltaY * 0.5) * 0.01);
      mat4.multiply(rMat, nRot, rMat);
      mousePosition = [newX, newY];
    }
  }

  cEv('mousemove', mMove, !1);
  cEv('mousedown', mDown, !1);
  cEv('mouseup', mUp, !1);

  const draw = (clock) => {
    clock *= 0.001;
    gl.viewport(0.0, 0.0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uLSr, 0);
    gl.uniformMatrix4fv(uLocRot, false, rMat);
    gl.uniform1f(time_loc, clock);
    gl.uniform2f(mouse_loc, mousePosition[0], mousePosition[1]);
    gl.uniform2f(res_loc, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})()
