#version 130
 
in vec3 positionEyeSpace;
in vec3 normalEyeSpace;
in vec3 positionWorldSpace;
in vec3 normalWorldSpace;
 
uniform float farPlane;
 
// ray definition
struct Ray {
    vec3 origin;        // starting point
    vec3 direction;     // ray direction
};
 
 
// primary reflections: rasterization
vec4 primaryReflections() {
    vec3 nNormalEyeSpace = normalize(normalEyeSpace);
 
    // Depth calculation
    vec3 nPositionEyeSpace = normalize(-positionEyeSpace);
    float linearDepth = length(positionEyeSpace);
 
    // Normalize depth using range value (farPlane)
    linearDepth = linearDepth / farPlane;
    gl_FragDepth = linearDepth;
 
    // presents the normal and depth data as matrix
    vec4 output = vec4(0, 0, 0, 1);
    if (linearDepth <= 1) {
        output.y = linearDepth;
        output.z = abs(dot(nPositionEyeSpace, nNormalEyeSpace));
    }
 
    return output;
}
 
// secondary reflections: ray-triangle intersection
vec4 secondaryReflections(vec4 firstR) {
    // calculate the reflection direction for an incident vector
    vec3 nNormalWorldSpace = normalize(normalWorldSpace);
    vec3 reflectedDir = reflect(positionWorldSpace, nNormalWorldSpace);
 
    Ray ray;
    ray.origin = positionWorld;
    ray.direction = reflectedDir;
 
    // TODO: perform the ray-triangle intersection
    vec4 output = vec4(0,0,0,1);
 
    return output;
}
 
void main() {
    // output: primary reflections by rasterization
    vec4 firstR = primaryReflections();
    vec4 secndR = secondaryReflections(firstR);
 
    // gl_FragData[0] = firstR;
    gl_FragData[0] = secndR;
}