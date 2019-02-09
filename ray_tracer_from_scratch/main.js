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

// Materials
#define LAMB 0
#define METAL 1
#define DIEL 2


struct Ray {
  vec3 orig, dir;
}R_;

struct Material
{
    int type;
    vec3 albedo; 
};

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

mat4 frotate( float x, float y, float z ){
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

mat4 translate( float x, float y, float z ){
    return mat4( 1.0, 0.0, 0.0, 0.0,
                 0.0, 1.0, 0.0, 0.0,
                 0.0, 0.0, 1.0, 0.0,
                 x, y, z, 1.0 );
}


vec3 getHitPoint(Ray ray, float t) {
    return ray.orig + t * ray.dir;   
}

//intersection test with spheres
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

   triangleNormal = normalize(cross(ab,ac));
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


void Camera(out Ray ray, vec3 lookAt, vec3 up, float angle, float aspect) {

    vec3 g = normalize(lookAt - ray.orig);
    vec3 u = normalize(cross(g, up));
    vec3 v = normalize(cross(u, g));
    u = u * tan(radians(angle * .5));
    v = v * tan(radians(angle * .5)) / aspect;
    ray.dir = normalize(g + ray.dir.x * u + ray.dir.y * v);

}

//return intersection point with lightSource for the shadow ray
vec3 hitLightSource(Ray R_, Sphere sphere){
    vec3 hit = vec3(0.0,0.0,0.0);
    float mindist = -1000.;
    vec3 intersect;
    bool isHit = hitSphere(R_.orig,R_.dir,sphere.center,sphere.radius,hit);

    if(isHit && hit.z > mindist)
    {
        intersect = hit;
        
    }
  
    return intersect; 
}


//return intersection point with the mesh for the shadow ray
vec3 hitMesh(Ray R_){
    float mindist = -1000.;
    vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);
    vec3 intersect = vec3(0.0,0.0,0.0);

    for (int i = 0; i < vertsCount; i += 3) {
        a = texelFetch(uMeshData, ivec2(i, 0), 0);
        b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        vec3 triangleNormal;
        vec3 uvt;
        bool isHit = hitTriangle(R_.orig,R_.dir, a.xyz,b.xyz,c.xyz,uvt, triangleNormal);
        if (isHit) {
            intersect = R_.orig + R_.dir*uvt.z;
            float z = intersect.z;
            if (z>mindist) {
             mindist = z;
            }
        }      
    }
    return intersect;
}

//this is where if it is shadow we multiply the color with vec3(.4,.4,.4) else with vec3(1.,1.,1.,) so it does not affect the color if its not a shadow
vec3 calcShadow(Sphere lightSource, vec3 hitPos){
    vec3 color;
  
    vec3 lightDir =  normalize(lightSource.center-hitPos);
    Ray shadowRay = Ray(hitPos, lightDir);

    vec3 isHitLightDir = hitLightSource(shadowRay,lightSource);
    vec3 isHitMesh = hitMesh(shadowRay);
        
    if (isHitMesh.z > isHitLightDir.z ) {
        color = vec3(0.4,0.4,0.4);
    }else{
        color = vec3(1.,1.,1.);    
    }
    return color;
}

//function that it affects the mesh if it is hit by light we multiply with color of the Hitpoint with diffuse 
vec3 getLight(vec3 color, Sphere sphere, vec3 intersect, vec3 normal){
    vec3 lightDir =  normalize(sphere.center-intersect);
    float diffuse = clamp(dot(lightDir, normal), 0., 1.);
    return color*diffuse;
}


