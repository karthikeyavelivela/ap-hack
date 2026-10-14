import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TaraMood, taraAmp } from '@/store';

const vert = /* glsl */ `
varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){ vN = normalize(normalMatrix * normal); vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const frag = /* glsl */ `
precision highp float;
uniform float uTime; uniform float uAmp;
varying vec3 vN; varying vec3 vP; varying vec3 vV;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return mod289(((x*34.)+1.)*x);}
float noise(vec3 p){ vec3 a=floor(p); vec3 d=p-a; d=d*d*(3.-2.*d);
  vec4 b=a.xxyy+vec4(0.,1.,0.,1.); vec4 k1=perm(b.xyxy); vec4 k2=perm(k1.xyxy+b.zzww);
  vec4 c=k2+a.zzzz; vec4 k3=perm(c); vec4 k4=perm(c+1.);
  vec4 o1=fract(k3*(1./41.)); vec4 o2=fract(k4*(1./41.));
  vec4 o3=o2*d.z+o1*(1.-d.z); vec2 o4=o3.yw*d.x+o3.xz*(1.-d.x); return o4.y*d.y+o4.x*(1.-d.y); }
void main(){
  vec3 p = normalize(vP);
  float t = uTime;
  vec3 q = p*1.6 + vec3(0., t*.35, t*.2);
  float n = noise(q*1.5 + noise(q*2.0 + t*.3)*1.5);
  float sw = sin((p.x+p.y*.6)*4.0 + n*5.0 + t*.8)*.5+.5;
  vec3 deep = vec3(.231,.141,.078); vec3 mid = vec3(.42,.26,.15); vec3 car = vec3(.643,.443,.282); vec3 sand = vec3(.89,.69,.48); vec3 hi = vec3(1.,.87,.66);
  vec3 col = mix(mid, car, smoothstep(.1,.6,n));
  col = mix(col, sand, smoothstep(.3,.8,sw*n*1.7));
  col = mix(col, hi, smoothstep(.7,1.0,sw*n*1.9) * .7);
  col = mix(col, deep, smoothstep(.55,.95,1.0-sw) * .35);
  col += sand * .12;
  float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.4);
  col += hi * fres * (.55 + uAmp*.9);
  float spec = pow(max(dot(normalize(vN), normalize(vec3(-.4,.6,.7))), 0.0), 36.0);
  col += vec3(1.,.95,.85) * spec * .45;
  col += car * uAmp * .35;
  gl_FragColor = vec4(col, 1.0);
}`;

const SPEED: Record<TaraMood, number> = { idle: 0.35, listening: 0.7, thinking: 1.6, speaking: 0.9, happy: 0.6, concerned: 0.5 };

function Sphere({ mood }: { mood: TaraMood }) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uAmp: { value: 0 } }), []);
  const speed = useRef(0.35);
  useFrame((_, dt) => {
    speed.current += (SPEED[mood] - speed.current) * Math.min(1, dt * 3);
    uniforms.uTime.value += dt * speed.current;
    const target = mood === 'speaking' || mood === 'listening' ? taraAmp.value : 0;
    uniforms.uAmp.value += (target - uniforms.uAmp.value) * Math.min(1, dt * 12);
    if (mesh.current) {
      mesh.current.scale.setScalar(1 + Math.sin(uniforms.uTime.value * 3) * 0.012 + uniforms.uAmp.value * 0.07);
      mesh.current.rotation.y += dt * 0.15 * speed.current;
    }
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial uniforms={uniforms} vertexShader={vert} fragmentShader={frag} />
    </mesh>
  );
}

export default function OrbCanvas({ mood }: { mood: TaraMood }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 2.55], fov: 40 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} style={{ borderRadius: '9999px' }}>
      <Sphere mood={mood} />
    </Canvas>
  );
}
