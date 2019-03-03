#version 300 es
in vec2 p;
out vec2 vuv;
void main(){
    gl_Position = vec4(vuv = p, 0, 1);
}