// we check if a ray intersected the scene, if it does we return the hitPos of the inteersection,
// the normal of that hitpoint the material and this bool isSphere if it intersectesd the floor, which is a giant sphere(in order to make it a floor)
bool hitScene(Ray R_, out vec3 hitPos, out vec3 normal, out Material material, Sphere sphere, out bool isShpere, Sphere lightSource){  // na thimithw na thesw to isShpere false stin trace synartisi
        
    vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);
    float mindist = -1000.;
    bool weHitSomething = false;
    vec3 hitPos1 = vec3(0.);
    vec3 triangleNormal = vec3(0.,0.,0.);
    vec3 sphereNormal;
    

    //here we chck all the mesh if we hit a triangle if the mesh and we keep the closest hitpoint
    for (int i = 0; i < vertsCount; i += 3) {
       
        a = texelFetch(uMeshData, ivec2(i, 0), 0);
        b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        vec3 uvt;
        bool isHit = hitTriangle(R_.orig,R_.dir, a.xyz,b.xyz,c.xyz,uvt, triangleNormal);
        if (isHit) {
            vec3 intersect = R_.orig + R_.dir*uvt.z;
            float z = intersect.z;
            if (z>mindist) {
                hitPos1 = intersect;
                
                mindist = z;
            }
        }      
    }
    

    //here we check if it intersected the floor which is a sphere and we keep the position of the hitPos
    vec3 hit = vec3(0.);
    bool isHit = hitSphere(R_.orig,R_.dir,sphere.center,sphere.radius,hit);

    if(isHit && hit.z > mindist)
    {
        mindist = hit.z;
        sphereNormal = (hit - sphere.center) / sphere.radius;
    }
    


    //here we have probably have 2 intersection points, one of a sphere, and one of a triangle
    // we keep the max of them cause the min dist is actually -1000. so we keep the closest hitpos
    
    float flag = max(hitPos1.z, hit.z);

    //based of the type of the interection(triangle or sphere) we assign to the mesh or the floor the material type, the normal and all the
    //information Trace function needs 
    //if we intersected something we set weHitSomething to true

    if ((flag == hitPos1.z) && (flag > -1000.)) {
        weHitSomething = true;
        material.type = METAL;
        material.albedo = vec3(0.9, 0.9, 0.9);
        normal = triangleNormal;
        hitPos = hitPos1;
        isShpere = false;
    }
    else if ((flag == hit.z) && (flag > -1000.)) {
        weHitSomething = true;
        material.type = LAMB;
        material.albedo = vec3(0., 0.9, 0.9);
        normal = sphereNormal;
        hitPos = hit;
        isShpere = true;
    }
    return weHitSomething;
}



//Trace is the main function of the max bounces
vec3 Trace(out Ray ray, Sphere floor, Sphere lightSource){

    vec3 hitPos, normal;
    bool isShpere;
    Material material;
    vec3 color = vec3(0.);
    vec3 attenuation = vec3(1.);
    vec3 light, shadow;

    //this if for every ray to bounce 4 times.(hopefully)
    for(int i=0; i< MAX_BOUNCES; i++){
        
        // we check if we hit something
        if(hitScene(ray, hitPos, normal, material, floor, isShpere, lightSource)){

            //we check the material type(if it is metal it is refering to the mesh)
            if (material.type == METAL) {
               
               //we calculate the new direction

                vec3 direction = reflect(ray.dir, normal);

                //here we check if the new direction and the hitPos normal is >0 then i do all the calculations 
                //and we start the new ray from the hitPos to the reflected direction

                // I suspect there is something wrong with the shadow calculations 
                if (dot(direction,normal) > 0.) {
                    ray = Ray(hitPos, direction); 
                    light = getLight(color, lightSource,hitPos, normal);
                    shadow = calcShadow(lightSource, hitPos);
                    color *= material.albedo * attenuation * light *shadow;
                    attenuation *= material.albedo;
                }
                
                else{
                    color = hitPos;
                }
            }

             if (material.type == LAMB) {
                vec3 direction = reflect(ray.dir, normal);
                if (dot(direction,normal) > 0.) {
                    ray = Ray(hitPos, direction);
                    light = getLight(color, lightSource,hitPos, normal);
                    shadow = calcShadow(lightSource, hitPos);
                    color *= material.albedo * attenuation*light*shadow;
                    attenuation *= material.albedo;
                }else{
                   color = hitPos;
                }
            }
        }

        else{
            color = attenuation;
        }
    }

    return color;
}


