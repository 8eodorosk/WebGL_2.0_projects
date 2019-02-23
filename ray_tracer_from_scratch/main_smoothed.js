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
uniform sampler2D uNormData;
uniform int vertsCount;
uniform mat4 uRot;
layout(location = 0) out lowp vec4 fragColor;

#define MAX_BOUNCES 4
#define rmat(a, b) mat3(1, 0, 0, 0, cos(b), -sin(b), 0, sin(b), cos(b)) * mat3(cos(a), 0, sin(a), 0, 1, 0, -sin(a), 0, cos(a))

// Materials
#define LAMB 0
#define METAL 1
#define DIEL 2
#define SCAT 3
#define PI2 6.28318530717


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

//intersection test with spheres
bool hitSphere(vec3 orig,vec3 dir,vec3 center,float r,out vec3 intersect, out float t){
    vec3 oc = orig - center;
    float b = dot(oc,dir);
    float c = dot(oc,oc) - r * r;
    if(c>0.0 && b > 0.0) return false;
    float discriminant = b*b -c;
    if(discriminant < 0.0) return false;
    t= -b-sqrt(discriminant);
    if(t<0.0) return false;
    intersect = orig + t*dir;
    return true;  
}


bool hitTriangleSecond( vec3 orig, vec3 dir, vec3 a, vec3 b, vec3 c,
                        out vec3 uvt, out vec3 N, out vec3 x, out float dist) {

    float eps=1e-8;

    vec3 ab = b - a;
    vec3 ac = c - a;


    N = normalize(cross(ab, ac));
    //N = normalize(N);

    dist = dot(a - orig, N) / dot(dir, N);
    x    = orig + dir * dist;

    vec3 ax = x - a;

    float d00 = dot(ab, ab);
    float d01 = dot(ab, ac);
    float d11 = dot(ac, ac);
    float d20 = dot(ax, ab);
    float d21 = dot(ax, ac);

    float denom = d00 * d11 - d01 * d01; // determinant

    // if the determinant is negative the triangle is backfacing
    // if the determinant is close to 0, the ray misses the triangl
    if ( denom <= eps )
        return false;

    uvt.y = (d11 * d20 - d01 * d21) / denom;
    if ( uvt.y < 0.0 || uvt.y > 1.0 )
        return false;

    uvt.z = (d00 * d21 - d01 * d20) / denom;
    if ( uvt.z < 0.0 || uvt.z > 1.0 )
        return false;

    uvt.x = 1.0 - uvt.y - uvt.z;
    if ( uvt.x < 0.0 || uvt.x > 1.0 )
        return false;
    
   // N = N*uvt;
    return true;
}




void Camera(out Ray ray, vec3 lookAt, vec3 up, float angle, float aspect) {

    vec3 g = normalize(lookAt - ray.orig);  // Camera Forward vector
    vec3 u = normalize(cross(g, up));       // Camera Right vector
    vec3 v = normalize(cross(u, g));        // camera Up vector 
    u = u * tan(radians(angle * .5));
    v = v * tan(radians(angle * .5)) / aspect;
    ray.dir = normalize(g + ray.dir.x * u + ray.dir.y * v);

}

//return intersection point with lightSource for the shadow ray
float hitLightSource(Ray R_, Sphere sphere){
    vec3 hit = vec3(0.0,0.0,0.0);
    float mindist = 1000.;
    vec3 intersect;
    float z;
    bool isHit = hitSphere(R_.orig,R_.dir,sphere.center,sphere.radius,hit, z);

    if (isHit) {
        if (z<mindist && z > 0.001)  mindist = z;
    } 
    return mindist; 
}


//return intersection point with the mesh for the shadow ray
float hitMesh(Ray R_){
    float mindist = 1000.;
    vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);
    vec3 intersect = vec3(0.0,0.0,0.0);

    for (int i = 0; i < vertsCount; i += 3) {
        a = texelFetch(uMeshData, ivec2(i, 0), 0);
        b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        vec3 triangleNormal;
        vec3 uvt;
        float z;

        bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);;
        if (isHit) {
            if (z<mindist && z > 0.001)  mindist = z;
        } 

    }
    return mindist;
}

