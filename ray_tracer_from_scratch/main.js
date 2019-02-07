(() => {
'use strict';
// vertex
const vs = `#version 300 es\n
in vec2 p;
out vec2 vuv;
void main(){
    gl_Position = vec4(vuv = p, 0, 1);
}`;

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

#define MAX_BOUNCES 4
#define rmat(a, b) mat3(1, 0, 0, 0, cos(b), -sin(b), 0, sin(b), cos(b)) * mat3(cos(a), 0, sin(a), 0, 1, 0, -sin(a), 0, cos(a))


struct Ray {
  vec3 orig, dir;
}R_;


struct Sphere{
    vec3 center;
    float radius;
};

mat4 rotate() {
    // original x= mouse.x, y= mouse.y
    float x = mouse.y; //y=mouse.y+sin(time*2.),z=0.;
    float y= mouse.x,z=0.;
    float a = sin(x), b = cos(x), c = sin(y), d = cos(y), e = sin(z), f = cos(z), ac = a * c, bc = b * c;

    return mat4(d * f,           d * e,           -c,     0.0, 
                ac * f - b * e,  ac * e + b * f,  a * d,  0.0,     
                bc * f + a * e,  bc * e - a * f,  b * d,  0.0, 
                0.0,             0.0,             0.0,    1.0);
}

mat4 frotate( float x, float y, float z )
{
    float a = sin(x); float b = cos(x); 
    float c = sin(y); float d = cos(y); 
    float e = sin(z); float f = cos(z); 

    float ac = a*c;
    float bc = b*c;

    return mat4( d*f,      d*e,       -c, 0.0,
                 ac*f-b*e, ac*e+b*f, a*d, 0.0,
                 bc*f+a*e, bc*e-a*f, b*d, 0.0,
                 0.0,      0.0,      0.0, 1.0 );
}

mat4 translate( float x, float y, float z )
{
    return mat4( 1.0, 0.0, 0.0, 0.0,
                 0.0, 1.0, 0.0, 0.0,
                 0.0, 0.0, 1.0, 0.0,
                 x, y, z, 1.0 );
}


vec3 getHitPoint(Ray ray, float t) {
    return ray.orig + t * ray.dir;   
}

bool hitSphere(vec3 orig,vec3 dir,vec3 center,float r,out vec3 intersect){
    vec3 oc = orig - center;
    float b = dot(oc,dir);
    float c = dot(oc,oc) - r * r;
    if(c>0.0 && b > 0.0) return false;
    float discriminant = b*b -c;
    if(discriminant < 0.0) return false;
    float t= -b-sqrt(discriminant);
    if(t<0.0) return false;
    intersect = orig + t*dir;
    return true;  
}

//triangle intersection by miffy
bool hitTriangle(vec3 orig,vec3 dir,vec3 a,vec3 b,vec3 c,out vec3 uvt,out vec3 triangleNormal){
   float eps=1e-8;
   vec3 ab=b-a;
   vec3 ac=c-a;

   triangleNormal = cross(ab,ac);
   vec3 n=cross(dir,ac);

   float det=dot(ab,n);
   // if the determinant is negative the triangle is backfacing
   // if the determinant is close to 0, the ray misses the triangl
   if(det<=eps){ return false;}
   
   vec3 ao=orig-a;
   float u=dot(ao,n)/det;
   if(u<0.0 || u>1.0){ return false;}
    
   vec3 e=cross(ao,ab);
   float v=dot(dir,e)/det;
   if(v<0.0||u+v>1.0){ return false;}

   float t= dot(ac,e)/det;
   uvt = vec3(u,v,t);
   return true;
}

bool isTriangle(Ray ray, in vec3 p0, in vec3 p1, in vec3 p2, out vec3 triangleNormal) {

    vec3 barycentricCoord;
    vec3 e0 = p1 - p0; 
    vec3 e1 = p0 - p2;

    triangleNormal = cross(e1, e0);


    vec3 e2 = (1.0 / dot(triangleNormal, ray.dir)) * (p0 - ray.orig);
    vec3 i = cross(ray.dir, e2);

    barycentricCoord.y = dot(i, e1);
    barycentricCoord.z = dot(i, e0);
    barycentricCoord.x = 0.0;
    barycentricCoord.x = 1.0 - (barycentricCoord.z + barycentricCoord.y);

    float hit = dot(triangleNormal, e2);

    return (hit > 1e-8) && all(greaterThanEqual(barycentricCoord, vec3(0.0)));
}


bool isTriangle_2(Ray ray, in vec3 p0, in vec3 p1, in vec3 p2, out vec3 triangleNormal,out float hitPos ) {

    vec3 barycentricCoord;
    vec3 e0 = p1 - p0; 
    vec3 e1 = p0 - p2;

    triangleNormal = cross(e1, e0);


    vec3 e2 = (1.0 / dot(triangleNormal, ray.dir)) * (p0 - ray.orig);
    vec3 i = cross(ray.dir, e2);

    barycentricCoord.y = dot(i, e1);
    barycentricCoord.z = dot(i, e0);
    barycentricCoord.x = 0.0;
    barycentricCoord.x = 1.0 - (barycentricCoord.z + barycentricCoord.y);

    hitPos = dot(triangleNormal, e2);

    return (hitPos > 1e-8) && all(greaterThanEqual(barycentricCoord, vec3(0.0)));
}

// triangle implementation from scratsapixel
bool isTriangle2(Ray ray, in vec3 p0, in vec3 p1, in vec3 p2, out vec3 position, out vec3 triangleNormal, out float t){
    // compute plane's normal
    vec3 e0 = p1 - p0; 
    vec3 e1 = p0 - p2;

    triangleNormal = cross(e1, e0);

    float nDotRayDirection = dot(triangleNormal, ray.dir);

    //check if ray and plane are parallel
    if (abs(nDotRayDirection) < 1e-8){ 
        return false; //they are parralel so they don intersect
    }

    //compute d parameter 
    float d = dot(triangleNormal, e0);

    // compoute t
    t = (dot(triangleNormal, ray.orig) + d) / nDotRayDirection;
    // check if the triangle is in behind the ray
    if (t<0.) {
        return false;
    }

    //vec3 P = ray.orig + t * ray.dir;
    vec3 P = getHitPoint(ray, t);

    //vector perpendicular to triangle's plane
    vec3 C;

    //edge 0
    vec3 edge0 = p1-p0;
    vec3 ep0 = P - e0;
    C = cross(edge0, ep0);

    if (dot(triangleNormal, C) < 0.) return false;

    //edge 1
    vec3 edge1 = p2-p1;
    vec3 ep1 = P - p1;
    C = cross(edge1, ep1);

    if (dot(triangleNormal, C) < 0.) return false;

    //edge 2
    vec3 edge2 = p0-p2;
    vec3 ep2 = P - p2;
    C = cross(edge2, ep2);

    if (dot(triangleNormal, C) < 0.) return false;

    position = P;
    return true;
}

vec3 getLight(vec3 hitPos, vec3 lightPos ){
    return vec3(0.);
}

void Camera(out Ray ray, vec3 lookAt, vec3 up, float angle, float aspect) {

    vec3 g = normalize(lookAt - ray.orig);
    vec3 u = normalize(cross(g, up));
    vec3 v = normalize(cross(u, g));
    u = u * tan(radians(angle * .5));
    v = v * tan(radians(angle * .5)) / aspect;
    ray.dir = normalize(g + ray.dir.x * u + ray.dir.y * v);

}

void main() {


    vec3 SceneCol = vec3(0.5);

    //lightsource starting code here
    mat4 mv =   translate(0.0,1.0,-2.0);
                //*frotate(3.14*2.,0.0,0.0)
                //*frotate(0.0,1.,0.0);
    Sphere lightSource;
    lightSource.radius = 0.18;
    lightSource.center = vec3(1.,1.*sin(time),2.);
    //lightSource.center= vec4(mv*vec4(2.5*sin(time),1.5,2.5*cos(time),1.0)).xyz;

    vec3 hit = vec3(0.0,0.0,0.0);
    vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);

    
  
    R_ = Ray(vec3(0.0, 0.0, 5.0), vec3(vuv, -1.));
   

    Camera(R_, vec3(0., 0., 1.), vec3(0., 1., 0.), 90.0, (Res.x / Res.y));

    // rotation
    R_.dir = mat3(uRot) * R_.dir;
    R_.orig = mat3(uRot) * R_.orig;

    float mindist = -1000.0;

    //draw light souirce
    bool isHit = hitSphere(R_.orig,R_.dir,lightSource.center,lightSource.radius,hit);

    if(isHit && hit.z > mindist)
    {
        mindist = hit.z;
        SceneCol.rgb= vec3(1.0,1.0,1.0);
    }

    int flag = 1; 
    //draw mnesh loaded from texture data
    for (int i = 0; i < vertsCount/2; i += 3) {
        //original translation matrices
         //a = rotate() * texelFetch(uMeshData, ivec2(i, 0), 0);
         //b = rotate() * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
         //c = rotate() * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        // a = frotate(3.14*.5,0.,0.0) * texelFetch(uMeshData, ivec2(i, 0), 0);
        // b = frotate(3.14*.5,0.,0.0) * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        // c = frotate(3.14*.5,0.,0.0) * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        a = texelFetch(uMeshData, ivec2(i, 0), 0);
        b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

       

        //alg_1
        if (flag == 1) {
            // me ayto ton algorithmo exw glitches
            vec3 triangleNormal;
            vec3 uvt;
            bool isHit = hitTriangle(R_.orig,R_.dir, a.xyz,b.xyz,c.xyz,uvt, triangleNormal);
            if (isHit) {
                vec3 intersect = R_.orig + R_.dir*uvt.z;
                float z = intersect.z;
                if (z>mindist) {
                 mindist = z;
                //SceneCol.rgb = vec3(intersect.x, intersect.y, 1. - (intersect.x - intersect.y));
                SceneCol.rgb = vec3(intersect.x, intersect.y, intersect.z);
                vec3 lightDir =  normalize(lightSource.center-intersect);
                    float diffuse = clamp(dot(lightDir, triangleNormal), 0., 1.);
                    SceneCol.rgb *= diffuse; 
                }
            }      
       }
        
       //alg_2 
       if (flag == 2) {
            // me ayto de moy fwtizei ti deyteri mpala
            //original intersection test
            if (isTriangle(R_, a.xyz, b.xyz, c.xyz, hit)){
                float z = hit.z;
                if (z > mindist) {
                    mindist = z;
                    //SceneCol.rgb = vec3(hit.x, hit.y, 1. - (hit.x - hit.y));
                    SceneCol.rgb = vec3(hit.x, hit.y, hit.z);
                    vec3 lightDir =  normalize(lightSource.center-hit);
                    float diffuse = clamp(dot(lightDir, hit), 0., 1.);
                    SceneCol.rgb *= diffuse * 4.; 
                };
            }
        }
    }

     for (int i =  vertsCount/2; i < vertsCount; i += 3) {
    
        //original translation matrices
        //a = translate(-2.0,1.0,0.) * rotate() * texelFetch(uMeshData, ivec2(i, 0), 0);
        //b = translate(-2.0,1.0,0.) * rotate() * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        //c = translate(-2.0,1.0,0.) * rotate() * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        a = translate(-2.0,0.0,0.) * texelFetch(uMeshData, ivec2(i, 0), 0);
        b = translate(-2.0,0.0,0.) * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        c = translate(-2.0,0.0,0.) * texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        //alg_1
        if (flag == 1) {
            vec3 triangleNormal;
            vec3 uvt;
            bool isHit = hitTriangle(R_.orig,R_.dir, a.xyz,b.xyz,c.xyz,uvt, triangleNormal);
            if (isHit) {
                vec3 intersect = R_.orig + R_.dir*uvt.z;
                float z = intersect.z;
                if (z>mindist) {
                 mindist = z;
                //SceneCol.rgb = vec3(intersect.x, intersect.y, 1. - (intersect.x - intersect.y));
                SceneCol.rgb = vec3(intersect.x, intersect.y, intersect.z);
                vec3 lightDir =  normalize(lightSource.center-intersect);
                float diffuse = clamp(dot(lightDir, triangleNormal), 0., 1.);
                SceneCol.rgb *= diffuse; 
                }
            }      
        }

        //alg_2 
        if (flag == 2) {
            // me ayto de moy fwtizei ti deyteri mpala
            //original intersection test
            if (isTriangle(R_, a.xyz, b.xyz, c.xyz, hit)){
                float z = hit.z;
                if (z > mindist) {
                    mindist = z;
                    //SceneCol.rgb = vec3(hit.x, hit.y, 1. - (hit.x - hit.y));
                    SceneCol.rgb = vec3(hit.x, hit.y, hit.z);
                    vec3 lightDir =  normalize(lightSource.center-hit);
                   //float diffuse = clamp(dot(lightDir, hit), 0., 1.);
                    float dif = max(0.0, dot(normalize(hit), normalize( vec3(0., 5., 5. ))));
                    SceneCol.rgb *= dif * 4.; 
                };
            }
        }
       
    }

    vec3 sky = vec3(0.5, 0.25, 0.1) * (-R_.dir.y);
    //vec3 sky = vec3(0.5, 0.25, 0.1);
    fragColor.rgb = SceneCol + sky;
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

    const { width, height } = canvas.getBoundingClientRect();
    console.log(width, height)
    gl.canvas.width =  900; //window.innerWidth;
    gl.canvas.height =  450; //window.innerHeight;

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
    gl.bufferData(gl.ARRAY_BUFFER, new Int8Array([-4, 2, 2, -4, 2, 2 /*, -4, 2, -4, -4, 2, -4*/ ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.BYTE, !1, 0, 0);
    gl.bindVertexArray(null);

    // bind texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);


    // blender 2.79 Icosphere
    // export -> *.raw (needs to be enable first under settings)
   
    const verts =[
        //first sphere
         0.000000, 0.000000, -1.000000, 0.425323, -0.309011, -0.850654, -0.162456, -0.499995, -0.850654,
        0.723607, -0.525725, -0.447220, 0.425323, -0.309011, -0.850654, 0.850648, 0.000000, -0.525736,
        0.000000, 0.000000, -1.000000, -0.162456, -0.499995, -0.850654, -0.525730, 0.000000, -0.850652,
        0.000000, 0.000000, -1.000000, -0.525730, 0.000000, -0.850652, -0.162456, 0.499995, -0.850654,
        0.000000, 0.000000, -1.000000, -0.162456, 0.499995, -0.850654, 0.425323, 0.309011, -0.850654,
        0.723607, -0.525725, -0.447220, 0.850648, 0.000000, -0.525736, 0.951058, -0.309013, 0.000000,
        -0.276388, -0.850649, -0.447220, 0.262869, -0.809012, -0.525738, 0.000000, -1.000000, 0.000000,
        -0.894426, 0.000000, -0.447216, -0.688189, -0.499997, -0.525736, -0.951058, -0.309013, 0.000000,
        -0.276388, 0.850649, -0.447220, -0.688189, 0.499997, -0.525736, -0.587786, 0.809017, 0.000000,
        0.723607, 0.525725, -0.447220, 0.262869, 0.809012, -0.525738, 0.587786, 0.809017, 0.000000,
        0.723607, -0.525725, -0.447220, 0.951058, -0.309013, 0.000000, 0.587786, -0.809017, 0.000000,
        -0.276388, -0.850649, -0.447220, 0.000000, -1.000000, 0.000000, -0.587786, -0.809017, 0.000000,
        -0.894426, 0.000000, -0.447216, -0.951058, -0.309013, 0.000000, -0.951058, 0.309013, 0.000000,
        -0.276388, 0.850649, -0.447220, -0.587786, 0.809017, 0.000000, 0.000000, 1.000000, 0.000000,
        0.723607, 0.525725, -0.447220, 0.587786, 0.809017, 0.000000, 0.951058, 0.309013, 0.000000,
        0.276388, -0.850649, 0.447220, 0.688189, -0.499997, 0.525736, 0.162456, -0.499995, 0.850654,
        -0.723607, -0.525725, 0.447220, -0.262869, -0.809012, 0.525738, -0.425323, -0.309011, 0.850654,
        -0.723607, 0.525725, 0.447220, -0.850648, 0.000000, 0.525736, -0.425323, 0.309011, 0.850654,
        0.276388, 0.850649, 0.447220, -0.262869, 0.809012, 0.525738, 0.162456, 0.499995, 0.850654,
        0.894426, 0.000000, 0.447216, 0.688189, 0.499997, 0.525736, 0.525730, 0.000000, 0.850652,
        0.525730, 0.000000, 0.850652, 0.162456, 0.499995, 0.850654, 0.000000, 0.000000, 1.000000,
        0.525730, 0.000000, 0.850652, 0.688189, 0.499997, 0.525736, 0.162456, 0.499995, 0.850654,
        0.688189, 0.499997, 0.525736, 0.276388, 0.850649, 0.447220, 0.162456, 0.499995, 0.850654,
        0.162456, 0.499995, 0.850654, -0.425323, 0.309011, 0.850654, 0.000000, 0.000000, 1.000000,
        0.162456, 0.499995, 0.850654, -0.262869, 0.809012, 0.525738, -0.425323, 0.309011, 0.850654,
        -0.262869, 0.809012, 0.525738, -0.723607, 0.525725, 0.447220, -0.425323, 0.309011, 0.850654,
        -0.425323, 0.309011, 0.850654, -0.425323, -0.309011, 0.850654, 0.000000, 0.000000, 1.000000,
        -0.425323, 0.309011, 0.850654, -0.850648, 0.000000, 0.525736, -0.425323, -0.309011, 0.850654,
        -0.850648, 0.000000, 0.525736, -0.723607, -0.525725, 0.447220, -0.425323, -0.309011, 0.850654,
        -0.425323, -0.309011, 0.850654, 0.162456, -0.499995, 0.850654, 0.000000, 0.000000, 1.000000,
        -0.425323, -0.309011, 0.850654, -0.262869, -0.809012, 0.525738, 0.162456, -0.499995, 0.850654,
        -0.262869, -0.809012, 0.525738, 0.276388, -0.850649, 0.447220, 0.162456, -0.499995, 0.850654,
        0.162456, -0.499995, 0.850654, 0.525730, 0.000000, 0.850652, 0.000000, 0.000000, 1.000000,
        0.162456, -0.499995, 0.850654, 0.688189, -0.499997, 0.525736, 0.525730, 0.000000, 0.850652,
        0.688189, -0.499997, 0.525736, 0.894426, 0.000000, 0.447216, 0.525730, 0.000000, 0.850652,
        0.951058, 0.309013, 0.000000, 0.688189, 0.499997, 0.525736, 0.894426, 0.000000, 0.447216,
        0.951058, 0.309013, 0.000000, 0.587786, 0.809017, 0.000000, 0.688189, 0.499997, 0.525736,
        0.587786, 0.809017, 0.000000, 0.276388, 0.850649, 0.447220, 0.688189, 0.499997, 0.525736,
        0.000000, 1.000000, 0.000000, -0.262869, 0.809012, 0.525738, 0.276388, 0.850649, 0.447220,
        0.000000, 1.000000, 0.000000, -0.587786, 0.809017, 0.000000, -0.262869, 0.809012, 0.525738,
        -0.587786, 0.809017, 0.000000, -0.723607, 0.525725, 0.447220, -0.262869, 0.809012, 0.525738,
        -0.951058, 0.309013, 0.000000, -0.850648, 0.000000, 0.525736, -0.723607, 0.525725, 0.447220,
        -0.951058, 0.309013, 0.000000, -0.951058, -0.309013, 0.000000, -0.850648, 0.000000, 0.525736,
        -0.951058, -0.309013, 0.000000, -0.723607, -0.525725, 0.447220, -0.850648, 0.000000, 0.525736,
        -0.587786, -0.809017, 0.000000, -0.262869, -0.809012, 0.525738, -0.723607, -0.525725, 0.447220,
        -0.587786, -0.809017, 0.000000, 0.000000, -1.000000, 0.000000, -0.262869, -0.809012, 0.525738,
        0.000000, -1.000000, 0.000000, 0.276388, -0.850649, 0.447220, -0.262869, -0.809012, 0.525738,
        0.587786, -0.809017, 0.000000, 0.688189, -0.499997, 0.525736, 0.276388, -0.850649, 0.447220,
        0.587786, -0.809017, 0.000000, 0.951058, -0.309013, 0.000000, 0.688189, -0.499997, 0.525736,
        0.951058, -0.309013, 0.000000, 0.894426, 0.000000, 0.447216, 0.688189, -0.499997, 0.525736,
        0.587786, 0.809017, 0.000000, 0.000000, 1.000000, 0.000000, 0.276388, 0.850649, 0.447220,
        0.587786, 0.809017, 0.000000, 0.262869, 0.809012, -0.525738, 0.000000, 1.000000, 0.000000,
        0.262869, 0.809012, -0.525738, -0.276388, 0.850649, -0.447220, 0.000000, 1.000000, 0.000000,
        -0.587786, 0.809017, 0.000000, -0.951058, 0.309013, 0.000000, -0.723607, 0.525725, 0.447220,
        -0.587786, 0.809017, 0.000000, -0.688189, 0.499997, -0.525736, -0.951058, 0.309013, 0.000000,
        -0.688189, 0.499997, -0.525736, -0.894426, 0.000000, -0.447216, -0.951058, 0.309013, 0.000000,
        -0.951058, -0.309013, 0.000000, -0.587786, -0.809017, 0.000000, -0.723607, -0.525725, 0.447220,
        -0.951058, -0.309013, 0.000000, -0.688189, -0.499997, -0.525736, -0.587786, -0.809017, 0.000000,
        -0.688189, -0.499997, -0.525736, -0.276388, -0.850649, -0.447220, -0.587786, -0.809017, 0.000000,
        0.000000, -1.000000, 0.000000, 0.587786, -0.809017, 0.000000, 0.276388, -0.850649, 0.447220,
        0.000000, -1.000000, 0.000000, 0.262869, -0.809012, -0.525738, 0.587786, -0.809017, 0.000000,
        0.262869, -0.809012, -0.525738, 0.723607, -0.525725, -0.447220, 0.587786, -0.809017, 0.000000,
        0.951058, -0.309013, 0.000000, 0.951058, 0.309013, 0.000000, 0.894426, 0.000000, 0.447216,
        0.951058, -0.309013, 0.000000, 0.850648, 0.000000, -0.525736, 0.951058, 0.309013, 0.000000,
        0.850648, 0.000000, -0.525736, 0.723607, 0.525725, -0.447220, 0.951058, 0.309013, 0.000000,
        0.425323, 0.309011, -0.850654, 0.262869, 0.809012, -0.525738, 0.723607, 0.525725, -0.447220,
        0.425323, 0.309011, -0.850654, -0.162456, 0.499995, -0.850654, 0.262869, 0.809012, -0.525738,
        -0.162456, 0.499995, -0.850654, -0.276388, 0.850649, -0.447220, 0.262869, 0.809012, -0.525738,
        -0.162456, 0.499995, -0.850654, -0.688189, 0.499997, -0.525736, -0.276388, 0.850649, -0.447220,
        -0.162456, 0.499995, -0.850654, -0.525730, 0.000000, -0.850652, -0.688189, 0.499997, -0.525736,
        -0.525730, 0.000000, -0.850652, -0.894426, 0.000000, -0.447216, -0.688189, 0.499997, -0.525736,
        -0.525730, 0.000000, -0.850652, -0.688189, -0.499997, -0.525736, -0.894426, 0.000000, -0.447216,
        -0.525730, 0.000000, -0.850652, -0.162456, -0.499995, -0.850654, -0.688189, -0.499997, -0.525736,
        -0.162456, -0.499995, -0.850654, -0.276388, -0.850649, -0.447220, -0.688189, -0.499997, -0.525736,
        0.850648, 0.000000, -0.525736, 0.425323, 0.309011, -0.850654, 0.723607, 0.525725, -0.447220,
        0.850648, 0.000000, -0.525736, 0.425323, -0.309011, -0.850654, 0.425323, 0.309011, -0.850654,
        0.425323, -0.309011, -0.850654, 0.000000, 0.000000, -1.000000, 0.425323, 0.309011, -0.850654,
        -0.162456, -0.499995, -0.850654, 0.262869, -0.809012, -0.525738, -0.276388, -0.850649, -0.447220,
        -0.162456, -0.499995, -0.850654, 0.425323, -0.309011, -0.850654, 0.262869, -0.809012, -0.525738,
        0.425323, -0.309011, -0.850654, 0.723607, -0.525725, -0.447220, 0.262869, -0.809012, -0.525738,


        // second sphere
        0.000000, 0.000000, -1.000000, 0.425323, -0.309011, -0.850654, -0.162456, -0.499995, -0.850654,
        0.723607, -0.525725, -0.447220, 0.425323, -0.309011, -0.850654, 0.850648, 0.000000, -0.525736,
        0.000000, 0.000000, -1.000000, -0.162456, -0.499995, -0.850654, -0.525730, 0.000000, -0.850652,
        0.000000, 0.000000, -1.000000, -0.525730, 0.000000, -0.850652, -0.162456, 0.499995, -0.850654,
        0.000000, 0.000000, -1.000000, -0.162456, 0.499995, -0.850654, 0.425323, 0.309011, -0.850654,
        0.723607, -0.525725, -0.447220, 0.850648, 0.000000, -0.525736, 0.951058, -0.309013, 0.000000,
        -0.276388, -0.850649, -0.447220, 0.262869, -0.809012, -0.525738, 0.000000, -1.000000, 0.000000,
        -0.894426, 0.000000, -0.447216, -0.688189, -0.499997, -0.525736, -0.951058, -0.309013, 0.000000,
        -0.276388, 0.850649, -0.447220, -0.688189, 0.499997, -0.525736, -0.587786, 0.809017, 0.000000,
        0.723607, 0.525725, -0.447220, 0.262869, 0.809012, -0.525738, 0.587786, 0.809017, 0.000000,
        0.723607, -0.525725, -0.447220, 0.951058, -0.309013, 0.000000, 0.587786, -0.809017, 0.000000,
        -0.276388, -0.850649, -0.447220, 0.000000, -1.000000, 0.000000, -0.587786, -0.809017, 0.000000,
        -0.894426, 0.000000, -0.447216, -0.951058, -0.309013, 0.000000, -0.951058, 0.309013, 0.000000,
        -0.276388, 0.850649, -0.447220, -0.587786, 0.809017, 0.000000, 0.000000, 1.000000, 0.000000,
        0.723607, 0.525725, -0.447220, 0.587786, 0.809017, 0.000000, 0.951058, 0.309013, 0.000000,
        0.276388, -0.850649, 0.447220, 0.688189, -0.499997, 0.525736, 0.162456, -0.499995, 0.850654,
        -0.723607, -0.525725, 0.447220, -0.262869, -0.809012, 0.525738, -0.425323, -0.309011, 0.850654,
        -0.723607, 0.525725, 0.447220, -0.850648, 0.000000, 0.525736, -0.425323, 0.309011, 0.850654,
        0.276388, 0.850649, 0.447220, -0.262869, 0.809012, 0.525738, 0.162456, 0.499995, 0.850654,
        0.894426, 0.000000, 0.447216, 0.688189, 0.499997, 0.525736, 0.525730, 0.000000, 0.850652,
        0.525730, 0.000000, 0.850652, 0.162456, 0.499995, 0.850654, 0.000000, 0.000000, 1.000000,
        0.525730, 0.000000, 0.850652, 0.688189, 0.499997, 0.525736, 0.162456, 0.499995, 0.850654,
        0.688189, 0.499997, 0.525736, 0.276388, 0.850649, 0.447220, 0.162456, 0.499995, 0.850654,
        0.162456, 0.499995, 0.850654, -0.425323, 0.309011, 0.850654, 0.000000, 0.000000, 1.000000,
        0.162456, 0.499995, 0.850654, -0.262869, 0.809012, 0.525738, -0.425323, 0.309011, 0.850654,
        -0.262869, 0.809012, 0.525738, -0.723607, 0.525725, 0.447220, -0.425323, 0.309011, 0.850654,
        -0.425323, 0.309011, 0.850654, -0.425323, -0.309011, 0.850654, 0.000000, 0.000000, 1.000000,
        -0.425323, 0.309011, 0.850654, -0.850648, 0.000000, 0.525736, -0.425323, -0.309011, 0.850654,
        -0.850648, 0.000000, 0.525736, -0.723607, -0.525725, 0.447220, -0.425323, -0.309011, 0.850654,
        -0.425323, -0.309011, 0.850654, 0.162456, -0.499995, 0.850654, 0.000000, 0.000000, 1.000000,
        -0.425323, -0.309011, 0.850654, -0.262869, -0.809012, 0.525738, 0.162456, -0.499995, 0.850654,
        -0.262869, -0.809012, 0.525738, 0.276388, -0.850649, 0.447220, 0.162456, -0.499995, 0.850654,
        0.162456, -0.499995, 0.850654, 0.525730, 0.000000, 0.850652, 0.000000, 0.000000, 1.000000,
        0.162456, -0.499995, 0.850654, 0.688189, -0.499997, 0.525736, 0.525730, 0.000000, 0.850652,
        0.688189, -0.499997, 0.525736, 0.894426, 0.000000, 0.447216, 0.525730, 0.000000, 0.850652,
        0.951058, 0.309013, 0.000000, 0.688189, 0.499997, 0.525736, 0.894426, 0.000000, 0.447216,
        0.951058, 0.309013, 0.000000, 0.587786, 0.809017, 0.000000, 0.688189, 0.499997, 0.525736,
        0.587786, 0.809017, 0.000000, 0.276388, 0.850649, 0.447220, 0.688189, 0.499997, 0.525736,
        0.000000, 1.000000, 0.000000, -0.262869, 0.809012, 0.525738, 0.276388, 0.850649, 0.447220,
        0.000000, 1.000000, 0.000000, -0.587786, 0.809017, 0.000000, -0.262869, 0.809012, 0.525738,
        -0.587786, 0.809017, 0.000000, -0.723607, 0.525725, 0.447220, -0.262869, 0.809012, 0.525738,
        -0.951058, 0.309013, 0.000000, -0.850648, 0.000000, 0.525736, -0.723607, 0.525725, 0.447220,
        -0.951058, 0.309013, 0.000000, -0.951058, -0.309013, 0.000000, -0.850648, 0.000000, 0.525736,
        -0.951058, -0.309013, 0.000000, -0.723607, -0.525725, 0.447220, -0.850648, 0.000000, 0.525736,
        -0.587786, -0.809017, 0.000000, -0.262869, -0.809012, 0.525738, -0.723607, -0.525725, 0.447220,
        -0.587786, -0.809017, 0.000000, 0.000000, -1.000000, 0.000000, -0.262869, -0.809012, 0.525738,
        0.000000, -1.000000, 0.000000, 0.276388, -0.850649, 0.447220, -0.262869, -0.809012, 0.525738,
        0.587786, -0.809017, 0.000000, 0.688189, -0.499997, 0.525736, 0.276388, -0.850649, 0.447220,
        0.587786, -0.809017, 0.000000, 0.951058, -0.309013, 0.000000, 0.688189, -0.499997, 0.525736,
        0.951058, -0.309013, 0.000000, 0.894426, 0.000000, 0.447216, 0.688189, -0.499997, 0.525736,
        0.587786, 0.809017, 0.000000, 0.000000, 1.000000, 0.000000, 0.276388, 0.850649, 0.447220,
        0.587786, 0.809017, 0.000000, 0.262869, 0.809012, -0.525738, 0.000000, 1.000000, 0.000000,
        0.262869, 0.809012, -0.525738, -0.276388, 0.850649, -0.447220, 0.000000, 1.000000, 0.000000,
        -0.587786, 0.809017, 0.000000, -0.951058, 0.309013, 0.000000, -0.723607, 0.525725, 0.447220,
        -0.587786, 0.809017, 0.000000, -0.688189, 0.499997, -0.525736, -0.951058, 0.309013, 0.000000,
        -0.688189, 0.499997, -0.525736, -0.894426, 0.000000, -0.447216, -0.951058, 0.309013, 0.000000,
        -0.951058, -0.309013, 0.000000, -0.587786, -0.809017, 0.000000, -0.723607, -0.525725, 0.447220,
        -0.951058, -0.309013, 0.000000, -0.688189, -0.499997, -0.525736, -0.587786, -0.809017, 0.000000,
        -0.688189, -0.499997, -0.525736, -0.276388, -0.850649, -0.447220, -0.587786, -0.809017, 0.000000,
        0.000000, -1.000000, 0.000000, 0.587786, -0.809017, 0.000000, 0.276388, -0.850649, 0.447220,
        0.000000, -1.000000, 0.000000, 0.262869, -0.809012, -0.525738, 0.587786, -0.809017, 0.000000,
        0.262869, -0.809012, -0.525738, 0.723607, -0.525725, -0.447220, 0.587786, -0.809017, 0.000000,
        0.951058, -0.309013, 0.000000, 0.951058, 0.309013, 0.000000, 0.894426, 0.000000, 0.447216,
        0.951058, -0.309013, 0.000000, 0.850648, 0.000000, -0.525736, 0.951058, 0.309013, 0.000000,
        0.850648, 0.000000, -0.525736, 0.723607, 0.525725, -0.447220, 0.951058, 0.309013, 0.000000,
        0.425323, 0.309011, -0.850654, 0.262869, 0.809012, -0.525738, 0.723607, 0.525725, -0.447220,
        0.425323, 0.309011, -0.850654, -0.162456, 0.499995, -0.850654, 0.262869, 0.809012, -0.525738,
        -0.162456, 0.499995, -0.850654, -0.276388, 0.850649, -0.447220, 0.262869, 0.809012, -0.525738,
        -0.162456, 0.499995, -0.850654, -0.688189, 0.499997, -0.525736, -0.276388, 0.850649, -0.447220,
        -0.162456, 0.499995, -0.850654, -0.525730, 0.000000, -0.850652, -0.688189, 0.499997, -0.525736,
        -0.525730, 0.000000, -0.850652, -0.894426, 0.000000, -0.447216, -0.688189, 0.499997, -0.525736,
        -0.525730, 0.000000, -0.850652, -0.688189, -0.499997, -0.525736, -0.894426, 0.000000, -0.447216,
        -0.525730, 0.000000, -0.850652, -0.162456, -0.499995, -0.850654, -0.688189, -0.499997, -0.525736,
        -0.162456, -0.499995, -0.850654, -0.276388, -0.850649, -0.447220, -0.688189, -0.499997, -0.525736,
        0.850648, 0.000000, -0.525736, 0.425323, 0.309011, -0.850654, 0.723607, 0.525725, -0.447220,
        0.850648, 0.000000, -0.525736, 0.425323, -0.309011, -0.850654, 0.425323, 0.309011, -0.850654,
        0.425323, -0.309011, -0.850654, 0.000000, 0.000000, -1.000000, 0.425323, 0.309011, -0.850654,
        -0.162456, -0.499995, -0.850654, 0.262869, -0.809012, -0.525738, -0.276388, -0.850649, -0.447220,
        -0.162456, -0.499995, -0.850654, 0.425323, -0.309011, -0.850654, 0.262869, -0.809012, -0.525738,
        0.425323, -0.309011, -0.850654, 0.723607, -0.525725, -0.447220, 0.262869, -0.809012, -0.525738,


        // 6.399504,6.313925,0.551519,-6.171330,6.313925,0.551519,-6.171330,-6.256909,0.551519,
        // -6.171330,-6.256909,0.551519,6.399504,-6.256909,0.551519,6.399504,6.313925,0.551519,
    ];

    const meshVerts = new Float32Array(verts);
    const vertsLenght = meshVerts.length / 3;

    console.log(vertsLenght);
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

    // animation
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