#version 300 es
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
//An kati den paei kala allaxa th synartisi poy ypologizei to ray-sphere intersection
//!!!!!!!!!!!!!!!!!!!!!
bool hitSphere(vec3 orig,vec3 dir,vec3 center,float r,out vec3 intersect, out float t){

    vec3 oc = orig - center;
    float a = dot(dir, dir);
    float b = 2. * dot(oc,dir);
    float c = dot(oc,oc) - r * r;

    if(c>0.0 && b > 0.0) return false;
    float discriminant = b*b -4.*a*c;

    if(discriminant < 0.0) return false;

    t= (-b-sqrt(discriminant))/(2.*a);

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

bool hitTriangle( vec3 orig, vec3 dir, vec3 a, vec3 b, vec3 c, vec3 aN, vec3 bN, vec3 cN, 
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
    
    N =  normalize(aN*uvt.x + bN*uvt.y + cN*uvt.z);
    dist = dot(a - orig, N) / dot(dir, N);
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
    vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0), aN = vec4(0.0),bN= vec4(0.0),cN= vec4(0.0);
    vec3 intersect = vec3(0.0,0.0,0.0);

    for (int i = 0; i < vertsCount; i += 3) {
        a = texelFetch(uMeshData, ivec2(i, 0), 0);
        b = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(1, 0));
        c = texelFetchOffset(uMeshData, ivec2(i, 0), 0, ivec2(2, 0));

        aN = texelFetch(uNormData, ivec2(i, 0), 0);
        bN = texelFetchOffset(uNormData, ivec2(i, 0), 0, ivec2(1, 0));
        cN = texelFetchOffset(uNormData, ivec2(i, 0), 0, ivec2(2, 0));

        vec3 triangleNormal;
        vec3 uvt;
        float z;

        //bool isHit = hitTriangle(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, aN.xyz, bN.xyz, cN.xyz, uvt, triangleNormal, intersect, z);
        bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);
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
       for (int i = 0; i < 6; i += 3) {
           
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
            bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);
            if (isHit) {

                if (z<mindist && z > 0.001) {
                    hitPos1 = intersect;
                    
                    mindist = z;
                    weHitSomething = true;
                    material.type = METAL;
                    material.albedo = vec3(.7, .7, .7);
                    normal = normalize(aN.xyz*uvt.x + bN.xyz*uvt.y + cN.xyz*uvt.z);

                    //normal = triangleNormal;
                    hitPos = hitPos1;            
                }
           }      
        }


        for (int i = 6; i < vertsCount; i += 3) {
           
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
            bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);
            if (isHit) {

                if (z<mindist && z > 0.001) {
                    hitPos1 = intersect;
                    
                    mindist = z;
                    weHitSomething = true;
                    material.type = DIEL;
                    material.albedo = vec3(.8, .3, .4);
                    normal = normalize(aN.xyz*uvt.x + bN.xyz*uvt.y + cN.xyz*uvt.z);

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
        //    bool isHit = hitTriangleSecond(R_.orig, R_.dir, a.xyz, b.xyz, c.xyz, uvt, triangleNormal, intersect, z);
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

    // for(int i=0; i< 2; i++){
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
                        //shadow = calcShadow(lightSource, hitPos);
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
                        //shadow = calcShadow(lightSource, hitPos);
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
    // }

    return color;
}


void main() {
    //initialize lightSource Ray, camera
   
    Sphere lightSource = Sphere(vec3( 2.5*sin(time),1.5,2.5*cos(time)), 0.18);
    //Sphere lightSource = Sphere(vec3(-1.,2.,3.), 0.18);
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
}