//this is where if it is shadow we multiply the color with vec3(.4,.4,.4) else with vec3(1.,1.,1.,) so it does not affect the color if its not a shadow
vec3 calcShadow(Sphere lightSource, vec3 hitPos){
    vec3 color;
  
    vec3 lightDir =  normalize(lightSource.center-hitPos);
    Ray shadowRay = Ray(hitPos, lightDir);

    float isHitLight = hitLightSource(shadowRay,lightSource);
    float isHitMesh = hitMesh(shadowRay);
        
    if (isHitMesh < isHitLight) {
        color = vec3(0.5,0.5,0.5);
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
bool hitScene(Ray R_, out vec3 hitPos, out vec3 normal, out Material material, Sphere lightSource){  // na thimithw na thesw to isShpere false stin trace synartisi
        
    vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0), aN = vec4(0.0),bN= vec4(0.0),cN= vec4(0.0);
    float mindist = 1000.;
    bool weHitSomething = false;
    vec3 hitPos1 = vec3(0.),triangleNormal = vec3(0.,0.,0.), sphereNormal, barycentricCoord;
    
    
    int alg = 2;

    
    if (alg == 2) {

        //here we chck all the mesh if we hit a triangle if the mesh and we keep the closest hitpoint
       // for (int i = 0; i < 6; i += 3) {
           
       //     a = texelFetch(uMeshData, ivec2(i, 0), 0);
       //     b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
       //     c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));



        //    vec3 uvt;
        //    vec3 intersect;
        //    float z;
        //    bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);;
        //    if (isHit) {

        //        if (z<mindist && z > 0.001) {
        //            hitPos1 = intersect;
                    
        //            mindist = z;
        //            weHitSomething = true;
        //            material.type = METAL;
        //            material.albedo = vec3(.7, .7, .7);
        //            normal = triangleNormal;
        //            hitPos = hitPos1;
        //        }
        //    }      
        //}
        for (int i = 0; i < vertsCount; i += 3) {
           
            a = texelFetch(uMeshData, ivec2(i, 0), 0);
            b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
            c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

            aN = texelFetch(uNormData, ivec2(i, 0), 0);
            bN = texelFetchOffset(uNormData, ivec2(i, 0), 0, ivec2(1, 0));
            cN = texelFetchOffset(uNormData, ivec2(i, 0), 0, ivec2(2, 0));

            //triangleNormal = normalize(normalize(aN.xyz) + normalize(bN.xyz) + normalize(cN.xyz));

            vec3 uvt;
            vec3 intersect;
            float z;
            bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);;
            if (isHit) {

                if (z<mindist && z > 0.001) {
                    hitPos1 = intersect;
                    
                    mindist = z;
                    weHitSomething = true;
                    material.type = DIEL;
                    material.albedo = vec3(.8, .3, .4);
                    normal = aN.xyz*uvt.x + bN.xyz*uvt.y + cN.xyz*uvt.z;

                    //normal = triangleNormal;
                    hitPos = hitPos1;            
                }
            }      
        } 

        //for (int i = 42; i < vertsCount; i += 3) {
           
        //    a = texelFetch(uMeshData, ivec2(i, 0), 0);
        //    b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        //    c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        //    vec3 uvt;
        //    vec3 intersect;
        //    float z;
        //    bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);;
        //    if (isHit) {

        //      if (z<mindist && z > 0.001) {
        //          hitPos1 = intersect;
                    
        //          mindist = z;
        //          weHitSomething = true;
        //          material.type = SCAT;
        //          material.albedo = vec3(0.9, 0.9, 0.3);
        //          normal = triangleNormal;
        //          hitPos = hitPos1;            
        //      }
        //  }      
        //}   

    }
    
   return weHitSomething;
}

