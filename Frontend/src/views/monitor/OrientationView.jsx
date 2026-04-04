import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const OrientationView = ({ orientation = { x: 0, y: 0, z: 0, w: 1 } }) => {
    const mountRef = useRef(null);

    useEffect(() => {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight || 200;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        // Camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);

        // Geometry (Simple box to represent drone)
        const geometry = new THREE.BoxGeometry(2, 0.5, 3);
        const material = new THREE.MeshNormalMaterial();
        const drone = new THREE.Mesh(geometry, material);
        scene.add(drone);

        // Grid helper
        const gridHelper = new THREE.GridHelper(10, 10);
        scene.add(gridHelper);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);

        // Store drone in ref to update orientation
        mountRef.current.drone = drone;

        return () => {
            window.removeEventListener('resize', handleResize);
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    useEffect(() => {
        if (mountRef.current && mountRef.current.drone) {
            const { x, y, z, w } = orientation;
            const quaternion = new THREE.Quaternion(x, y, z, w);
            mountRef.current.drone.setRotationFromQuaternion(quaternion);
        }
    }, [orientation]);

    return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '200px' }} />;
};

export default OrientationView;
