import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useProbadorStore } from '../../store/probador/probador.store';
import { mapToScale } from '../../helpers/morphMapper';

// Fallback mesh if GLB URL is not provided
function AnnyFallbackMesh({ isTryingOn }) {
    const group = useRef();
    const bodyParams = useProbadorStore(state => state.bodyParams);

    // Scale body dynamically using helper
    const scaleObj = mapToScale(bodyParams);
    const bodyColor = isTryingOn ? '#9D00FF' : '#00F2FF';

    useFrame((state) => {
        if (group.current && !isTryingOn) {
            // Simple breathing animation on Y position
            group.current.position.y = (-1 * scaleObj.y) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={group} position={[0, -1 * scaleObj.y, 0]} scale={[scaleObj.x, scaleObj.y, scaleObj.z]}>
            <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[1.2, 2.5, 0.6]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#00F2FF" />
            </mesh>
            <mesh position={[-0.3, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 2.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0.3, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.2, 2.5, 32]} />
                <meshStandardMaterial color={bodyColor} wireframe={!isTryingOn} opacity={0.6} transparent />
            </mesh>
        </group>
    );
}

// Actual GLB Avatar Component (If real model is loaded)
function AvatarGLB({ url }) {
    const { scene } = useGLTF(url);
    const group = useRef();
    const bodyParams = useProbadorStore(state => state.bodyParams);

    // In a real implementation with SMPL/Blendshapes, you would traverse the scene graph
    // and apply `mapToBlendshapes` to the `morphTargetInfluences` of specific meshes.
    // For this example, if shapekeys are not present, we use scaling.
    const scaleObj = mapToScale(bodyParams);

    useFrame((state) => {
        if (group.current) {
            group.current.position.y = (-1 * scaleObj.y) + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={group} position={[0, -1 * scaleObj.y, 0]} scale={[scaleObj.x, scaleObj.y, scaleObj.z]}>
            <primitive object={scene} />
        </group>
    );
}

export default function Model3D({ glbUrl, isTryingOn }) {
    return (
        <Suspense fallback={null}>
            {glbUrl ? (
                <AvatarGLB url={glbUrl} />
            ) : (
                <AnnyFallbackMesh isTryingOn={isTryingOn} />
            )}
        </Suspense>
    );
}