void main() {
    
    //initialize lightSource, floor, Ray, camera
    Sphere lightSource = Sphere(vec3(1.,3.,1.), 0.18);
    Sphere floor  = Sphere(vec3(0., -1e3, 0.), 1e3);
    R_ = Ray(vec3(0.0, 1.0, 6.0), vec3(vuv, -1.));
    Camera(R_, vec3(0., 0., 1.), vec3(0., 1., 0.), 90.0, (Res.x / Res.y));

    // rotation
    R_.dir = mat3(uRot) * R_.dir;
    R_.orig = mat3(uRot) * R_.orig;

    //color coming from the trace function
    vec3 color = Trace(R_, floor, lightSource);

    fragColor.rgb = color;
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
    const verts = [
        // cube
        0.500000, -0.000000, 1.500000, 0.500000, 2.000000, 1.500000, 0.500000, 2.000000, 0.500000, 
        0.500000, 2.000000, 0.500000, 0.500000, -0.000000, 0.500000, 0.500000, -0.000000, 1.500000, 
        0.500000, -0.000000, 0.500000, 0.500000, 2.000000, 0.500000, 1.500000, 2.000000, 0.500000, 
        1.500000, 2.000000, 0.500000, 1.500000, 0.000000, 0.500000, 0.500000, -0.000000, 0.500000, 
        1.500000, 0.000000, 0.500000, 1.500000, 2.000000, 0.500000, 1.500000, 2.000000, 1.500000, 
        1.500000, 2.000000, 1.500000, 1.500000, 0.000000, 1.500000, 1.500000, 0.000000, 0.500000, 
        0.500000, 2.000000, 1.500000, 0.500000, -0.000000, 1.500000, 1.500000, 0.000000, 1.500000, 
        1.500000, 0.000000, 1.500000, 1.500000, 2.000000, 1.500000, 0.500000, 2.000000, 1.500000, 
        1.500000, 0.000000, 1.500000, 0.500000, -0.000000, 1.500000, 0.500000, -0.000000, 0.500000, 
        0.500000, -0.000000, 0.500000, 1.500000, 0.000000, 0.500000, 1.500000, 0.000000, 1.500000, 
        1.500000, 2.000000, 0.500000, 0.500000, 2.000000, 0.500000, 0.500000, 2.000000, 1.500000, 
        0.500000, 2.000000, 1.500000, 1.500000, 2.000000, 1.500000, 1.500000, 2.000000, 0.500000, 

        //plane
        // -6.600000, -0.000001, 6.599999,  6.599999, 0.000000, 6.600000, 6.600000, 0.000001, -6.599999, 
        // 6.600000, 0.000001, -6.599999, -6.599999, -0.000000, -6.600000,  -6.600000, -0.000001, 6.599999, 

        //icosphere1
        1.500000, 0.000000, -0.500000, 1.925323, 0.149346, -0.190989, 1.337544, 0.149346, -0.000005, 
        2.223607, 0.552781, 0.025725, 1.925323, 0.149346, -0.190989, 2.350648, 0.474264, -0.500000, 
        1.500000, 0.000000, -0.500000, 1.337544, 0.149346, -0.000005, 0.974270, 0.149348, -0.500000, 
        1.500000, 0.000000, -0.500000, 0.974270, 0.149348, -0.500000, 1.337545, 0.149346, -0.999995, 
        1.500000, 0.000000, -0.500000, 1.337545, 0.149346, -0.999995, 1.925323, 0.149346, -0.809011, 
        2.223607, 0.552781, 0.025725, 2.350648, 0.474264, -0.500000, 2.451058, 1.000000, -0.190987, 
        1.223612, 0.552780, 0.350649, 1.762869, 0.474262, 0.309012, 1.500000, 1.000000, 0.500000, 
        0.605574, 0.552784, -0.500000, 0.811811, 0.474264, -0.000003, 0.548942, 1.000000, -0.190987, 
        1.223612, 0.552780, -1.350649, 0.811811, 0.474264, -0.999997, 0.912214, 1.000000, -1.309017, 
        2.223607, 0.552781, -1.025725, 1.762869, 0.474262, -1.309012, 2.087786, 1.000000, -1.309017, 
        2.223607, 0.552781, 0.025725, 2.451058, 1.000000, -0.190987, 2.087785, 1.000000, 0.309017, 
        1.223612, 0.552780, 0.350649, 1.500000, 1.000000, 0.500000, 0.912214, 1.000000, 0.309017, 
        0.605574, 0.552784, -0.500000, 0.548942, 1.000000, -0.190987, 0.548942, 1.000000, -0.809013, 
        1.223612, 0.552780, -1.350649, 0.912214, 1.000000, -1.309017, 1.500000, 1.000000, -1.500000, 
        2.223607, 0.552781, -1.025725, 2.087786, 1.000000, -1.309017, 2.451058, 1.000000, -0.809013, 
        1.776388, 1.447220, 0.350649, 2.188189, 1.525736, -0.000003, 1.662455, 1.850654, -0.000005, 
        0.776393, 1.447219, 0.025725, 1.237131, 1.525738, 0.309012, 1.074677, 1.850654, -0.190989, 
        0.776393, 1.447219, -1.025725, 0.649352, 1.525736, -0.500000, 1.074677, 1.850654, -0.809011, 
        1.776388, 1.447220, -1.350649, 1.237131, 1.525738, -1.309012, 1.662456, 1.850654, -0.999995, 
        2.394426, 1.447216, -0.500000, 2.188189, 1.525736, -0.999997, 2.025730, 1.850652, -0.500000, 
        2.025730, 1.850652, -0.500000, 1.662456, 1.850654, -0.999995, 1.500000, 2.000000, -0.500000, 
        2.025730, 1.850652, -0.500000, 2.188189, 1.525736, -0.999997, 1.662456, 1.850654, -0.999995, 
        2.188189, 1.525736, -0.999997, 1.776388, 1.447220, -1.350649, 1.662456, 1.850654, -0.999995, 
        1.662456, 1.850654, -0.999995, 1.074677, 1.850654, -0.809011, 1.500000, 2.000000, -0.500000, 
        1.662456, 1.850654, -0.999995, 1.237131, 1.525738, -1.309012, 1.074677, 1.850654, -0.809011, 
        1.237131, 1.525738, -1.309012, 0.776393, 1.447219, -1.025725, 1.074677, 1.850654, -0.809011, 
        1.074677, 1.850654, -0.809011, 1.074677, 1.850654, -0.190989, 1.500000, 2.000000, -0.500000, 
        1.074677, 1.850654, -0.809011, 0.649352, 1.525736, -0.500000, 1.074677, 1.850654, -0.190989, 
        0.649352, 1.525736, -0.500000, 0.776393, 1.447219, 0.025725, 1.074677, 1.850654, -0.190989, 
        1.074677, 1.850654, -0.190989, 1.662455, 1.850654, -0.000005, 1.500000, 2.000000, -0.500000, 
        1.074677, 1.850654, -0.190989, 1.237131, 1.525738, 0.309012, 1.662455, 1.850654, -0.000005, 
        1.237131, 1.525738, 0.309012, 1.776388, 1.447220, 0.350649, 1.662455, 1.850654, -0.000005, 
        1.662455, 1.850654, -0.000005, 2.025730, 1.850652, -0.500000, 1.500000, 2.000000, -0.500000, 
        1.662455, 1.850654, -0.000005, 2.188189, 1.525736, -0.000003, 2.025730, 1.850652, -0.500000, 
        2.188189, 1.525736, -0.000003, 2.394426, 1.447216, -0.500000, 2.025730, 1.850652, -0.500000, 
        2.451058, 1.000000, -0.809013, 2.188189, 1.525736, -0.999997, 2.394426, 1.447216, -0.500000, 
        2.451058, 1.000000, -0.809013, 2.087786, 1.000000, -1.309017, 2.188189, 1.525736, -0.999997, 
        2.087786, 1.000000, -1.309017, 1.776388, 1.447220, -1.350649, 2.188189, 1.525736, -0.999997, 
        1.500000, 1.000000, -1.500000, 1.237131, 1.525738, -1.309012, 1.776388, 1.447220, -1.350649, 
        1.500000, 1.000000, -1.500000, 0.912214, 1.000000, -1.309017, 1.237131, 1.525738, -1.309012, 
        0.912214, 1.000000, -1.309017, 0.776393, 1.447219, -1.025725, 1.237131, 1.525738, -1.309012, 
        0.548942, 1.000000, -0.809013, 0.649352, 1.525736, -0.500000, 0.776393, 1.447219, -1.025725, 
        0.548942, 1.000000, -0.809013, 0.548942, 1.000000, -0.190987, 0.649352, 1.525736, -0.500000, 
        0.548942, 1.000000, -0.190987, 0.776393, 1.447219, 0.025725, 0.649352, 1.525736, -0.500000, 
        0.912214, 1.000000, 0.309017, 1.237131, 1.525738, 0.309012, 0.776393, 1.447219, 0.025725, 
        0.912214, 1.000000, 0.309017, 1.500000, 1.000000, 0.500000, 1.237131, 1.525738, 0.309012, 
        1.500000, 1.000000, 0.500000, 1.776388, 1.447220, 0.350649, 1.237131, 1.525738, 0.309012, 
        2.087785, 1.000000, 0.309017, 2.188189, 1.525736, -0.000003, 1.776388, 1.447220, 0.350649, 
        2.087785, 1.000000, 0.309017, 2.451058, 1.000000, -0.190987, 2.188189, 1.525736, -0.000003, 
        2.451058, 1.000000, -0.190987, 2.394426, 1.447216, -0.500000, 2.188189, 1.525736, -0.000003, 
        2.087786, 1.000000, -1.309017, 1.500000, 1.000000, -1.500000, 1.776388, 1.447220, -1.350649, 
        2.087786, 1.000000, -1.309017, 1.762869, 0.474262, -1.309012, 1.500000, 1.000000, -1.500000, 
        1.762869, 0.474262, -1.309012, 1.223612, 0.552780, -1.350649, 1.500000, 1.000000, -1.500000, 
        0.912214, 1.000000, -1.309017, 0.548942, 1.000000, -0.809013, 0.776393, 1.447219, -1.025725, 
        0.912214, 1.000000, -1.309017, 0.811811, 0.474264, -0.999997, 0.548942, 1.000000, -0.809013, 
        0.811811, 0.474264, -0.999997, 0.605574, 0.552784, -0.500000, 0.548942, 1.000000, -0.809013, 
        0.548942, 1.000000, -0.190987, 0.912214, 1.000000, 0.309017, 0.776393, 1.447219, 0.025725, 
        0.548942, 1.000000, -0.190987, 0.811811, 0.474264, -0.000003, 0.912214, 1.000000, 0.309017, 
        0.811811, 0.474264, -0.000003, 1.223612, 0.552780, 0.350649, 0.912214, 1.000000, 0.309017, 
        1.500000, 1.000000, 0.500000, 2.087785, 1.000000, 0.309017, 1.776388, 1.447220, 0.350649, 
        1.500000, 1.000000, 0.500000, 1.762869, 0.474262, 0.309012, 2.087785, 1.000000, 0.309017, 
        1.762869, 0.474262, 0.309012, 2.223607, 0.552781, 0.025725, 2.087785, 1.000000, 0.309017, 
        2.451058, 1.000000, -0.190987, 2.451058, 1.000000, -0.809013, 2.394426, 1.447216, -0.500000, 
        2.451058, 1.000000, -0.190987, 2.350648, 0.474264, -0.500000, 2.451058, 1.000000, -0.809013, 
        2.350648, 0.474264, -0.500000, 2.223607, 0.552781, -1.025725, 2.451058, 1.000000, -0.809013, 
        1.925323, 0.149346, -0.809011, 1.762869, 0.474262, -1.309012, 2.223607, 0.552781, -1.025725, 
        1.925323, 0.149346, -0.809011, 1.337545, 0.149346, -0.999995, 1.762869, 0.474262, -1.309012, 
        1.337545, 0.149346, -0.999995, 1.223612, 0.552780, -1.350649, 1.762869, 0.474262, -1.309012, 
        1.337545, 0.149346, -0.999995, 0.811811, 0.474264, -0.999997, 1.223612, 0.552780, -1.350649, 
        1.337545, 0.149346, -0.999995, 0.974270, 0.149348, -0.500000, 0.811811, 0.474264, -0.999997, 
        0.974270, 0.149348, -0.500000, 0.605574, 0.552784, -0.500000, 0.811811, 0.474264, -0.999997, 
        0.974270, 0.149348, -0.500000, 0.811811, 0.474264, -0.000003, 0.605574, 0.552784, -0.500000, 
        0.974270, 0.149348, -0.500000, 1.337544, 0.149346, -0.000005, 0.811811, 0.474264, -0.000003, 
        1.337544, 0.149346, -0.000005, 1.223612, 0.552780, 0.350649, 0.811811, 0.474264, -0.000003, 
        2.350648, 0.474264, -0.500000, 1.925323, 0.149346, -0.809011, 2.223607, 0.552781, -1.025725, 
        2.350648, 0.474264, -0.500000, 1.925323, 0.149346, -0.190989, 1.925323, 0.149346, -0.809011, 
        1.925323, 0.149346, -0.190989, 1.500000, 0.000000, -0.500000, 1.925323, 0.149346, -0.809011, 
        1.337544, 0.149346, -0.000005, 1.762869, 0.474262, 0.309012, 1.223612, 0.552780, 0.350649, 
        1.337544, 0.149346, -0.000005, 1.925323, 0.149346, -0.190989, 1.762869, 0.474262, 0.309012, 
        1.925323, 0.149346, -0.190989, 2.223607, 0.552781, 0.025725, 1.762869, 0.474262, 0.309012, 

        //icoaphere 2
        -1.000000, 0.000000, 0.500000, -0.574677, 0.149346, 0.809011, -1.162456, 0.149346, 0.999995, 
        -0.276393, 0.552781, 1.025725, -0.574677, 0.149346, 0.809011, -0.149352, 0.474264, 0.500000, 
        -1.000000, 0.000000, 0.500000, -1.162456, 0.149346, 0.999995, -1.525730, 0.149348, 0.500000, 
        -1.000000, 0.000000, 0.500000, -1.525730, 0.149348, 0.500000, -1.162455, 0.149346, 0.000005, 
        -1.000000, 0.000000, 0.500000, -1.162455, 0.149346, 0.000005, -0.574677, 0.149346, 0.190989, 
        -0.276393, 0.552781, 1.025725, -0.149352, 0.474264, 0.500000, -0.048942, 1.000000, 0.809013, 
        -1.276388, 0.552780, 1.350649, -0.737131, 0.474262, 1.309012, -1.000000, 1.000000, 1.500000, 
        -1.894426, 0.552784, 0.500000, -1.688189, 0.474264, 0.999997, -1.951058, 1.000000, 0.809013, 
        -1.276388, 0.552780, -0.350649, -1.688189, 0.474264, 0.000003, -1.587785, 1.000000, -0.309017, 
        -0.276393, 0.552781, -0.025725, -0.737131, 0.474262, -0.309012, -0.412214, 1.000000, -0.309017, 
        -0.276393, 0.552781, 1.025725, -0.048942, 1.000000, 0.809013, -0.412214, 1.000000, 1.309017, 
        -1.276388, 0.552780, 1.350649, -1.000000, 1.000000, 1.500000, -1.587786, 1.000000, 1.309017, 
        -1.894426, 0.552784, 0.500000, -1.951058, 1.000000, 0.809013, -1.951058, 1.000000, 0.190987, 
        -1.276388, 0.552780, -0.350649, -1.587785, 1.000000, -0.309017, -1.000000, 1.000000, -0.500000, 
        -0.276393, 0.552781, -0.025725, -0.412214, 1.000000, -0.309017, -0.048942, 1.000000, 0.190987, 
        -0.723612, 1.447220, 1.350649, -0.311811, 1.525736, 0.999997, -0.837545, 1.850654, 0.999995, 
        -1.723607, 1.447219, 1.025725, -1.262869, 1.525738, 1.309012, -1.425323, 1.850654, 0.809011, 
        -1.723607, 1.447219, -0.025725, -1.850648, 1.525736, 0.500000, -1.425323, 1.850654, 0.190989, 
        -0.723612, 1.447220, -0.350649, -1.262869, 1.525738, -0.309012, -0.837545, 1.850654, 0.000005, 
        -0.105574, 1.447216, 0.500000, -0.311811, 1.525736, 0.000003, -0.474270, 1.850652, 0.500000, 
        -0.474270, 1.850652, 0.500000, -0.837545, 1.850654, 0.000005, -1.000000, 2.000000, 0.500000, 
        -0.474270, 1.850652, 0.500000, -0.311811, 1.525736, 0.000003, -0.837545, 1.850654, 0.000005, 
        -0.311811, 1.525736, 0.000003, -0.723612, 1.447220, -0.350649, -0.837545, 1.850654, 0.000005, 
        -0.837545, 1.850654, 0.000005, -1.425323, 1.850654, 0.190989, -1.000000, 2.000000, 0.500000, 
        -0.837545, 1.850654, 0.000005, -1.262869, 1.525738, -0.309012, -1.425323, 1.850654, 0.190989, 
        -1.262869, 1.525738, -0.309012, -1.723607, 1.447219, -0.025725, -1.425323, 1.850654, 0.190989, 
        -1.425323, 1.850654, 0.190989, -1.425323, 1.850654, 0.809011, -1.000000, 2.000000, 0.500000, 
        -1.425323, 1.850654, 0.190989, -1.850648, 1.525736, 0.500000, -1.425323, 1.850654, 0.809011, 
        -1.850648, 1.525736, 0.500000, -1.723607, 1.447219, 1.025725, -1.425323, 1.850654, 0.809011, 
        -1.425323, 1.850654, 0.809011, -0.837545, 1.850654, 0.999995, -1.000000, 2.000000, 0.500000, 
        -1.425323, 1.850654, 0.809011, -1.262869, 1.525738, 1.309012, -0.837545, 1.850654, 0.999995, 
        -1.262869, 1.525738, 1.309012, -0.723612, 1.447220, 1.350649, -0.837545, 1.850654, 0.999995, 
        -0.837545, 1.850654, 0.999995, -0.474270, 1.850652, 0.500000, -1.000000, 2.000000, 0.500000, 
        -0.837545, 1.850654, 0.999995, -0.311811, 1.525736, 0.999997, -0.474270, 1.850652, 0.500000, 
        -0.311811, 1.525736, 0.999997, -0.105574, 1.447216, 0.500000, -0.474270, 1.850652, 0.500000, 
        -0.048942, 1.000000, 0.190987, -0.311811, 1.525736, 0.000003, -0.105574, 1.447216, 0.500000, 
        -0.048942, 1.000000, 0.190987, -0.412214, 1.000000, -0.309017, -0.311811, 1.525736, 0.000003, 
        -0.412214, 1.000000, -0.309017, -0.723612, 1.447220, -0.350649, -0.311811, 1.525736, 0.000003, 
        -1.000000, 1.000000, -0.500000, -1.262869, 1.525738, -0.309012, -0.723612, 1.447220, -0.350649, 
        -1.000000, 1.000000, -0.500000, -1.587785, 1.000000, -0.309017, -1.262869, 1.525738, -0.309012, 
        -1.587785, 1.000000, -0.309017, -1.723607, 1.447219, -0.025725, -1.262869, 1.525738, -0.309012, 
        -1.951058, 1.000000, 0.190987, -1.850648, 1.525736, 0.500000, -1.723607, 1.447219, -0.025725, 
        -1.951058, 1.000000, 0.190987, -1.951058, 1.000000, 0.809013, -1.850648, 1.525736, 0.500000, 
        -1.951058, 1.000000, 0.809013, -1.723607, 1.447219, 1.025725, -1.850648, 1.525736, 0.500000, 
        -1.587786, 1.000000, 1.309017, -1.262869, 1.525738, 1.309012, -1.723607, 1.447219, 1.025725, 
        -1.587786, 1.000000, 1.309017, -1.000000, 1.000000, 1.500000, -1.262869, 1.525738, 1.309012, 
        -1.000000, 1.000000, 1.500000, -0.723612, 1.447220, 1.350649, -1.262869, 1.525738, 1.309012, 
        -0.412214, 1.000000, 1.309017, -0.311811, 1.525736, 0.999997, -0.723612, 1.447220, 1.350649, 
        -0.412214, 1.000000, 1.309017, -0.048942, 1.000000, 0.809013, -0.311811, 1.525736, 0.999997, 
        -0.048942, 1.000000, 0.809013, -0.105574, 1.447216, 0.500000, -0.311811, 1.525736, 0.999997, 
        -0.412214, 1.000000, -0.309017, -1.000000, 1.000000, -0.500000, -0.723612, 1.447220, -0.350649, 
        -0.412214, 1.000000, -0.309017, -0.737131, 0.474262, -0.309012, -1.000000, 1.000000, -0.500000, 
        -0.737131, 0.474262, -0.309012, -1.276388, 0.552780, -0.350649, -1.000000, 1.000000, -0.500000, 
        -1.587785, 1.000000, -0.309017, -1.951058, 1.000000, 0.190987, -1.723607, 1.447219, -0.025725, 
        -1.587785, 1.000000, -0.309017, -1.688189, 0.474264, 0.000003, -1.951058, 1.000000, 0.190987, 
        -1.688189, 0.474264, 0.000003, -1.894426, 0.552784, 0.500000, -1.951058, 1.000000, 0.190987, 
        -1.951058, 1.000000, 0.809013, -1.587786, 1.000000, 1.309017, -1.723607, 1.447219, 1.025725, 
        -1.951058, 1.000000, 0.809013, -1.688189, 0.474264, 0.999997, -1.587786, 1.000000, 1.309017, 
        -1.688189, 0.474264, 0.999997, -1.276388, 0.552780, 1.350649, -1.587786, 1.000000, 1.309017, 
        -1.000000, 1.000000, 1.500000, -0.412214, 1.000000, 1.309017, -0.723612, 1.447220, 1.350649, 
        -1.000000, 1.000000, 1.500000, -0.737131, 0.474262, 1.309012, -0.412214, 1.000000, 1.309017, 
        -0.737131, 0.474262, 1.309012, -0.276393, 0.552781, 1.025725, -0.412214, 1.000000, 1.309017, 
        -0.048942, 1.000000, 0.809013, -0.048942, 1.000000, 0.190987, -0.105574, 1.447216, 0.500000, 
        -0.048942, 1.000000, 0.809013, -0.149352, 0.474264, 0.500000, -0.048942, 1.000000, 0.190987, 
        -0.149352, 0.474264, 0.500000, -0.276393, 0.552781, -0.025725, -0.048942, 1.000000, 0.190987, 
        -0.574677, 0.149346, 0.190989, -0.737131, 0.474262, -0.309012, -0.276393, 0.552781, -0.025725, 
        -0.574677, 0.149346, 0.190989, -1.162455, 0.149346, 0.000005, -0.737131, 0.474262, -0.309012, 
        -1.162455, 0.149346, 0.000005, -1.276388, 0.552780, -0.350649, -0.737131, 0.474262, -0.309012, 
        -1.162455, 0.149346, 0.000005, -1.688189, 0.474264, 0.000003, -1.276388, 0.552780, -0.350649, 
        -1.162455, 0.149346, 0.000005, -1.525730, 0.149348, 0.500000, -1.688189, 0.474264, 0.000003, 
        -1.525730, 0.149348, 0.500000, -1.894426, 0.552784, 0.500000, -1.688189, 0.474264, 0.000003, 
        -1.525730, 0.149348, 0.500000, -1.688189, 0.474264, 0.999997, -1.894426, 0.552784, 0.500000, 
        -1.525730, 0.149348, 0.500000, -1.162456, 0.149346, 0.999995, -1.688189, 0.474264, 0.999997, 
        -1.162456, 0.149346, 0.999995, -1.276388, 0.552780, 1.350649, -1.688189, 0.474264, 0.999997, 
        -0.149352, 0.474264, 0.500000, -0.574677, 0.149346, 0.190989, -0.276393, 0.552781, -0.025725, 
        -0.149352, 0.474264, 0.500000, -0.574677, 0.149346, 0.809011, -0.574677, 0.149346, 0.190989, 
        -0.574677, 0.149346, 0.809011, -1.000000, 0.000000, 0.500000, -0.574677, 0.149346, 0.190989, 
        -1.162456, 0.149346, 0.999995, -0.737131, 0.474262, 1.309012, -1.276388, 0.552780, 1.350649, 
        -1.162456, 0.149346, 0.999995, -0.574677, 0.149346, 0.809011, -0.737131, 0.474262, 1.309012, 
        -0.574677, 0.149346, 0.809011, -0.276393, 0.552781, 1.025725, -0.737131, 0.474262, 1.309012, 
    ];

    //remember from blender rotate 180 degrees in y, 180 degrees in z and 90degrees in x axis before exporting
   

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