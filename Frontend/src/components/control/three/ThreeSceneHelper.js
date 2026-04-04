import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export class ThreeSceneHelper {
    constructor(container, options = {}) {
        this.container = container;
        this.swarmCount = options.swarmCount || 4;
        this.offsetDistance = options.offsetDistance || 1.2;
        this.droneColors = options.droneColors || [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00];
        this.masterColor = options.masterColor || 0xffffff;
        
        this.waypoints = [];
        this.curves = [];
        this.droneCurves = [];
        this.drones = [];
        this.homeBaseMarkers = {}; // { mac: Group }
        this.grid = null;

        this.trajectoryType = 'circular';
        this.trajParams = {};
        this.isSimulating = false;
        this.simSpeed = 1;
        this.simTime = 0;
        
        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(12, 12, 12);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 50);
        pointLight.position.set(5, 10, 5);
        this.scene.add(pointLight);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
            if (!event.value) this.updateTrajectories();
        });
        
        // Restricción de altura mínima (0.2m sobre el grid en Y=0)
        this.transformControls.addEventListener('change', () => {
            const object = this.transformControls.object;
            if (object) {
                const minY = 0.2; // Suelo estático en 0
                if (object.position.y < minY) {
                    object.position.y = minY;
                }
            }
        });

        if (this.transformControls.isObject3D || this.transformControls.type === 'TransformControls') {
            this.scene.add(this.transformControls);
        } else {
            console.warn("TransformControls is not an Object3D, skipping scene.add");
        }

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Initial Grid
        this.floorHeight = 0; // Siempre estática en 0
        this.altitude = 0;    // Altura base solicitada por el usuario
        this.updateGrid(20, 20);

        // Event Listeners
        this.onMouseDownBound = this.onMouseDown.bind(this);
        this.onResizeBound = this.onResize.bind(this);
        window.addEventListener('mousedown', this.onMouseDownBound);
        window.addEventListener('resize', this.onResizeBound);
    }

    updateHomeBases(basesMap, activeSlaves) {
        // IDs of active drones that should have a base
        const activeMacs = activeSlaves.map(d => d.mac_address || d.mac);

        // 1. Remove markers for drones not in active list or map
        Object.keys(this.homeBaseMarkers).forEach(mac => {
            if (!activeMacs.includes(mac) || !basesMap[mac]) {
                const group = this.homeBaseMarkers[mac];
                this.scene.remove(group);
                delete this.homeBaseMarkers[mac];
            }
        });

        // 2. Create/Update markers
        activeMacs.forEach((mac, idx) => {
            const base = basesMap[mac];
            if (!base) return;

            const color = this.droneColors[idx % this.droneColors.length];
            const pos = new THREE.Vector3(base.x, base.y, base.z);

            if (!this.homeBaseMarkers[mac]) {
                // Create new marker group (Sphere + Ring)
                const group = new THREE.Group();
                
                // Ground ring
                const ringGeom = new THREE.RingGeometry(0.2, 0.25, 32);
                const ringMat = new THREE.MeshBasicMaterial({ 
                    color: color, 
                    side: THREE.DoubleSide, 
                    transparent: true, 
                    opacity: 0.5 
                });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.rotation.x = Math.PI / 2;
                ring.position.y = 0.05; // Slightly above ground
                group.add(ring);

                // Central small sphere
                const sphereGeom = new THREE.SphereGeometry(0.1, 16, 16);
                const sphereMat = new THREE.MeshBasicMaterial({ color: color });
                const sphere = new THREE.Mesh(sphereGeom, sphereMat);
                group.add(sphere);

                this.scene.add(group);
                this.homeBaseMarkers[mac] = group;
            }

            // Update position
            this.homeBaseMarkers[mac].position.copy(pos);
            // Sync sphere color just in case
            this.homeBaseMarkers[mac].children.forEach(child => {
                if (child.material) child.material.color.set(color);
            });
        });

        this.updateTrajectories();
    }

    updateGrid(size, divisions) {
        if (this.grid) this.scene.remove(this.grid);
        if (this.altitudeScaleGroup) this.scene.remove(this.altitudeScaleGroup);
        if (this.groundScaleGroup) this.scene.remove(this.groundScaleGroup);
        
        // Grid Helper con colores más definidos
        this.grid = new THREE.GridHelper(size, divisions, 0xaaaaaa, 0x333333);
        this.grid.position.y = 0; 
        this.scene.add(this.grid);
        
        this.createAltitudeScale(size, divisions);
        this.createGroundScale(size, divisions);
    }
    
    createGroundScale(size, divisions) {
        if (this.groundScaleGroup) this.scene.remove(this.groundScaleGroup);
        this.groundScaleGroup = new THREE.Group();
        
        const step = size / divisions;
        const halfSize = size / 2;

        // Estilo común para etiquetas terrestres
        const labelParams = {
            fontsize: 24,
            textColor: { r: 180, g: 180, b: 180, a: 1.0 },
            backgroundColor: { r: 0, g: 0, b: 0, a: 0.0 }
        };

        for (let i = 0; i <= divisions; i++) {
            const val = -halfSize + i * step;
            if (val === 0) continue; // Saltar el origen para evitar solapamiento con ejes

            // Etiquetas en eje X
            const xLabel = this.makeTextSprite(`${val.toFixed(0)}m`, labelParams);
            xLabel.position.set(val, 0.1, 0.3); // Un poco desplazado del eje
            this.groundScaleGroup.add(xLabel);

            // Etiquetas en eje Z
            const zLabel = this.makeTextSprite(`${val.toFixed(0)}m`, labelParams);
            zLabel.position.set(0.3, 0.1, val);
            this.groundScaleGroup.add(zLabel);
        }

        this.scene.add(this.groundScaleGroup);
    }
    
    createAltitudeScale(size, divisions) {
        this.altitudeScaleGroup = new THREE.Group();
        const maxHeight = 10; // Dibujar escala hasta 10m
        const step = 1; // Marcas cada 1m
        
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });
        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, maxHeight, 0)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const yAxisLine = new THREE.Line(geometry, material);
        this.altitudeScaleGroup.add(yAxisLine);
        
        for (let i = step; i <= maxHeight; i += step) {
            // Pequeña marca horizontal central
            const markGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.2, i, 0),
                new THREE.Vector3(0.2, i, 0)
            ]);
            const mark = new THREE.Line(markGeo, material);
            this.altitudeScaleGroup.add(mark);
            
            // Etiqueta del número
            const label = this.makeTextSprite(`${i}m`, {
                fontsize: 28,
                textColor: { r: 0, g: 255, b: 0, a: 1.0 },
                backgroundColor: { r: 0, g: 0, b: 0, a: 0.0 } // Fondo transparente
            });
            label.position.set(0.6, i, 0); 
            this.altitudeScaleGroup.add(label);
        }
        
        this.scene.add(this.altitudeScaleGroup);
    }

    applyAltitudeShift(newAltitude) {
        const delta = newAltitude - this.altitude;
        this.altitude = newAltitude;

        this.waypoints.forEach(w => {
            w.position.y += delta;
            // Asegurar offset mínimo de 20cm desde el piso real (0)
            if (w.position.y < 0.2) w.position.y = 0.2;
        });
        this.updateTrajectories();
    }

    createWaypoints(points) {
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x555555, 
            transparent: true, 
            opacity: 0.5 
        });

        points.forEach((pos, index) => {
            const mesh = new THREE.Mesh(geometry, material);
            const adjustPos = pos.clone();
            // Asegurar offset mínimo de 20cm desde el piso real (0)
            if (adjustPos.y < 0.2) adjustPos.y = 0.2;
            
            mesh.position.copy(adjustPos);
            mesh.userData.index = index;
            this.scene.add(mesh);
            this.waypoints.push(mesh);
        });
    }

    createDrones() {
        // Inicialización temporal, updateSwarm lo sobreescribirá
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        for (let i = 0; i < this.swarmCount; i++) {
            const drone = new THREE.Mesh(
                geometry, 
                new THREE.MeshPhongMaterial({ 
                    color: this.droneColors[i] || 0xffffff, 
                    emissive: this.droneColors[i] || 0xffffff, 
                    emissiveIntensity: 0.5 
                })
            );
            
            // Etiqueta flotante
            const label = this.makeTextSprite(`SLAVE_0${i + 1}`, {
                fontsize: 32,
                textColor: { r: 255, g: 255, b: 255, a: 1.0 },
                backgroundColor: { r: 0, g: 0, b: 0, a: 0.5 }
            });
            label.position.set(0, 0.5, 0); // Offset arriba del drone
            drone.add(label);
            
            this.scene.add(drone);
            this.drones.push(drone);
        }
    }

    updateSwarm(devicesList) {
        if (!this.scene) return;
        
        const newCount = devicesList.length;
        this.swarmCount = newCount;

        // Limpiar drones anteriores
        if (this.drones) {
            this.drones.forEach(drone => {
                // Remover etiquetas si existen
                if(drone.children.length > 0) {
                    drone.children.forEach(c => drone.remove(c));
                }
                this.scene.remove(drone);
            });
        }
        this.drones = [];
        
        // Asegurar colores suficientes
        while (this.droneColors.length < newCount) {
            this.droneColors.push(Math.floor(Math.random() * 0xffffff));
        }

        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        for (let i = 0; i < this.swarmCount; i++) {
            const drone = new THREE.Mesh(
                geometry, 
                new THREE.MeshPhongMaterial({ 
                    color: this.droneColors[i], 
                    emissive: this.droneColors[i], 
                    emissiveIntensity: 0.5 
                })
            );
            // Guardar el id del dispositivo real para que updateTrajectories pueda consultarlo
            drone.userData = { 
                deviceId: devicesList[i]._id,
                mac: devicesList[i].mac_address || devicesList[i].mac 
            };
            
            const name = devicesList[i].name || devicesList[i].device_uid || `SLAVE_0${i + 1}`;
            const label = this.makeTextSprite(name, {
                fontsize: 32,
                textColor: { r: 255, g: 255, b: 255, a: 1.0 },
                backgroundColor: { r: 0, g: 0, b: 0, a: 0.5 }
            });
            label.position.set(0, 0.5, 0); 
            drone.add(label);
            
            this.scene.add(drone);
            this.drones.push(drone);
        }

        // Refrescar las curvas para coincidir con la nueva cantidad de drones
        this.updateTrajectories();
    }

    makeTextSprite(message, parameters) {
        if (parameters === undefined) parameters = {};
        const fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
        const fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
        const borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
        const backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r: 255, g: 255, b: 255, a: 1.0 };
        const textColor = parameters.hasOwnProperty("textColor") ? parameters["textColor"] : { r: 0, g: 0, b: 0, a: 1.0 };

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;
        const metrics = context.measureText(message);
        const textWidth = metrics.width;

        canvas.width = textWidth + borderThickness * 2;
        canvas.height = fontsize * 1.4 + borderThickness * 2;
        
        // Re-establecer fuente tras cambiar tamaño canvas
        context.font = "Bold " + fontsize + "px " + fontface;
        
        // Fondo
        context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
        context.strokeStyle = "rgba(255,255,255,0.8)";
        context.lineWidth = borderThickness;
        this.roundRect(context, borderThickness / 2, borderThickness / 2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);

        // Texto
        context.fillStyle = "rgba(" + textColor.r + "," + textColor.g + "," + textColor.b + "," + textColor.a + ")";
        context.fillText(message, borderThickness, fontsize + borderThickness);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.5 * (canvas.width / 64), 0.25 * (canvas.height / 32), 1.0);
        return sprite;
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    updateTrajectories() {
        if (!this.scene) return;
        
        // Cleanup old curves
        this.curves.forEach(curve => this.scene.remove(curve));
        this.curves = [];
        this.droneCurves = [];

        const points = this.waypoints.map(w => w.position);
        
        // Master Curve removed as per user request (only draw drone trajectories)

        // Drone Curves
        for (let i = 0; i < this.swarmCount; i++) {
            let offsetPoints = [];
            const phaseZ = this.trajParams.phaseZ || 0; // Desfase vertical acumulativo
            const phaseDist = this.trajParams.phaseDist !== undefined ? this.trajParams.phaseDist : this.offsetDistance;

            // Revisar si este dron tiene una altura constante asignada por el usuario (Override)
            const dronId = this.drones[i] && this.drones[i].userData && this.drones[i].userData.deviceId; 
            const mac = this.drones[i] && this.drones[i].userData && this.drones[i].userData.mac;
            // Para obtener el ID, necesitamos mapearlo. En updateSwarm definiremos el deviceId
            const overrideAltitude = dronId && this.trajParams.droneAltitudes && this.trajParams.droneAltitudes[dronId] !== undefined
                ? this.trajParams.droneAltitudes[dronId]
                : null;
            // La oscilación siempre está activa por defecto, a menos que esté desactivada explícitamente en la UI
            const applyOscillation = !(dronId && this.trajParams.droneOscillation && this.trajParams.droneOscillation[dronId] === false);

            // Offsets funcionales (Directional/Altitude D-Pad)
            const routeOffsets = this.trajParams.routeOffsets || { global: { x: 0, y: 0, z: 0 }, individual: {} };
            const gOff = routeOffsets.global;
            const iOff = (mac && routeOffsets.individual[mac]) ? routeOffsets.individual[mac] : { x: 0, y: 0, z: 0 };
            const totalOffsetX = gOff.x + iOff.x;
            const totalOffsetY = gOff.y + iOff.y;
            const totalOffsetZ = gOff.z + iOff.z;

            if (this.trajectoryType === 'circular' || this.trajectoryType === 'flower' || this.trajectoryType === 'spiral') {
                const baseRadius  = this.trajParams.radius     || 3;
                const zAmplitude  = this.trajParams.zAmplitude || 1;
                const baseAlt     = Math.max(0.5, this.altitude);
                const petals      = this.trajParams.petals || 2;
                const spread      = this.trajParams.relativeSpread || 0;
                const opposite    = this.trajParams.oppositeStart || false;
                const bases       = this.trajParams.bases || {};

                // Resolution controlled by Nº Puntos Curva slider [8-360]
                const numPoints   = Math.max(8, Math.min(360, this.trajParams.numPoints || 36));

                // 1. Calculate Center for this drone
                //    If spread > 0, distribute centers symmetrically around origin
                let center;
                if (spread > 0 && this.swarmCount > 0) {
                    const spreadAngle = (2 * Math.PI / this.swarmCount) * i;
                    center = new THREE.Vector3(
                        spread * Math.cos(spreadAngle),
                        0,
                        spread * Math.sin(spreadAngle)
                    );
                } else {
                    center = new THREE.Vector3(0, 0, 0);
                }

                // 2. Initial Phase Alignment: Start from current position if not simulating
                let startAngle = 0;
                if (!this.isSimulating && this.drones[i]) {
                    const dPos = this.drones[i].position.clone().sub(center);
                    startAngle = Math.atan2(dPos.z, dPos.x);
                } else {
                    startAngle = (Math.PI * 2 / Math.max(1, this.swarmCount)) * i;
                }

                // Apply 180 degree shift for odd indices if oppositeStart is true
                if (opposite && i % 2 === 1) {
                    startAngle += Math.PI;
                }

                const droneRadius = (this.trajectoryType === 'circular' || this.trajectoryType === 'spiral')
                    ? baseRadius + i * phaseDist * 0.5   
                    : baseRadius;                          

                for (let j = 0; j <= numPoints; j++) {
                    const theta = (j / numPoints) * Math.PI * 2;
                    let angle = theta + startAngle;
                    let x, z;

                    let normalizedHeight = 0; // used for spiral height tracking

                    if (this.trajectoryType === 'circular') {
                        x = center.x + droneRadius * Math.cos(angle);
                        z = center.z + droneRadius * Math.sin(angle);
                    } else if (this.trajectoryType === 'flower') {
                        // Polar rose: r = |a * cos(k * θ)| ensures r >= 0 → clean petals
                        // Each drone widens slightly via phaseDist scale
                        const scale = 1 + i * (phaseDist * 0.1);
                        const r = baseRadius * scale * Math.abs(Math.cos(petals * angle));
                        x = center.x + r * Math.cos(angle);
                        z = center.z + r * Math.sin(angle);
                    } else if (this.trajectoryType === 'spiral') {
                        // Conic Spiral: radius decreases with height
                        const turns = petals || 3;
                        const angleForSpiral = (j / numPoints) * Math.PI * 2 * turns + startAngle;
                        normalizedHeight = j / numPoints; // 0 (base, large radius) → 1 (tip, small radius)
                        const closingFactor = 1.0 - (normalizedHeight * 0.6); // Shrinks to 40% at top
                        const currentRadius = droneRadius * closingFactor;
                        
                        x = center.x + currentRadius * Math.cos(angleForSpiral);
                        z = center.z + currentRadius * Math.sin(angleForSpiral);
                    }

                    // Vertical altitude: base + per-drone phase offset (or individual override)
                    const centerAlt = overrideAltitude !== null
                        ? overrideAltitude
                        : baseAlt + (i * phaseZ);

                    // For spiral: altitude climbs linearly to form the inverted cone peak.
                    // For circular/flower: sinusoidal oscillation wave.
                    const hOffset = this.trajectoryType === 'spiral'
                        ? zAmplitude * normalizedHeight               // linear rise to peak height
                        : (applyOscillation ? zAmplitude * Math.sin(theta * 2) : 0);
                    
                    // Apply route offsets
                    x += totalOffsetX;
                    z += totalOffsetZ;
                    
                    const y = Math.max(0.2, centerAlt + hOffset + totalOffsetY);

                    offsetPoints.push(new THREE.Vector3(x, y, z));
                }

            } else if (points.length >= 2) {
                // Manual (puntos clicados) con offsets lineales paralelos
                const opposite = this.trajParams.oppositeStart || false;

                // For odd-indexed drones, reverse waypoint order when oppositeStart is on
                const sourcePoints = (opposite && i % 2 === 1) ? [...points].reverse() : points;

                offsetPoints = sourcePoints.map(p => {
                    const yOffset = overrideAltitude !== null ? 0 : (i * phaseZ);
                    const finalY = overrideAltitude !== null ? overrideAltitude : (p.y + yOffset);
                    
                    const offset = new THREE.Vector3(
                        (i - (this.swarmCount - 1) / 2) * phaseDist + totalOffsetX, 
                        totalOffsetY, 
                        totalOffsetZ
                    );
                    
                    const newP = p.clone().add(offset);
                    newP.y = Math.max(0.2, finalY + totalOffsetY);
                    return newP;
                });
            }

            if (offsetPoints.length >= 2) {
                const droneCurve = new THREE.CatmullRomCurve3(offsetPoints);
                droneCurve.closed = true;
                droneCurve.curveType = 'centripetal';
                
                // Dibuja la línea de estela de cada partícula con su color
                this.drawCurve(droneCurve, this.droneColors[i] || 0xffffff, 1.0);
                this.droneCurves.push(droneCurve);
                
                if (!this.isSimulating && this.drones[i]) {
                    this.drones[i].position.copy(offsetPoints[0]);
                }
            } else {
                this.droneCurves.push(null);
            }
        }
    }

    drawCurve(curve, color, opacity) {
        // Resolution: match numPoints from params (default 50 for manual, or the configured value)
        const resolution = Math.max(8, Math.min(360, this.trajParams.numPoints || 50));
        const curvePoints = curve.getPoints(resolution);
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            transparent: true, 
            opacity: opacity 
        });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.curves.push(line);
    }

    onMouseDown(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.waypoints);
        
        if (intersects.length > 0) {
            this.transformControls.attach(intersects[0].object);
        }
    }

    onResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    render() {
        this.controls.update();

        if (this.isSimulating) {
            this.simTime += 0.002 * this.simSpeed;
            if (this.simTime > 1.0) this.simTime -= 1.0;
            this.updateSimulationPositions();
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateSimulationPositions() {
        if (!this.droneCurves) return;
        for (let i = 0; i < this.swarmCount; i++) {
            if (this.droneCurves[i] && this.drones[i]) {
                const pt = this.droneCurves[i].getPoint(this.simTime);
                this.drones[i].position.copy(pt);
            }
        }
    }

    dispose() {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('mousedown', this.onMouseDownBound);
        window.removeEventListener('resize', this.onResizeBound);
        
        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        
        this.renderer.dispose();
        this.scene.clear();
    }

    resetWaypoints(defaults) {
        this.waypoints.forEach((w, i) => {
            if (defaults[i]) {
                const targetPos = defaults[i].clone();
                // En el reset, aplicamos la altitud actual solicitada
                targetPos.y += this.altitude;
                if (targetPos.y < 0.2) targetPos.y = 0.2;
                w.position.copy(targetPos);
            }
        });
        this.transformControls.detach();
        this.updateTrajectories();
    }

    /**
     * loadWaypoints — clears all existing waypoint meshes and creates
     * new ones from the given points array (any count).
     * Switches back to manual mode and redraws trajectory lines.
     * @param {THREE.Vector3[]} points
     */
    loadWaypoints(points) {
        // Remove old waypoint meshes from scene
        this.transformControls.detach();
        this.waypoints.forEach(w => this.scene.remove(w));
        this.waypoints = [];

        // Create new waypoints (applyAltitudeShift is NOT added here —
        // the saved points already carry absolute Y from the DB)
        const geometry = new THREE.SphereGeometry(0.1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x555555, 
            transparent: true, 
            opacity: 0.5 
        });
        points.forEach((pos, index) => {
            const mesh = new THREE.Mesh(geometry, material);
            const p = pos.clone();
            if (p.y < 0.2) p.y = 0.2;
            mesh.position.copy(p);
            mesh.userData.index = index;
            this.scene.add(mesh);
            this.waypoints.push(mesh);
        });

        // Switch to manual so updateTrajectories uses waypoint positions
        this.trajectoryType = 'manual';
        this.waypoints.forEach(w => (w.visible = true));
        this.updateTrajectories();
    }

    
    getWaypointPositions() {
        return this.waypoints.map(w => w.position.clone());
    }

    setTrajectoryType(type, params) {
        this.trajectoryType = type;
        this.trajParams = params || {};
        
        if (type === 'zigzag') {
            this.waypoints.forEach(w => w.visible = true);
            this.generateZigZag(this.trajParams);
        } else if (type === 'circular' || type === 'flower' || type === 'spiral') {
            this.waypoints.forEach(w => w.visible = false);
            this.transformControls.detach();
            this.updateTrajectories();
        } else {
            // manual
            this.waypoints.forEach(w => w.visible = false);
            if (this.waypoints.length < 2) {
                 this.resetWaypoints(this.getInitialWaypoints());
            } else {
                 this.updateTrajectories();
            }
        }
    }

    generateZigZag(params) {
        // Barrido de área lineal/zigzag
        const width = params.width || 8;
        const length = params.length || 8;
        const spacing = params.spacing || 2;
        const points = [];
        const numLines = Math.floor(length / spacing);
        const startZ = -length/2;
        const startX = -width/2;
        const baseAlt = Math.max(0.2, this.altitude);
        
        for (let i = 0; i <= numLines; i++) {
            const z = startZ + i * spacing;
            const x1 = (i % 2 === 0) ? startX : startX + width;
            const x2 = (i % 2 === 0) ? startX + width : startX;
            points.push(new THREE.Vector3(x1, baseAlt, z));
            points.push(new THREE.Vector3(x2, baseAlt, z));
        }
        
        this.waypoints.forEach(w => this.scene.remove(w));
        this.waypoints = [];
        this.createWaypoints(points);
        this.updateTrajectories();
    }

    toggleSimulation(isSimulating, speed) {
        this.isSimulating = isSimulating;
        this.simSpeed = speed || 1;
        if (!isSimulating) {
            this.simTime = 0;
            this.updateTrajectories(); // Reset drones to start
        }
    }

    getDroneTrajectories() {
        if (!this.droneCurves || this.droneCurves.length === 0) this.updateTrajectories();
        const trajectories = [];
        const resolution = this.trajParams.numPoints || 64;
        for (let i = 0; i < this.swarmCount; i++) {
            if (this.droneCurves[i]) {
                const points = this.droneCurves[i].getPoints(resolution);
                trajectories.push(points);
            } else {
                trajectories.push([]);
            }
        }
        return trajectories;
    }
}