//Trace is the main function of the max bounces
vec3 Trace(out Ray ray, Sphere lightSource){

    vec3 hitPos, normal;
    bool isShpere;
    Material material;
    vec3 color = vec3(1.);
    vec3 attenuation = vec3(1.);
    vec3 light = vec3(1.,1.,1.), shadow = vec3(1.,1.,1.);

    //this if for every ray to bounce 4 times.(hopefully)
    for(int i=0; i< 3; i++){
        
        // we check if we hit something
        if(hitScene(ray, hitPos, normal, material, lightSource)){
            if (material.type == METAL) {
                //we calculate the new direction
                vec3 direction = normalize(reflect(ray.dir, normal));

                //if (dot(direction,normal) > 0.) {
                    ray = Ray(hitPos, direction); 
                    light = getLight(color, lightSource,hitPos, normal);
                    shadow = calcShadow(lightSource, hitPos);
                    color *= material.albedo * light*shadow;
                    attenuation *= material.albedo;   
                    //color = normal *light; 
                    
               // }
                
               // else{

                  //  color = hitPos;
               //}
            }
            if (material.type == DIEL) {
                //we calculate the new direction
                vec3 direction = normalize(reflect(ray.dir, normal));
                //vec3 direction = normal + randomUnitVector();


                //if (dot(direction,normal) > 0.) {
                    ray = Ray(hitPos, direction); 
                    light = getLight(color, lightSource,hitPos, normal);
                    shadow = calcShadow(lightSource, hitPos);
                    color *= material.albedo * light*shadow;
                    attenuation *= material.albedo;   
                    //color = normal *light; 
                    
                //}
                
               // else{

                  //  color = hitPos;
               //}
            }
        } else {
            //color = attenuation * vec3(.2,.2, .2);
        }
       
    }

    return color;
}


