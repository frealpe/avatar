import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, useContext } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    OrbitControls,
    TransformControls,
    PerspectiveCamera,
    Grid,
    GizmoHelper,
    GizmoViewport,
    Stage,
    useGLTF
} from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../../store';
import iotApi from '../../service/iotApi';
import { SocketContext } from '../../context/SocketContext';

// --- Helpers ---
const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = iotApi.API_BASE || 'http://localhost:8080';
    // Removemos slashes dobles y corregimos el prefijo /api si fue añadido erróneamente a un path estático
    let cleanUrl = url.replace(/\/\//g, '/');
    if (cleanUrl.startsWith('/api/') && (cleanUrl.includes('/patterns/') || cleanUrl.includes('/temp/') || cleanUrl.includes('/avatars/'))) {
        cleanUrl = cleanUrl.replace('/api/', '/');
    }
    return `${base}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

// --- Constants & Config ---
const JOINT_LIMITS = {
    shoulder_l: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    shoulder_r: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    elbow_l: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    elbow_r: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    hand_l: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    hand_r: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    head: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    spine: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    hips: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    knee_l: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    knee_r: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    ankle_l: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
    ankle_r: { x: [-6.3, 6.3], y: [-6.3, 6.3], z: [-6.3, 6.3] },
};

const BONE_LENGTHS = { upperArm: 0.55, forearm: 0.50 };
const MAX_REACH = BONE_LENGTHS.upperArm + BONE_LENGTHS.forearm;

// ===================================================================
//  ANALYTIC 2-BONE IK SOLVER
// ===================================================================
function solveIK2Bone(rootWorldPos, targetWorldPos, l1, l2, side, constraints, debugInv) {
    const root = rootWorldPos.clone();
    const target = targetWorldPos.clone();
    const dir = new THREE.Vector3().subVectors(target, root);
    // Preserve bone lengths: clamp distance to the reachable annulus [|l1-l2|, l1+l2]
    const rawDist = dir.length();
    const minDist = Math.abs(l1 - l2) + 0.001;
    const maxDist = l1 + l2 - 0.001;
    const dist = Math.max(Math.min(rawDist, maxDist), minDist);
    const sign = side === 'left' ? 1 : -1;

    // Yaw around the vertical axis (point the shoulder toward the target horizontally)
    let shoulderY = -Math.atan2(dir.z, sign * dir.x);
    if (debugInv?.flip180) shoulderY += Math.PI;

    const horizontalDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    // Elevation (pitch) from shoulder toward the target
    let baseElevation = Math.atan2(dir.y, horizontalDist);

    const cosElbow = (l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2);
    const elbowAngle = Math.acos(THREE.MathUtils.clamp(cosElbow, -1, 1));
    const cosShoulder = (dist * dist + l1 * l1 - l2 * l2) / (2 * dist * l1);
    const shoulderOffset = Math.acos(THREE.MathUtils.clamp(cosShoulder, -1, 1));

    // Compose shoulder rotation: we keep X as 0 (handled by other controls), Y as yaw, Z as elevation+offset
    let shoulderZ = -sign * (baseElevation + shoulderOffset);
    // SMPL-X standard: Elbow flexion is on the X-axis. 
    // For Left, positive X bends. For Right, negative X bends (due to mirroring).
    // Elbow flexion preserves bone lengths; choose fold direction consistent with side
    let elbowX = sign * (Math.PI - elbowAngle);

    const sKey = side === 'left' ? 'shoulder_l' : 'shoulder_r';
    const eKey = side === 'left' ? 'elbow_l' : 'elbow_r';
    const clamp = (v, [lo, hi]) => THREE.MathUtils.clamp(v, lo, hi);
    return {
        shoulderEuler: [0, clamp(shoulderY, constraints[sKey].y), clamp(shoulderZ, constraints[sKey].z)],
        elbowEuler: [clamp(elbowX, constraints[eKey].x), 0, 0]
    };
}

// --- Components ---

function AvatarModel({ url }) {
    const { scene } = useGLTF(url);
    // Elevamos el avatar y restauramos la rotación 180 para que mire al frente
    return <primitive object={scene} position={[0, -0.6, 0]} rotation={[0, Math.PI, 0]} />;
}

// Avatar model that applies poseData rotations to bones for real-time pose visualization
function AvatarModelWithPose({ url, poseData }) {
    const { scene } = useGLTF(url);
    const groupRef = useRef();

    // Apply poseData rotations to bones in the scene
    useEffect(() => {
        if (!groupRef.current || !poseData || !scene) return;

        const boneMap = {
            'shoulder_l': ['ArmatureL|Shoulder', 'Armature|Shoulder.L', 'Shoulder_L'],
            'shoulder_r': ['ArmatureR|Shoulder', 'Armature|Shoulder.R', 'Shoulder_R'],
            'elbow_l': ['ArmatureL|Elbow', 'Armature|Elbow.L', 'Elbow_L'],
            'elbow_r': ['ArmatureR|Elbow', 'Armature|Elbow.R', 'Elbow_R'],
            'hand_l': ['ArmatureL|Hand', 'Armature|Hand.L', 'Hand_L'],
            'hand_r': ['ArmatureR|Hand', 'Armature|Hand.R', 'Hand_R'],
            'head': ['ArmatureHead|Head', 'Armature|Head', 'Head'],
            'spine': ['ArmatureSpine|Spine', 'Armature|Spine', 'Spine'],
            'hips': ['ArmatureHips|Hips', 'Armature|Hips', 'Hips'],
            'knee_l': ['ArmatureL|Knee', 'Armature|Knee.L', 'Knee_L'],
            'knee_r': ['ArmatureR|Knee', 'Armature|Knee.R', 'Knee_R'],
            'ankle_l': ['ArmatureL|Ankle', 'Armature|Ankle.L', 'Ankle_L'],
            'ankle_r': ['ArmatureR|Ankle', 'Armature|Ankle.R', 'Ankle_R'],
        };

        // Traverse scene to find and update bones
        scene.traverse((child) => {
            for (const [poseKey, boneNames] of Object.entries(boneMap)) {
                if (boneNames.includes(child.name)) {
                    const rotation = poseData[poseKey] || [0, 0, 0];
                    child.rotation.order = 'XYZ';
                    child.rotation.set(...rotation);
                    break;
                }
            }
        });
    }, [poseData, scene]);

    return (
        <group ref={groupRef} position={[0, -0.6, 0]} rotation={[0, Math.PI, 0]}>
            <primitive object={scene} />
        </group>
    );
}

function Bone({ from, to, color = '#00f1fe', opacity = 0.5 }) {
    const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to]);
    return (
        <line>
            <bufferGeometry attach="geometry" setFromPoints={points} />
            <lineBasicMaterial attach="material" color={color} transparent opacity={opacity} />
        </line>
    );
}

function JointNode({ position, color, selected, onClick, activeColor }) {
    return (
        <mesh position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <sphereGeometry args={[selected ? 0.06 : 0.04, 16, 16]} />
            <meshStandardMaterial color={selected ? activeColor : color} emissive={selected ? activeColor : color} emissiveIntensity={selected ? 2 : 0.5} />
        </mesh>
    );
}

function IKSkeleton({ poseData, selectedJoint, onSelectJoint }) {
    const CYAN = '#00f1fe';
    const MAGENTA = '#d800ff';
    const GREEN = '#39ff14';
    const rootL = useMemo(() => new THREE.Vector3(0.45, 1.5, 0), []);
    const rootR = useMemo(() => new THREE.Vector3(-0.45, 1.5, 0), []);
    const rootP = useMemo(() => new THREE.Vector3(0, 0.9, 0), []); // Pelvis
    const rootS = useMemo(() => new THREE.Vector3(0, 1.2, 0), []); // Spine
    const rootN = useMemo(() => new THREE.Vector3(0, 1.5, 0), []); // Neck/Shoulder center
    const rootH = useMemo(() => new THREE.Vector3(0, 1.75, 0), []); // Head Top

    const pos = useMemo(() => {
        // --- Bone Lengths ---
        const L = {
            spine: 0.3, neck: 0.2, head: 0.15,
            shoulder: 0.2, uArm: 0.35, fArm: 0.35,
            thigh: 0.4, calf: 0.4, foot: 0.1
        };

        // Helper to get quaternion from poseData or [0,0,0]
        const getQ = (key) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...(poseData[key] || [0, 0, 0]), 'XYZ'));

        // --- Hips & Torso Chain ---
        const qHips = getQ('hips');
        const posSpine = rootP.clone().add(new THREE.Vector3(0, L.spine, 0).applyQuaternion(qHips));

        const qSpine = qHips.clone().multiply(getQ('spine'));
        const posNeck = posSpine.clone().add(new THREE.Vector3(0, L.neck, 0).applyQuaternion(qSpine));

        // Head
        const qHead = qSpine.clone().multiply(getQ('head'));
        const posHead = posNeck.clone().add(new THREE.Vector3(0, L.head, 0).applyQuaternion(qHead));

        // --- Arms (Children of Neck) ---
        // Left
        const sL_Offset = new THREE.Vector3(L.shoulder, 0, 0).applyQuaternion(qSpine);
        const posSL = posNeck.clone().add(sL_Offset);
        const qSL = qSpine.clone().multiply(getQ('shoulder_l'));
        const posEL = posSL.clone().add(new THREE.Vector3(L.uArm, 0, 0).applyQuaternion(qSL));
        const qEL = qSL.clone().multiply(getQ('elbow_l'));
        const posHL = posEL.clone().add(new THREE.Vector3(L.fArm, 0, 0).applyQuaternion(qEL));

        // Right
        const sR_Offset = new THREE.Vector3(-L.shoulder, 0, 0).applyQuaternion(qSpine);
        const posSR = posNeck.clone().add(sR_Offset);
        const qSR = qSpine.clone().multiply(getQ('shoulder_r'));
        const posER = posSR.clone().add(new THREE.Vector3(-L.uArm, 0, 0).applyQuaternion(qSR));
        const qER = qSR.clone().multiply(getQ('elbow_r'));
        const posHR = posER.clone().add(new THREE.Vector3(-L.fArm, 0, 0).applyQuaternion(qER));

        // --- Legs (Children of Hips) ---
        // Left
        const qKL = qHips.clone().multiply(getQ('knee_l'));
        const posKL = rootP.clone().add(new THREE.Vector3(0.18, -L.thigh, 0).applyQuaternion(qHips));
        const qAL = qKL.clone().multiply(getQ('ankle_l'));
        const posAL = posKL.clone().add(new THREE.Vector3(0, -L.calf, 0).applyQuaternion(qKL));

        // Right
        const qKR = qHips.clone().multiply(getQ('knee_r'));
        const posKR = rootP.clone().add(new THREE.Vector3(-0.18, -L.thigh, 0).applyQuaternion(qHips));
        const qAR = qKR.clone().multiply(getQ('ankle_r'));
        const posAR = posKR.clone().add(new THREE.Vector3(0, -L.calf, 0).applyQuaternion(qKR));

        return {
            pelvis: rootP.toArray(), spine: posSpine.toArray(), neck: posNeck.toArray(), head: posHead.toArray(),
            sL: posSL.toArray(), eL: posEL.toArray(), hL: posHL.toArray(),
            sR: posSR.toArray(), eR: posER.toArray(), hR: posHR.toArray(),
            kL: posKL.toArray(), aL: posAL.toArray(), kR: posKR.toArray(), aR: posAR.toArray()
        };
    }, [poseData, rootP]);

    const Line = ({ start, end, color = 'white' }) => (
        <line>
            <bufferGeometry attach="geometry" onUpdate={(sf) => sf.setFromPoints([new THREE.Vector3(...start), new THREE.Vector3(...end)])} />
            <lineBasicMaterial attach="material" color={color} linewidth={1} opacity={0.25} transparent />
        </line>
    );

    return (
        <group rotation={[0, Math.PI, 0]}>
            {/* Links */}
            <Line start={pos.pelvis} end={pos.spine} />
            <Line start={pos.spine} end={pos.neck} />
            <Line start={pos.neck} end={pos.head} />
            <Line start={pos.neck} end={pos.sL} />
            <Line start={pos.neck} end={pos.sR} />
            <Line start={pos.sL} end={pos.eL} />
            <Line start={pos.eL} end={pos.hL} />
            <Line start={pos.sR} end={pos.eR} />
            <Line start={pos.eR} end={pos.hR} />
            <Line start={pos.pelvis} end={[0.18, 0.9, 0]} />
            <Line start={[0.18, 0.9, 0]} end={pos.kL} />
            <Line start={pos.kL} end={pos.aL} />
            <Line start={pos.pelvis} end={[-0.18, 0.9, 0]} />
            <Line start={[-0.18, 0.9, 0]} end={pos.kR} />
            <Line start={pos.kR} end={pos.aR} />

            {/* Joints */}
            <JointNode position={pos.head} color="white" selected={selectedJoint === 'head'} onClick={() => onSelectJoint('head')} activeColor={GREEN} />
            <JointNode position={pos.spine} color="white" selected={selectedJoint === 'spine'} onClick={() => onSelectJoint('spine')} activeColor={GREEN} />
            <JointNode position={pos.pelvis} color="white" selected={selectedJoint === 'hips'} onClick={() => onSelectJoint('hips')} activeColor={GREEN} />
            <JointNode position={pos.kL} color="white" selected={selectedJoint === 'knee_l'} onClick={() => onSelectJoint('knee_l')} activeColor={GREEN} />
            <JointNode position={pos.aL} color="white" selected={selectedJoint === 'ankle_l'} onClick={() => onSelectJoint('ankle_l')} activeColor={GREEN} />
            <JointNode position={pos.kR} color="white" selected={selectedJoint === 'knee_r'} onClick={() => onSelectJoint('knee_r')} activeColor={GREEN} />
            <JointNode position={pos.aR} color="white" selected={selectedJoint === 'ankle_r'} onClick={() => onSelectJoint('ankle_r')} activeColor={GREEN} />

            <JointNode position={pos.sL} color="white" selected={selectedJoint === 'shoulder_l'} onClick={() => onSelectJoint('shoulder_l')} activeColor={CYAN} />
            <JointNode position={pos.eL} color="white" selected={selectedJoint === 'elbow_l'} onClick={() => onSelectJoint('elbow_l')} activeColor={CYAN} />
            <JointNode position={pos.hL} color="white" selected={selectedJoint === 'hand_l'} onClick={() => onSelectJoint('hand_l')} activeColor={CYAN} />
            <JointNode position={pos.sR} color="white" selected={selectedJoint === 'shoulder_r'} onClick={() => onSelectJoint('shoulder_r')} activeColor={MAGENTA} />
            <JointNode position={pos.eR} color="white" selected={selectedJoint === 'elbow_r'} onClick={() => onSelectJoint('elbow_r')} activeColor={MAGENTA} />
            <JointNode position={pos.hR} color="white" selected={selectedJoint === 'hand_r'} onClick={() => onSelectJoint('hand_r')} activeColor={MAGENTA} />

            {/* IK Constraints View */}
            {selectedJoint === 'hand_l' && <mesh position={rootL}><sphereGeometry args={[MAX_REACH, 32, 16]} /><meshStandardMaterial color={CYAN} wireframe transparent opacity={0.03} /></mesh>}
            {selectedJoint === 'hand_r' && <mesh position={rootR}><sphereGeometry args={[MAX_REACH, 32, 16]} /><meshStandardMaterial color={MAGENTA} wireframe transparent opacity={0.03} /></mesh>}
        </group>
    );
}

function IKHandle({ side, rootPosArr, poseData, onChange, active, debugInv }) {
    const handleRef = useRef();
    const root = useMemo(() => new THREE.Vector3(...rootPosArr), [rootPosArr]);
    const l1 = BONE_LENGTHS.upperArm;
    const l2 = BONE_LENGTHS.forearm;

    const initialPos = useMemo(() => {
        // Compute forward kinematics from current poseData to place the handle at the actual hand world position
        const sKey = side === 'left' ? 'shoulder_l' : 'shoulder_r';
        const eKey = side === 'left' ? 'elbow_l' : 'elbow_r';
        const s = poseData[sKey] || [0, 0, 0];
        const e = poseData[eKey] || [0, 0, 0];
        const sQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...s, 'XYZ'));
        const eQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...e, 'XYZ'));
        // Upper arm vector (local X), forearm vector (local X)
        const upper = new THREE.Vector3(side === 'left' ? l1 : -l1, 0, 0).applyQuaternion(sQuat);
        const fore = new THREE.Vector3(side === 'left' ? l2 : -l2, 0, 0).applyQuaternion(sQuat.multiply(eQuat));
        return root.clone().add(upper).add(fore);
    }, []);

    const onDrag = useCallback(() => {
        if (!handleRef.current) return;
        // TransformControls may change local/world transforms; read world position for the IK solver
        const worldPos = new THREE.Vector3();
        handleRef.current.getWorldPosition(worldPos);
        const { shoulderEuler, elbowEuler } = solveIK2Bone(root, worldPos, l1, l2, side, JOINT_LIMITS, debugInv);
        const sKey = side === 'left' ? 'shoulder_l' : 'shoulder_r';
        const eKey = side === 'left' ? 'elbow_l' : 'elbow_r';
        onChange(prev => ({ ...prev, [sKey]: shoulderEuler, [eKey]: elbowEuler }));
    }, [root, l1, l2, side, onChange, debugInv]);

    if (!active) return null;
    return (
        <TransformControls position={initialPos} mode="translate" onObjectChange={onDrag} ref={handleRef}>
            <mesh><sphereGeometry args={[0.08]} /><meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={2} /></mesh>
        </TransformControls>
    );
}

const PoseSlider = ({ label, value, min, max, onChange, color }) => (
    <div className="space-y-0.5">
        <div className="flex justify-between text-[7px] font-bold uppercase tracking-wider text-white/30">
            <span>{label}</span>
            <span style={{ color }}>{((value * 180) / Math.PI).toFixed(0)}°</span>
        </div>
        <input type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-0.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#00f1fe] hover:accent-white transition-all" />
    </div>
);

const CameraPresets = ({ onSelect }) => (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
        {['F', 'S', 'T'].map(p => (
            <button key={p} onClick={() => onSelect(p === 'F' ? [0, 3, 6] : p === 'S' ? [6, 3, 0] : [0, 8, 0.1])}
                className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-black text-white hover:bg-[#00f1fe] hover:text-black transition-all">
                {p}
            </button>
        ))}
    </div>
);

const AjustesPose = () => {
    const { avatarData, setAvatar, user } = useStore();
    const [liveAvatar, setLiveAvatar] = useState(avatarData || {});
    const [posedMeshUrl, setPosedMeshUrl] = useState(null);
    const lastPosedBetas = useRef(null);

    const [poseData, setPoseData] = useState({
        shoulder_l: [0, 0, 0], shoulder_r: [0, 0, 0],
        elbow_l: [0, 0, 0], elbow_r: [0, 0, 0],
        hand_l: [0, 0, 0], hand_r: [0, 0, 0],
        head: [0, 0, 0], spine: [0, 0, 0], hips: [0, 0, 0],
        knee_l: [0, 0, 0], knee_r: [0, 0, 0],
        ankle_l: [0, 0, 0], ankle_r: [0, 0, 0]
    });
    const [selectedJoint, setSelectedJoint] = useState('shoulder_l');
    const [ikMode, setIkMode] = useState(false);
    const [debugInv, setDebugInv] = useState({ flip180: true });
    const [cameraTarget, setCameraTarget] = useState([0, 3, 6]);
    const [savedPoses, setSavedPoses] = useState([]);
    const [newPoseName, setNewPoseName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadUserAvatar = async () => {
            if (!avatarData && user?._id) {
                try {
                    const res = await iotApi.getAvatarByUser(user._id);
                    if (res.ok && res.avatar) {
                        setAvatar(res.avatar);
                    }
                } catch (e) {
                    console.error('Error loading user avatar:', e);
                }
            }
        };

        if (!avatarData && typeof window !== 'undefined') {
            try {
                const savedBody = window.localStorage.getItem('modavatar_active_body');
                if (savedBody) {
                    setAvatar(JSON.parse(savedBody));
                } else {
                    loadUserAvatar();
                }
            } catch (e) {
                console.error('Error restoring avatar in pose settings:', e);
                loadUserAvatar();
            }
        }
    }, [avatarData, user, setAvatar]);

    const ensureAvatarRecord = useCallback(async () => {
        const sourceAvatar = avatarData || liveAvatar;
        if (!sourceAvatar) return null;

        if (sourceAvatar._id) return sourceAvatar._id;

        try {
            const res = await iotApi.ensureAvatar(sourceAvatar);
            if (res?.ok && res.avatar?._id) {
                const persistedAvatar = { ...sourceAvatar, ...res.avatar, _id: res.avatar._id };
                setAvatar(persistedAvatar);
                setLiveAvatar(persistedAvatar);
                return res.avatar._id;
            }
        } catch (e) {
            console.error('Error ensuring avatar record:', e);
        }

        return null;
    }, [avatarData, liveAvatar, setAvatar]);

    const fetchPoses = useCallback(async () => {
        const avatarId = await ensureAvatarRecord();
        if (!avatarId) return;
        try {
            const res = await iotApi.getPosesByAvatar(avatarId);
            if (res.ok) setSavedPoses(res.poses);
        } catch (e) {
            console.error('Error fetching poses:', e);
        }
    }, [ensureAvatarRecord]);

    useEffect(() => {
        const init = async () => {
            await fetchPoses();
        };
        init();
    }, [fetchPoses]);

    // Auto-load default pose
    useEffect(() => {
        if (savedPoses.length > 0) {
            const defaultPose = savedPoses.find(p => p.isDefault);
            if (defaultPose && !lastPosedBetas.current) {
                setPoseData(defaultPose.poseData);
            }
        }
    }, [savedPoses]);

    const handleSavePose = async () => {
        if (!newPoseName.trim()) return;
        setIsSaving(true);
        try {
            const avatarId = await ensureAvatarRecord();
            if (!avatarId) return;
            const res = await iotApi.savePose(avatarId, newPoseName, poseData);
            if (res.ok) {
                setNewPoseName('');
                // 🎨 Pose guardada en la BD, pero NO sobrescribir el avatar por defecto
                // El avatar por defecto solo cambia cuando GUARDAS en Laboratorio
                console.log("📌 [AjustesPose] Pose guardada:", newPoseName);
                fetchPoses();
            }
        } catch (e) {
            console.error('Error saving pose:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePose = async (name, isDefault = false) => {
        setIsSaving(true);
        try {
            const avatarId = await ensureAvatarRecord();
            if (!avatarId) return;
            const res = await iotApi.savePose(avatarId, name, poseData, isDefault);
            if (res.ok) {
                // 🎨 Pose actualizada en la BD, pero NO sobrescribir el avatar por defecto
                console.log("📌 [AjustesPose] Pose actualizada:", name);
                fetchPoses();
            }
        } catch (e) {
            console.error('Error updating pose:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePose = async (id, e) => {
        e.stopPropagation();
        try {
            await iotApi.deletePose(id);
            fetchPoses();
        } catch (e) {
            console.error('Error deleting pose:', e);
        }
    };

    useEffect(() => {
        if (avatarData) setLiveAvatar(avatarData);
    }, [avatarData]);

    const { socket } = useContext(SocketContext);

    useEffect(() => {
        const recalculate = async () => {
            if (!liveAvatar.betas) return;
            const stateStr = JSON.stringify({ b: liveAvatar.betas, p: poseData });
            if (lastPosedBetas.current === stateStr) return;

            // Emit a lightweight preview of the pose for real-time preview in other clients
            try {
                if (socket) socket.emit('pose:preview', { poseData, betas: liveAvatar.betas, avatarId: liveAvatar._id || null });
            } catch (err) {
                console.error('Error emitiendo pose:preview:', err);
            }

            try {
                const res = await iotApi.recalculateAvatar(liveAvatar.betas, 'neutral', 'modeling', { poseData });
                if (res?.ok) {
                    const url = getFullUrl(res.meshUrl);
                    setPosedMeshUrl(url);
                    setAvatar({ ...liveAvatar, ...res, meshUrl: url, poseData });
                    lastPosedBetas.current = stateStr;
                }
            } catch (e) { console.error(e); }
        };
        const timer = setTimeout(recalculate, 250);
        return () => clearTimeout(timer);
    }, [liveAvatar.betas, poseData, socket]);

    return (
        <div className="flex-1 flex bg-black relative overflow-hidden font-['Inter']">
            {/* Viewport Principal */}
            <div className="w-2/3 h-full relative blueprint-grid border-r border-white/5">
                <CameraPresets onSelect={setCameraTarget} />
                <div className="absolute top-8 left-8 z-10 pointer-events-none">
                    <span className="text-[10px] text-[#00f1fe] font-black uppercase tracking-[0.4em]">Motor IK / Ajuste de Pose</span>
                    <h2 className="text-5xl font-black text-white/5 tracking-tighter uppercase mt-2">Rig Profesional</h2>
                </div>
                <Canvas shadows dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={cameraTarget} fov={35} />
                    <OrbitControls makeDefault enablePan={false} />
                    <ambientLight intensity={0.5} />
                    <axesHelper args={[2]} />
                    <Suspense fallback={null}>
                        {posedMeshUrl && <AvatarModelWithPose url={posedMeshUrl} poseData={poseData} />}
                        <IKSkeleton poseData={poseData} selectedJoint={selectedJoint} onSelectJoint={(j) => { setSelectedJoint(j); setIkMode(j.startsWith('hand')); }} />
                        <Stage environment="city" intensity={0.5} contactShadow={false} />
                    </Suspense>
                    <GizmoHelper alignment="top-right" margin={[80, 80]}><GizmoViewport /></GizmoHelper>
                </Canvas>

                {/* Visual Axis Guide */}
                <div className="absolute bottom-8 left-8 flex flex-col gap-1 bg-black/40 p-3 rounded-xl border border-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ff0000]" /> <span className="text-[7px] text-white/40 font-bold uppercase">Eje X (Peach / L-R)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00ff00]" /> <span className="text-[7px] text-white/40 font-bold uppercase">Eje Y (Yaw / Front-Back)</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0000ff]" /> <span className="text-[7px] text-white/40 font-bold uppercase">Eje Z (Roll / Up-Down)</span></div>
                </div>
            </div>

            {/* Sidebar Inspector */}
            <div className="w-1/3 h-full flex flex-col pt-4 bg-black/40 border-l border-white/5">
                <div className="flex-1 px-5 flex flex-col gap-3 min-h-0 pb-4">

                    {/* Panel Maestro de Sesión (General) */}
                    <div className="bg-white/[0.05] rounded-2xl p-3 border border-white/10 flex flex-col gap-3 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-[#00f1fe] tracking-widest">Gestión de Sesión</span>
                                <span className="text-[7px] text-white/30 font-bold uppercase">Control Global del Rig</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setPoseData({
                                    shoulder_l: [0, 0, 0], shoulder_r: [0, 0, 0], elbow_l: [0, 0, 0], elbow_r: [0, 0, 0],
                                    hand_l: [0, 0, 0], hand_r: [0, 0, 0], head: [0, 0, 0], spine: [0, 0, 0], hips: [0, 0, 0],
                                    knee_l: [0, 0, 0], knee_r: [0, 0, 0], ankle_l: [0, 0, 0], ankle_r: [0, 0, 0]
                                })} className="text-[7px] font-black px-2 py-1 rounded bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 transition-all">LIMPIAR TODO</button>
                                <button onClick={() => setDebugInv(p => ({ ...p, flip180: !p.flip180 }))} className={`text-[7px] font-black px-2 py-1 rounded border transition-all ${debugInv.flip180 ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-white/5 text-white/20'}`}>180°</button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <input
                                value={newPoseName}
                                onChange={e => setNewPoseName(e.target.value)}
                                placeholder="Nombre de la nueva pose..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-[#00f1fe]/50 transition-all"
                            />
                            <button
                                disabled={isSaving}
                                onClick={handleSavePose}
                                className="bg-[#00f1fe] text-black font-black text-[9px] px-4 rounded-lg hover:bg-white transition-all disabled:opacity-50"
                            >
                                {isSaving ? '...' : 'GRABAR POSE'}
                            </button>
                        </div>
                    </div>

                    {/* Botones de Selección Rápida de Articulación */}
                    <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/5 flex flex-wrap gap-1 justify-center">
                        {['head', 'spine', 'hips', 'shoulder_l', 'elbow_l', 'hand_l', 'shoulder_r', 'elbow_r', 'hand_r', 'knee_l', 'ankle_l', 'knee_r', 'ankle_r'].map(key => (
                            <button key={key} onClick={() => { setSelectedJoint(key); if (key.startsWith('hand')) setIkMode(true); else setIkMode(false); }}
                                className={`flex-shrink-0 px-2 py-1 rounded-lg border text-[7px] font-black uppercase tracking-widest transition-all ${selectedJoint === key ? 'border-[#00f1fe] bg-[#00f1fe]/10 text-[#00f1fe]' : 'border-white/5 text-white/20 hover:text-white/40'}`}>
                                {key.replace('shoulder', 'H').replace('elbow', 'C').replace('hand', 'M').replace('head', 'Cab').replace('spine', 'Pec').replace('hips', 'Cad').replace('knee', 'R').replace('ankle', 'T').replace('_l', 'I').replace('_r', 'D')}
                            </button>
                        ))}
                    </div>

                    {/* Inspector de Articulación (Individual) - Sliders de la articulación seleccionada */}
                    <div className="bg-white/[0.04] backdrop-blur-3xl rounded-3xl p-4 border border-white/10 flex flex-col gap-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-[#00f1fe] tracking-[0.2em]">
                                    {selectedJoint
                                        .replace('shoulder', 'Hombro').replace('elbow', 'Codo').replace('hand', 'Mano')
                                        .replace('head', 'Cabeza').replace('spine', 'Pecho').replace('hips', 'Cadera')
                                        .replace('knee', 'Rodilla').replace('ankle', 'Tobillo')
                                        .replace('_l', ' Izq').replace('_r', ' Der')}
                                </span>
                                <span className="text-[7px] text-white/30 uppercase font-bold">Ajuste Local</span>
                            </div>
                            <div className="flex gap-1.5">
                                <button onClick={() => setPoseData(p => ({ ...p, [selectedJoint]: [0, 0, 0] }))} className="text-[7px] font-black px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20">RESET ARTICULACIÓN</button>
                                <button onClick={() => setIkMode(!ikMode)} className={`text-[7px] font-black px-2 py-1 rounded border transition-all ${ikMode ? 'border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14]' : 'border-white/5 text-white/20'}`}>IK</button>
                            </div>
                        </div>

                        <div className="flex flex-col justify-around py-1">
                            <PoseSlider
                                label={selectedJoint.startsWith('elbow') ? "Flexión / Ángulo" : (selectedJoint.startsWith('shoulder') || selectedJoint.startsWith('hand')) ? "Rotación X / Roll (Giro)" : "Rotación X / Pitch (Adelante-Atrás)"}
                                value={poseData[selectedJoint]?.[0] || 0} min={JOINT_LIMITS[selectedJoint]?.x[0] || -10} max={JOINT_LIMITS[selectedJoint]?.x[1] || 10} color="#00f1fe"
                                onChange={v => setPoseData(p => {
                                    const current = p[selectedJoint] || [0, 0, 0];
                                    return { ...p, [selectedJoint]: [v, current[1], current[2]] };
                                })} />

                            {!selectedJoint.startsWith('elbow') && (
                                <>
                                    <PoseSlider label={(selectedJoint.startsWith('shoulder') || selectedJoint.startsWith('hand')) ? "Rotación Y / Yaw (Adelante-Atrás)" : "Rotación Y / Yaw (Giro Izq-Der)"} value={poseData[selectedJoint]?.[1] || 0} min={JOINT_LIMITS[selectedJoint]?.y[0] || -10} max={JOINT_LIMITS[selectedJoint]?.y[1] || 10} color="#00f1fe"
                                        onChange={v => setPoseData(p => {
                                            const current = p[selectedJoint] || [0, 0, 0];
                                            return { ...p, [selectedJoint]: [current[0], v, current[2]] };
                                        })} />
                                    <PoseSlider label={(selectedJoint.startsWith('shoulder') || selectedJoint.startsWith('hand')) ? "Rotación Z / Pitch (Arriba-Abajo)" : "Rotación Z / Roll (Inclinación)"} value={poseData[selectedJoint]?.[2] || 0} min={JOINT_LIMITS[selectedJoint]?.z[0] || -10} max={JOINT_LIMITS[selectedJoint]?.z[1] || 10} color="#00f1fe"
                                        onChange={v => setPoseData(p => {
                                            const current = p[selectedJoint] || [0, 0, 0];
                                            return { ...p, [selectedJoint]: [current[0], current[1], v] };
                                        })} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Biblioteca de Poses (contraíble) */}
                    <div className="bg-white/[0.05] rounded-2xl p-3 border border-white/10 flex flex-col gap-3 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-[#00f1fe] tracking-widest">Biblioteca de Poses</span>
                                <span className="text-[7px] text-white/30 font-bold uppercase">Poses Guardadas</span>
                            </div>
                            <span className="text-[6px] text-[#00f1fe] opacity-50 underline cursor-pointer" onClick={fetchPoses}>Refrescar</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[200px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#111] z-10">
                                    <tr className="border-b border-white/5">
                                        <th className="text-[6px] text-white/20 font-black uppercase py-1">Nombre</th>
                                        <th className="text-[6px] text-white/20 font-black uppercase py-1 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedPoses.length === 0 && (
                                        <tr>
                                            <td colSpan="2" className="py-4 text-center text-[8px] text-white/5 italic">Sin poses guardadas</td>
                                        </tr>
                                    )}
                                    {savedPoses.map(p => (
                                        <tr key={p._id} className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-all group ${p.isDefault ? 'bg-[#00f1fe]/5' : ''}`}>
                                            <td className="py-1.5">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-white/50 group-hover:text-white transition-all">
                                                        {p.name} {p.isDefault && <span className="text-[6px] text-[#00f1fe] ml-1">[DEFAULT]</span>}
                                                    </span>
                                                    <span className="text-[5px] text-white/10 uppercase">{new Date(p.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-1.5 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setPoseData(p.poseData);
                                                            // 🎨 Cargar pose temporalmente, NO sobrescribir avatar por defecto
                                                            console.log("📌 [AjustesPose] Pose cargada:", p.name);
                                                        }}
                                                        className="text-[6px] font-black px-1.5 py-0.5 rounded bg-white/5 text-white/40 hover:bg-[#00f1fe] hover:text-black transition-all"
                                                    >
                                                        LOAD
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdatePose(p.name, p.isDefault)}
                                                        className="text-[6px] font-black px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all"
                                                        title="Sobrescribir con pose actual"
                                                    >
                                                        REC
                                                    </button>
                                                    {!p.isDefault && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await iotApi.setDefaultPose(p._id);
                                                                    fetchPoses();
                                                                } catch (e) { console.error(e); }
                                                            }}
                                                            className="text-[6px] font-black px-1.5 py-0.5 rounded bg-[#39ff14]/10 text-[#39ff14] hover:bg-[#39ff14] hover:text-black transition-all"
                                                        >
                                                            DEF
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleDeletePose(p._id, e)}
                                                        className="text-[6px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                    >
                                                        DEL
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Tarjetas agrupadas por extremidad */}
                <div className="w-full flex flex-wrap gap-4 justify-center items-start py-6 bg-black/60 border-t border-white/5">
                    {/* EXTREMIDAD DERECHA */}
                    <div className="bg-white/5 rounded-xl p-4 min-w-[140px] flex flex-col items-center shadow-md">
                        <h4 className="text-xs font-black text-[#00f1fe] mb-2 uppercase tracking-widest">Extremidad Derecha</h4>
                        <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => { setSelectedJoint('shoulder_r'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'shoulder_r' ? 'border-[#00f1fe] bg-[#00f1fe]/10 text-[#00f1fe]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>HD</button>
                            <button onClick={() => { setSelectedJoint('elbow_r'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'elbow_r' ? 'border-[#00f1fe] bg-[#00f1fe]/10 text-[#00f1fe]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>CD</button>
                            <button onClick={() => { setSelectedJoint('hand_r'); setIkMode(true); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'hand_r' ? 'border-[#00f1fe] bg-[#00f1fe]/10 text-[#00f1fe]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>MD</button>
                        </div>
                    </div>
                    {/* EXTREMIDAD IZQUIERDA */}
                    <div className="bg-white/5 rounded-xl p-4 min-w-[140px] flex flex-col items-center shadow-md">
                        <h4 className="text-xs font-black text-[#d800ff] mb-2 uppercase tracking-widest">Extremidad Izquierda</h4>
                        <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => { setSelectedJoint('shoulder_l'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'shoulder_l' ? 'border-[#d800ff] bg-[#d800ff]/10 text-[#d800ff]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>HI</button>
                            <button onClick={() => { setSelectedJoint('elbow_l'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'elbow_l' ? 'border-[#d800ff] bg-[#d800ff]/10 text-[#d800ff]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>CI</button>
                            <button onClick={() => { setSelectedJoint('hand_l'); setIkMode(true); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'hand_l' ? 'border-[#d800ff] bg-[#d800ff]/10 text-[#d800ff]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>MI</button>
                        </div>
                    </div>
                    {/* PIERNA DERECHA */}
                    <div className="bg-white/5 rounded-xl p-4 min-w-[120px] flex flex-col items-center shadow-md">
                        <h4 className="text-xs font-black text-[#00f1fe] mb-2 uppercase tracking-widest">Pierna Derecha</h4>
                        <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => { setSelectedJoint('knee_r'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'knee_r' ? 'border-[#00f1fe] bg-[#00f1fe]/10 text-[#00f1fe]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>RD</button>
                            <button onClick={() => { setSelectedJoint('ankle_r'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'ankle_r' ? 'border-[#00f1fe] bg-[#00f1fe]/10 text-[#00f1fe]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>TD</button>
                        </div>
                    </div>
                    {/* PIERNA IZQUIERDA */}
                    <div className="bg-white/5 rounded-xl p-4 min-w-[120px] flex flex-col items-center shadow-md">
                        <h4 className="text-xs font-black text-[#d800ff] mb-2 uppercase tracking-widest">Pierna Izquierda</h4>
                        <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => { setSelectedJoint('knee_l'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'knee_l' ? 'border-[#d800ff] bg-[#d800ff]/10 text-[#d800ff]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>RI</button>
                            <button onClick={() => { setSelectedJoint('ankle_l'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'ankle_l' ? 'border-[#d800ff] bg-[#d800ff]/10 text-[#d800ff]' : 'border-white/10 text-white/40 hover:text-white/80'}`}>TI</button>
                        </div>
                    </div>
                    {/* TRONCO */}
                    <div className="bg-white/5 rounded-xl p-4 min-w-[120px] flex flex-col items-center shadow-md">
                        <h4 className="text-xs font-black text-white mb-2 uppercase tracking-widest">Tronco</h4>
                        <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => { setSelectedJoint('head'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'head' ? 'border-white bg-white/10 text-white' : 'border-white/10 text-white/40 hover:text-white/80'}`}>Cab</button>
                            <button onClick={() => { setSelectedJoint('spine'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'spine' ? 'border-white bg-white/10 text-white' : 'border-white/10 text-white/40 hover:text-white/80'}`}>Pec</button>
                            <button onClick={() => { setSelectedJoint('hips'); setIkMode(false); }}
                                className={`w-full px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedJoint === 'hips' ? 'border-white bg-white/10 text-white' : 'border-white/10 text-white/40 hover:text-white/80'}`}>Cad</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AjustesPose;