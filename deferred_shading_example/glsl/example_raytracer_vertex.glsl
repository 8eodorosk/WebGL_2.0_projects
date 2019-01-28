#version 130
 
uniform mat4 osg_ViewMatrixInverse;
 
out vec3 positionEyeSpace;
out vec3 normalEyeSpace;
out vec3 positionWorldSpace;
out vec3 normalWorldSpace;
 
void main() {
    gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
 
    // eye space
    positionEyeSpace = vec3(gl_ModelViewMatrix * gl_Vertex);
    normalEyeSpace = gl_NormalMatrix * gl_Normal;
 
    // world space
    mat4 modelWorld = osg_ViewMatrixInverse * gl_ModelViewMatrix;
    positionWorldSpace = vec3(modelWorld * gl_Vertex);
    normalWorldSpace = mat3(modelWorld) * gl_Normal;
 
    // Texture for normal mapping (irregularities surfaces)
    gl_TexCoord[0] = gl_TextureMatrix[0] * gl_MultiTexCoord0;
}