void main() {
    //initialize lightSource Ray, camera
    Sphere lightSource = Sphere(vec3(-1.,2.,3.), 0.18);
    R_ = Ray(vec3(0.0, 3.0, 6.0001), vec3(vuv, -1.));
    // void Camera(out Ray ray, vec3 lookAt, vec3 up, float angle, float aspect) 
    Camera(R_, vec3(0., 1., 0.), vec3(0., 1., 0.), 90.0, (Res.x / Res.y));

    // rotation
    R_.dir = mat3(uRot) * R_.dir;
    R_.orig = mat3(uRot) * R_.orig;

    //color coming from the trace function
    vec3 color = Trace(R_, lightSource);

    fragColor.rgb = color;
    fragColor.a = 1.0;
}`;

    const canvas = document.getElementById('c');
    const gl = canvas.getContext('webgl2');
    

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
    const uNormData = gl.getUniformLocation(P, 'uNormData');
    const mouse_loc = gl.getUniformLocation(P, 'mouse');
    const uLocRot = gl.getUniformLocation(P, "uRot");


    // free resources
    gl.detachShader(P, Fp);
    gl.detachShader(P, Vp);
    gl.deleteProgram(P);

    // fullscreen quad
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Int8Array([-3, 1, 1, -3, 1, 1 /*, -4, 2, -4, -4, 2, -4*/ ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.BYTE, !1, 0, 0);
    gl.bindVertexArray(null);

    // bind texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    

    // blender 2.79 Icosphere
    // export -> *.raw (needs to be enable first under settings)

 
    //cube
    const verts = [
     0.000000,0.500000,0.000000,
        0.425323,0.649346,0.309011,
        -0.162456,0.649346,0.499995,
        0.723607,1.052781,0.525725,
        0.425323,0.649346,0.309011,
        0.850648,0.974264,0.000000,
        0.000000,0.500000,0.000000,
        -0.162456,0.649346,0.499995,
        -0.525730,0.649348,0.000000,
        0.000000,0.500000,0.000000,
        -0.525730,0.649348,0.000000,
        -0.162456,0.649346,-0.499995,
        0.000000,0.500000,0.000000,
        -0.162456,0.649346,-0.499995,
        0.425323,0.649346,-0.309011,
        0.723607,1.052781,0.525725,
        0.850648,0.974264,0.000000,
        0.951058,1.500000,0.309013,
        -0.276388,1.052780,0.850649,
        0.262869,0.974262,0.809012,
        0.000000,1.500000,1.000000,
        -0.894426,1.052784,0.000000,
        -0.688189,0.974264,0.499997,
        -0.951058,1.500000,0.309013,
        -0.276388,1.052780,-0.850649,
        -0.688189,0.974264,-0.499997,
        -0.587786,1.500000,-0.809017,
        0.723607,1.052781,-0.525725,
        0.262869,0.974262,-0.809012,
        0.587786,1.500000,-0.809017,
        0.723607,1.052781,0.525725,
        0.951058,1.500000,0.309013,
        0.587786,1.500000,0.809017,
        -0.276388,1.052780,0.850649,
        0.000000,1.500000,1.000000,
        -0.587786,1.500000,0.809017,
        -0.894426,1.052784,0.000000,
        -0.951058,1.500000,0.309013,
        -0.951058,1.500000,-0.309013,
        -0.276388,1.052780,-0.850649,
        -0.587786,1.500000,-0.809017,
        0.000000,1.500000,-1.000000,
        0.723607,1.052781,-0.525725,
        0.587786,1.500000,-0.809017,
        0.951058,1.500000,-0.309013,
        0.276388,1.947220,0.850649,
        0.688189,2.025736,0.499997,
        0.162456,2.350654,0.499995,
        -0.723607,1.947219,0.525725,
        -0.262869,2.025738,0.809012,
        -0.425323,2.350654,0.309011,
        -0.723607,1.947219,-0.525725,
        -0.850648,2.025736,0.000000,
        -0.425323,2.350654,-0.309011,
        0.276388,1.947220,-0.850649,
        -0.262869,2.025738,-0.809012,
        0.162456,2.350654,-0.499995,
        0.894426,1.947216,0.000000,
        0.688189,2.025736,-0.499997,
        0.525730,2.350652,0.000000,
        0.525730,2.350652,0.000000,
        0.162456,2.350654,-0.499995,
        0.000000,2.500000,0.000000,
        0.525730,2.350652,0.000000,
        0.688189,2.025736,-0.499997,
        0.162456,2.350654,-0.499995,
        0.688189,2.025736,-0.499997,
        0.276388,1.947220,-0.850649,
        0.162456,2.350654,-0.499995,
        0.162456,2.350654,-0.499995,
        -0.425323,2.350654,-0.309011,
        0.000000,2.500000,0.000000,
        0.162456,2.350654,-0.499995,
        -0.262869,2.025738,-0.809012,
        -0.425323,2.350654,-0.309011,
        -0.262869,2.025738,-0.809012,
        -0.723607,1.947219,-0.525725,
        -0.425323,2.350654,-0.309011,
        -0.425323,2.350654,-0.309011,
        -0.425323,2.350654,0.309011,
        0.000000,2.500000,0.000000,
        -0.425323,2.350654,-0.309011,
        -0.850648,2.025736,0.000000,
        -0.425323,2.350654,0.309011,
        -0.850648,2.025736,0.000000,
        -0.723607,1.947219,0.525725,
        -0.425323,2.350654,0.309011,
        -0.425323,2.350654,0.309011,
        0.162456,2.350654,0.499995,
        0.000000,2.500000,0.000000,
        -0.425323,2.350654,0.309011,
        -0.262869,2.025738,0.809012,
        0.162456,2.350654,0.499995,
        -0.262869,2.025738,0.809012,
        0.276388,1.947220,0.850649,
        0.162456,2.350654,0.499995,
        0.162456,2.350654,0.499995,
        0.525730,2.350652,0.000000,
        0.000000,2.500000,0.000000,
        0.162456,2.350654,0.499995,
        0.688189,2.025736,0.499997,
        0.525730,2.350652,0.000000,
        0.688189,2.025736,0.499997,
        0.894426,1.947216,0.000000,
        0.525730,2.350652,0.000000,
        0.951058,1.500000,-0.309013,
        0.688189,2.025736,-0.499997,
        0.894426,1.947216,0.000000,
        0.951058,1.500000,-0.309013,
        0.587786,1.500000,-0.809017,
        0.688189,2.025736,-0.499997,
        0.587786,1.500000,-0.809017,
        0.276388,1.947220,-0.850649,
        0.688189,2.025736,-0.499997,
        0.000000,1.500000,-1.000000,
        -0.262869,2.025738,-0.809012,
        0.276388,1.947220,-0.850649,
        0.000000,1.500000,-1.000000,
        -0.587786,1.500000,-0.809017,
        -0.262869,2.025738,-0.809012,
        -0.587786,1.500000,-0.809017,
        -0.723607,1.947219,-0.525725,
        -0.262869,2.025738,-0.809012,
        -0.951058,1.500000,-0.309013,
        -0.850648,2.025736,0.000000,
        -0.723607,1.947219,-0.525725,
        -0.951058,1.500000,-0.309013,
        -0.951058,1.500000,0.309013,
        -0.850648,2.025736,0.000000,
        -0.951058,1.500000,0.309013,
        -0.723607,1.947219,0.525725,
        -0.850648,2.025736,0.000000,
        -0.587786,1.500000,0.809017,
        -0.262869,2.025738,0.809012,
        -0.723607,1.947219,0.525725,
        -0.587786,1.500000,0.809017,
        0.000000,1.500000,1.000000,
        -0.262869,2.025738,0.809012,
        0.000000,1.500000,1.000000,
        0.276388,1.947220,0.850649,
        -0.262869,2.025738,0.809012,
        0.587786,1.500000,0.809017,
        0.688189,2.025736,0.499997,
        0.276388,1.947220,0.850649,
        0.587786,1.500000,0.809017,
        0.951058,1.500000,0.309013,
        0.688189,2.025736,0.499997,
        0.951058,1.500000,0.309013,
        0.894426,1.947216,0.000000,
        0.688189,2.025736,0.499997,
        0.587786,1.500000,-0.809017,
        0.000000,1.500000,-1.000000,
        0.276388,1.947220,-0.850649,
        0.587786,1.500000,-0.809017,
        0.262869,0.974262,-0.809012,
        0.000000,1.500000,-1.000000,
        0.262869,0.974262,-0.809012,
        -0.276388,1.052780,-0.850649,
        0.000000,1.500000,-1.000000,
        -0.587786,1.500000,-0.809017,
        -0.951058,1.500000,-0.309013,
        -0.723607,1.947219,-0.525725,
        -0.587786,1.500000,-0.809017,
        -0.688189,0.974264,-0.499997,
        -0.951058,1.500000,-0.309013,
        -0.688189,0.974264,-0.499997,
        -0.894426,1.052784,0.000000,
        -0.951058,1.500000,-0.309013,
        -0.951058,1.500000,0.309013,
        -0.587786,1.500000,0.809017,
        -0.723607,1.947219,0.525725,
        -0.951058,1.500000,0.309013,
        -0.688189,0.974264,0.499997,
        -0.587786,1.500000,0.809017,
        -0.688189,0.974264,0.499997,
        -0.276388,1.052780,0.850649,
        -0.587786,1.500000,0.809017,
        0.000000,1.500000,1.000000,
        0.587786,1.500000,0.809017,
        0.276388,1.947220,0.850649,
        0.000000,1.500000,1.000000,
        0.262869,0.974262,0.809012,
        0.587786,1.500000,0.809017,
        0.262869,0.974262,0.809012,
        0.723607,1.052781,0.525725,
        0.587786,1.500000,0.809017,
        0.951058,1.500000,0.309013,
        0.951058,1.500000,-0.309013,
        0.894426,1.947216,0.000000,
        0.951058,1.500000,0.309013,
        0.850648,0.974264,0.000000,
        0.951058,1.500000,-0.309013,
        0.850648,0.974264,0.000000,
        0.723607,1.052781,-0.525725,
        0.951058,1.500000,-0.309013,
        0.425323,0.649346,-0.309011,
        0.262869,0.974262,-0.809012,
        0.723607,1.052781,-0.525725,
        0.425323,0.649346,-0.309011,
        -0.162456,0.649346,-0.499995,
        0.262869,0.974262,-0.809012,
        -0.162456,0.649346,-0.499995,
        -0.276388,1.052780,-0.850649,
        0.262869,0.974262,-0.809012,
        -0.162456,0.649346,-0.499995,
        -0.688189,0.974264,-0.499997,
        -0.276388,1.052780,-0.850649,
        -0.162456,0.649346,-0.499995,
        -0.525730,0.649348,0.000000,
        -0.688189,0.974264,-0.499997,
        -0.525730,0.649348,0.000000,
        -0.894426,1.052784,0.000000,
        -0.688189,0.974264,-0.499997,
        -0.525730,0.649348,0.000000,
        -0.688189,0.974264,0.499997,
        -0.894426,1.052784,0.000000,
        -0.525730,0.649348,0.000000,
        -0.162456,0.649346,0.499995,
        -0.688189,0.974264,0.499997,
        -0.162456,0.649346,0.499995,
        -0.276388,1.052780,0.850649,
        -0.688189,0.974264,0.499997,
        0.850648,0.974264,0.000000,
        0.425323,0.649346,-0.309011,
        0.723607,1.052781,-0.525725,
        0.850648,0.974264,0.000000,
        0.425323,0.649346,0.309011,
        0.425323,0.649346,-0.309011,
        0.425323,0.649346,0.309011,
        0.000000,0.500000,0.000000,
        0.425323,0.649346,-0.309011,
        -0.162456,0.649346,0.499995,
        0.262869,0.974262,0.809012,
        -0.276388,1.052780,0.850649,
        -0.162456,0.649346,0.499995,
        0.425323,0.649346,0.309011,
        0.262869,0.974262,0.809012,
        0.425323,0.649346,0.309011,
        0.723607,1.052781,0.525725,
        0.262869,0.974262,0.809012,
        4.910892,0.000000,4.910892,
        -4.910892,0.000000,-4.910892,
        -4.910892,0.000000,4.910892,
        4.910892,0.000000,4.910892,
        4.910892,0.000000,-4.910892,
        -4.910892,0.000000,-4.910892,

      

    ];


    const vertsNorm = [
        0.0000,-1.0000,0.0000,
        0.4253,-0.8506,0.3090,
        -0.1625,-0.8506,0.5000,
        0.7236,-0.4472,0.5257,
        0.4253,-0.8506,0.3090,
        0.8506,-0.5257,0.0000,
        0.0000,-1.0000,0.0000,
        -0.1625,-0.8506,0.5000,
        -0.5257,-0.8506,0.0000,
        0.0000,-1.0000,0.0000,
        -0.5257,-0.8506,0.0000,
        -0.1625,-0.8506,-0.5000,
        0.0000,-1.0000,0.0000,
        -0.1625,-0.8506,-0.5000,
        0.4253,-0.8506,-0.3090,
        0.7236,-0.4472,0.5257,
        0.8506,-0.5257,0.0000,
        0.9510,0.0000,0.3090,
        -0.2764,-0.4472,0.8506,
        0.2629,-0.5257,0.8090,
        0.0000,0.0000,1.0000,
        -0.8944,-0.4472,0.0000,
        -0.6882,-0.5257,0.5000,
        -0.9510,0.0000,0.3090,
        -0.2764,-0.4472,-0.8506,
        -0.6882,-0.5257,-0.5000,
        -0.5878,0.0000,-0.8090,
        0.7236,-0.4472,-0.5257,
        0.2629,-0.5257,-0.8090,
        0.5878,0.0000,-0.8090,
        0.7236,-0.4472,0.5257,
        0.9510,0.0000,0.3090,
        0.5878,0.0000,0.8090,
        -0.2764,-0.4472,0.8506,
        0.0000,0.0000,1.0000,
        -0.5878,0.0000,0.8090,
        -0.8944,-0.4472,0.0000,
        -0.9510,0.0000,0.3090,
        -0.9510,0.0000,-0.3090,
        -0.2764,-0.4472,-0.8506,
        -0.5878,0.0000,-0.8090,
        0.0000,0.0000,-1.0000,
        0.7236,-0.4472,-0.5257,
        0.5878,0.0000,-0.8090,
        0.9510,0.0000,-0.3090,
        0.2764,0.4472,0.8506,
        0.6882,0.5257,0.5000,
        0.1625,0.8506,0.5000,
        -0.7236,0.4472,0.5257,
        -0.2629,0.5257,0.8090,
        -0.4253,0.8506,0.3090,
        -0.7236,0.4472,-0.5257,
        -0.8506,0.5257,0.0000,
        -0.4253,0.8506,-0.3090,
        0.2764,0.4472,-0.8506,
        -0.2629,0.5257,-0.8090,
        0.1625,0.8506,-0.5000,
        0.8944,0.4472,0.0000,
        0.6882,0.5257,-0.5000,
        0.5257,0.8506,0.0000,
        0.5257,0.8506,0.0000,
        0.1625,0.8506,-0.5000,
        0.0000,1.0000,0.0000,
        0.5257,0.8506,0.0000,
        0.6882,0.5257,-0.5000,
        0.1625,0.8506,-0.5000,
        0.6882,0.5257,-0.5000,
        0.2764,0.4472,-0.8506,
        0.1625,0.8506,-0.5000,
        0.1625,0.8506,-0.5000,
        -0.4253,0.8506,-0.3090,
        0.0000,1.0000,0.0000,
        0.1625,0.8506,-0.5000,
        -0.2629,0.5257,-0.8090,
        -0.4253,0.8506,-0.3090,
        -0.2629,0.5257,-0.8090,
        -0.7236,0.4472,-0.5257,
        -0.4253,0.8506,-0.3090,
        -0.4253,0.8506,-0.3090,
        -0.4253,0.8506,0.3090,
        0.0000,1.0000,0.0000,
        -0.4253,0.8506,-0.3090,
        -0.8506,0.5257,0.0000,
        -0.4253,0.8506,0.3090,
        -0.8506,0.5257,0.0000,
        -0.7236,0.4472,0.5257,
        -0.4253,0.8506,0.3090,
        -0.4253,0.8506,0.3090,
        0.1625,0.8506,0.5000,
        0.0000,1.0000,0.0000,
        -0.4253,0.8506,0.3090,
        -0.2629,0.5257,0.8090,
        0.1625,0.8506,0.5000,
        -0.2629,0.5257,0.8090,
        0.2764,0.4472,0.8506,
        0.1625,0.8506,0.5000,
        0.1625,0.8506,0.5000,
        0.5257,0.8506,0.0000,
        0.0000,1.0000,0.0000,
        0.1625,0.8506,0.5000,
        0.6882,0.5257,0.5000,
        0.5257,0.8506,0.0000,
        0.6882,0.5257,0.5000,
        0.8944,0.4472,0.0000,
        0.5257,0.8506,0.0000,
        0.9510,0.0000,-0.3090,
        0.6882,0.5257,-0.5000,
        0.8944,0.4472,0.0000,
        0.9510,0.0000,-0.3090,
        0.5878,0.0000,-0.8090,
        0.6882,0.5257,-0.5000,
        0.5878,0.0000,-0.8090,
        0.2764,0.4472,-0.8506,
        0.6882,0.5257,-0.5000,
        0.0000,0.0000,-1.0000,
        -0.2629,0.5257,-0.8090,
        0.2764,0.4472,-0.8506,
        0.0000,0.0000,-1.0000,
        -0.5878,0.0000,-0.8090,
        -0.2629,0.5257,-0.8090,
        -0.5878,0.0000,-0.8090,
        -0.7236,0.4472,-0.5257,
        -0.2629,0.5257,-0.8090,
        -0.9510,0.0000,-0.3090,
        -0.8506,0.5257,0.0000,
        -0.7236,0.4472,-0.5257,
        -0.9510,0.0000,-0.3090,
        -0.9510,0.0000,0.3090,
        -0.8506,0.5257,0.0000,
        -0.9510,0.0000,0.3090,
        -0.7236,0.4472,0.5257,
        -0.8506,0.5257,0.0000,
        -0.5878,0.0000,0.8090,
        -0.2629,0.5257,0.8090,
        -0.7236,0.4472,0.5257,
        -0.5878,0.0000,0.8090,
        0.0000,0.0000,1.0000,
        -0.2629,0.5257,0.8090,
        0.0000,0.0000,1.0000,
        0.2764,0.4472,0.8506,
        -0.2629,0.5257,0.8090,
        0.5878,0.0000,0.8090,
        0.6882,0.5257,0.5000,
        0.2764,0.4472,0.8506,
        0.5878,0.0000,0.8090,
        0.9510,0.0000,0.3090,
        0.6882,0.5257,0.5000,
        0.9510,0.0000,0.3090,
        0.8944,0.4472,0.0000,
        0.6882,0.5257,0.5000,
        0.5878,0.0000,-0.8090,
        0.0000,0.0000,-1.0000,
        0.2764,0.4472,-0.8506,
        0.5878,0.0000,-0.8090,
        0.2629,-0.5257,-0.8090,
        0.0000,0.0000,-1.0000,
        0.2629,-0.5257,-0.8090,
        -0.2764,-0.4472,-0.8506,
        0.0000,0.0000,-1.0000,
        -0.5878,0.0000,-0.8090,
        -0.9510,0.0000,-0.3090,
        -0.7236,0.4472,-0.5257,
        -0.5878,0.0000,-0.8090,
        -0.6882,-0.5257,-0.5000,
        -0.9510,0.0000,-0.3090,
        -0.6882,-0.5257,-0.5000,
        -0.8944,-0.4472,0.0000,
        -0.9510,0.0000,-0.3090,
        -0.9510,0.0000,0.3090,
        -0.5878,0.0000,0.8090,
        -0.7236,0.4472,0.5257,
        -0.9510,0.0000,0.3090,
        -0.6882,-0.5257,0.5000,
        -0.5878,0.0000,0.8090,
        -0.6882,-0.5257,0.5000,
        -0.2764,-0.4472,0.8506,
        -0.5878,0.0000,0.8090,
        0.0000,0.0000,1.0000,
        0.5878,0.0000,0.8090,
        0.2764,0.4472,0.8506,
        0.0000,0.0000,1.0000,
        0.2629,-0.5257,0.8090,
        0.5878,0.0000,0.8090,
        0.2629,-0.5257,0.8090,
        0.7236,-0.4472,0.5257,
        0.5878,0.0000,0.8090,
        0.9510,0.0000,0.3090,
        0.9510,0.0000,-0.3090,
        0.8944,0.4472,0.0000,
        0.9510,0.0000,0.3090,
        0.8506,-0.5257,0.0000,
        0.9510,0.0000,-0.3090,
        0.8506,-0.5257,0.0000,
        0.7236,-0.4472,-0.5257,
        0.9510,0.0000,-0.3090,
        0.4253,-0.8506,-0.3090,
        0.2629,-0.5257,-0.8090,
        0.7236,-0.4472,-0.5257,
        0.4253,-0.8506,-0.3090,
        -0.1625,-0.8506,-0.5000,
        0.2629,-0.5257,-0.8090,
        -0.1625,-0.8506,-0.5000,
        -0.2764,-0.4472,-0.8506,
        0.2629,-0.5257,-0.8090,
        -0.1625,-0.8506,-0.5000,
        -0.6882,-0.5257,-0.5000,
        -0.2764,-0.4472,-0.8506,
        -0.1625,-0.8506,-0.5000,
        -0.5257,-0.8506,0.0000,
        -0.6882,-0.5257,-0.5000,
        -0.5257,-0.8506,0.0000,
        -0.8944,-0.4472,0.0000,
        -0.6882,-0.5257,-0.5000,
        -0.5257,-0.8506,0.0000,
        -0.6882,-0.5257,0.5000,
        -0.8944,-0.4472,0.0000,
        -0.5257,-0.8506,0.0000,
        -0.1625,-0.8506,0.5000,
        -0.6882,-0.5257,0.5000,
        -0.1625,-0.8506,0.5000,
        -0.2764,-0.4472,0.8506,
        -0.6882,-0.5257,0.5000,
        0.8506,-0.5257,0.0000,
        0.4253,-0.8506,-0.3090,
        0.7236,-0.4472,-0.5257,
        0.8506,-0.5257,0.0000,
        0.4253,-0.8506,0.3090,
        0.4253,-0.8506,-0.3090,
        0.4253,-0.8506,0.3090,
        0.0000,-1.0000,0.0000,
        0.4253,-0.8506,-0.3090,
        -0.1625,-0.8506,0.5000,
        0.2629,-0.5257,0.8090,
        -0.2764,-0.4472,0.8506,
        -0.1625,-0.8506,0.5000,
        0.4253,-0.8506,0.3090,
        0.2629,-0.5257,0.8090,
        0.4253,-0.8506,0.3090,
        0.7236,-0.4472,0.5257,
        0.2629,-0.5257,0.8090,
        0.0000,1.0000,0.0000,
        0.0000,1.0000,0.0000,
        0.0000,1.0000,0.0000,
        0.0000,1.0000,0.0000,
        0.0000,1.0000,0.0000,
        0.0000,1.0000,0.0000,




    ];
   //remember from blender rotate 180 degrees in y, 180 degrees in z and 90degrees in x axis before exporting
   

    const meshVerts = new Float32Array(verts);
    const vertsLenght = meshVerts.length / 3;
    gl.uniform1i(uLvertices, vertsLenght);

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, vertsLenght, 1, 0, gl.RGB, gl.FLOAT, meshVerts);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    const textureNorm = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureNorm);

    const meshNorm = new Float32Array(vertsNorm);
    const normLength = meshNorm.length /3;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, normLength, 1, 0, gl.RGB, gl.FLOAT, meshNorm);
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



    const fpsElem = document.querySelector("#fps");

    let then = 0;

    function render(now){
        now *= 0.001;
        const deltaTime = now-then;
        then = now;
        const fps = 1/deltaTime;
        fpsElem.textContent = fps.toFixed(1);

        draw(now);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // animation
    const draw = (clock) => {
        // clock *= 0.001;
        gl.viewport(0.0, 0.0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textureNorm);
        gl.uniform1i(uLSr, 0);
        gl.uniform1i(uNormData, 1);
        gl.uniformMatrix4fv(uLocRot, false, rMat);
        gl.uniform1f(time_loc, clock);
        gl.uniform2f(mouse_loc, mousePosition[0], mousePosition[1]);
        gl.uniform2f(res_loc, width, height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
        // requestAnimationFrame(draw);
    };
    // requestAnimationFrame(draw);
})()