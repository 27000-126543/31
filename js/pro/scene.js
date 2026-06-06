const FactoryScene = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    container: null,
    clock: new THREE.Clock(),

    equipmentMap: {},
    personnelGroup: null,
    effects: [],
    onClick: null,
    currentState: null,
    loadingEl: null,
    _modelsLoaded: false,
    _equipmentBuilt: false,
    _dangerZonesBuilt: false,
    _modelProtos: null,

    init(containerId) {
        this.container = document.getElementById(containerId);
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0e17, 80, 250);

        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
        this.camera.position.set(60, 55, 80);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x0a0e17);
        this.container.appendChild(this.renderer.domElement);

        this._showLoading();

        this._setupLights();
        this._buildGround();
        this._buildGrid();

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 15;
        this.controls.maxDistance = 200;
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.target.set(10, 0, 0);

        this._setupInteraction();

        window.addEventListener('resize', () => this._onResize());

        this._animate();

        this._loadAllModels();
    },

    _showLoading() {
        this.loadingEl = document.createElement('div');
        this.loadingEl.style.cssText = [
            'position:absolute',
            'top:50%',
            'left:50%',
            'transform:translate(-50%,-50%)',
            'color:#00d4ff',
            'font-family:"PingFang SC",sans-serif',
            'font-size:20px',
            'text-align:center',
            'z-index:1000',
            'background:rgba(10,14,23,0.9)',
            'padding:30px 50px',
            'border:2px solid #00d4ff',
            'border-radius:12px',
            'box-shadow:0 0 30px rgba(0,212,255,0.4)'
        ].join(';');
        this.loadingEl.innerHTML = '🏭<br/>3D模型加载中...<br/><span style="font-size:13px;color:#667">正在初始化工业场景</span>';
        this.container.style.position = 'relative';
        this.container.appendChild(this.loadingEl);
    },

    _hideLoading() {
        if (this.loadingEl) {
            this.loadingEl.remove();
            this.loadingEl = null;
        }
    },

    _setupLights() {
        const amb = new THREE.AmbientLight(0x405566, 0.6);
        this.scene.add(amb);

        const dir = new THREE.DirectionalLight(0xffffff, 0.85);
        dir.position.set(40, 70, 50);
        dir.castShadow = true;
        dir.shadow.mapSize.set(2048, 2048);
        dir.shadow.camera.left = -80;
        dir.shadow.camera.right = 80;
        dir.shadow.camera.top = 80;
        dir.shadow.camera.bottom = -80;
        dir.shadow.camera.near = 0.5;
        dir.shadow.camera.far = 200;
        this.scene.add(dir);

        const hemi = new THREE.HemisphereLight(0x6080a0, 0x0a0e17, 0.35);
        this.scene.add(hemi);

        [
            { pos: [-30, 15, 0], color: 0x00aaff, intensity: 0.4 },
            { pos: [40, 15, -20], color: 0x00aaff, intensity: 0.4 },
            { pos: [20, 15, 30], color: 0xff8800, intensity: 0.5 }
        ].forEach(l => {
            const pt = new THREE.PointLight(l.color, l.intensity, 50);
            pt.position.set(...l.pos);
            this.scene.add(pt);
        });
    },

    _buildGround() {
        const groundGeo = new THREE.PlaneGeometry(300, 300);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x1a1f2e, roughness: 0.95, metalness: 0.05
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x2a3040, roughness: 0.9
        });
        [-25, 25].forEach(x => {
            const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 250), roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.01, 0);
            road.receiveShadow = true;
            this.scene.add(road);
        });
    },

    _buildGrid() {
        const grid = new THREE.GridHelper(200, 80, 0x00d4ff, 0x00d4ff);
        grid.material.opacity = 0.06;
        grid.material.transparent = true;
        grid.position.y = 0.02;
        this.scene.add(grid);
    },

    _makeLabel(text, color = '#00d4ff', fontSize = 48) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 96;
        ctx.font = 'bold ' + fontSize + 'px "PingFang SC", sans-serif';
        const metrics = ctx.measureText(text);
        const textW = metrics.width + 40;
        canvas.width = Math.max(256, textW);
        ctx.font = 'bold ' + fontSize + 'px "PingFang SC", sans-serif';
        ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
        const pad = 8;
        const r = 16;
        ctx.beginPath();
        ctx.moveTo(r, pad);
        ctx.lineTo(canvas.width - r, pad);
        ctx.quadraticCurveTo(canvas.width - pad, pad, canvas.width - pad, r);
        ctx.lineTo(canvas.width - pad, canvas.height - r);
        ctx.quadraticCurveTo(canvas.width - pad, canvas.height - pad, canvas.width - r, canvas.height - pad);
        ctx.lineTo(r, canvas.height - pad);
        ctx.quadraticCurveTo(pad, canvas.height - pad, pad, canvas.height - r);
        ctx.lineTo(pad, r);
        ctx.quadraticCurveTo(pad, pad, r, pad);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 8;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(canvas.width / 80, canvas.height / 80, 1);
        sprite.renderOrder = 999;
        return sprite;
    },

    _addLabel(group, text, yOffset, color) {
        const label = this._makeLabel(text, color);
        label.position.y = yOffset;
        group.add(label);
        group.userData.labelSprite = label;
        return label;
    },

    _addWarningGlow(group, geometry, position, color) {
        const glow = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.BackSide })
        );
        if (position) glow.position.copy(position);
        glow.visible = false;
        glow.userData.type = 'warningGlow';
        group.add(glow);
        this.effects.push(glow);
        group.userData.warningGlow = glow;
        return glow;
    },

    _loadModel(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.ObjectLoader();
            loader.load(
                url,
                (obj) => resolve(obj),
                undefined,
                (err) => reject(err)
            );
        });
    },

    _getBBoxHeight(obj) {
        const bbox = new THREE.Box3().setFromObject(obj);
        return bbox.max.y - bbox.min.y;
    },

    _centerModelY(obj) {
        const bbox = new THREE.Box3().setFromObject(obj);
        const offset = -bbox.min.y;
        obj.position.y += offset;
    },

    _findHelmetMesh(obj) {
        let helmet = null;
        const targetColor = new THREE.Color(0xf59e0b);
        obj.traverse((child) => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of mats) {
                    if (mat.color !== undefined && mat.color !== null) {
                        let mc;
                        if (mat.color.isColor) mc = mat.color;
                        else if (typeof mat.color === 'number') mc = new THREE.Color(mat.color);
                        else if (typeof mat.color === 'string') mc = new THREE.Color(mat.color);
                        else continue;
                        try {
                            const d = mc.distanceTo(targetColor);
                            if (d < 0.6) {
                                helmet = child;
                                break;
                            }
                        } catch (e) {}
                    }
                }
                if (helmet) return;
            }
        });
        return helmet;
    },

    async _loadAllModels() {
        try {
            const modelUrls = {
                blastFurnace: '/models/blast_furnace.json',
                converter: '/models/converter.json',
                rollingMill: '/models/rolling_mill.json',
                caster: '/models/caster.json',
                stack: '/models/stack.json',
                reclaimer: '/models/reclaimer.json',
                worker: '/models/worker.json'
            };

            const keys = ['blastFurnace', 'converter', 'rollingMill', 'caster', 'stack', 'reclaimer', 'worker'];
            const protoMap = { blastFurnace: 'bfProto', converter: 'convProto', rollingMill: 'rmProto', caster: 'castProto', stack: 'stackProto', reclaimer: 'reclaimProto', worker: 'workerProto' };
            const urls = keys.map(k => modelUrls[k]);

            const results = await Promise.allSettled(urls.map(u => this._loadModel(u)));
            this._modelProtos = {};
            let successCount = 0;
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') {
                    this._modelProtos[protoMap[keys[i]]] = r.value;
                    successCount++;
                } else {
                    console.warn('[Scene] 模型加载失败 ' + keys[i] + ':', r.reason);
                }
            });
            console.log('[Scene] 模型加载完成: ' + successCount + '/' + keys.length);

            if (successCount === 0) {
                throw new Error('所有3D模型加载失败');
            }
            this._modelsLoaded = true;

            if (this.currentState && !this._equipmentBuilt) {
                this._buildAllFromProtos();
            }

            this._hideLoading();

            if (this.currentState && this._equipmentBuilt) {
                this._updateEquipment(this.currentState);
            }
        } catch (err) {
            console.error('模型加载失败:', err);
            if (this.loadingEl) {
                this.loadingEl.innerHTML = '⚠️ 模型加载失败<br/><span style="font-size:13px;color:#f66">' + err.message + '</span>';
            }
        }
    },

    _buildAllFromProtos() {
        if (!this._modelProtos || !this.currentState || this._equipmentBuilt) return;
        const p = this._modelProtos;

        this._buildBlastFurnaces(p.bfProto);
        this._buildConverters(p.convProto);
        this._buildRollingMills(p.rmProto);
        this._buildCasters(p.castProto);
        this._buildStacks(p.stackProto);
        this._buildReclaimers(p.reclaimProto);
        this._buildPersonnel(p.workerProto);

        this._buildWarehouse();
        this._buildControlRoom();

        if (this.currentState.dangerZones) {
            this.currentState.dangerZones.forEach(dz => this._buildDangerZone(dz));
            this._dangerZonesBuilt = true;
        }

        this._equipmentBuilt = true;
    },

    _buildBlastFurnaces(proto) {
        if (!this.currentState || !proto) return;
        const positions = [[-25, 0, -15], [0, 0, -15], [25, 0, -15]];
        this.currentState.blastFurnaces.forEach((bf, i) => {
            const group = proto.clone(true);
            const [px, py, pz] = positions[i];
            group.position.set(px, py, pz);
            this._centerModelY(group);
            group.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    if (o.material && o.material.emissive !== undefined) {
                        o.userData.origEmissive = o.material.emissive ? o.material.emissive.getHex() : 0;
                        o.userData.origEmissiveIntensity = o.material.emissiveIntensity || 0;
                    }
                }
            });
            group.userData.type = 'blastFurnace';
            group.userData.data = bf;
            group.userData.id = bf.id;
            group.userData.name = bf.name;
            group.userData.baseColor = 0x3a3a3a;

            const h = this._getBBoxHeight(group);
            this._addLabel(group, bf.name, h + 4);

            const topCenter = new THREE.Vector3();
            const bbox = new THREE.Box3().setFromObject(group);
            topCenter.set((bbox.min.x + bbox.max.x) / 2, bbox.max.y, (bbox.min.z + bbox.max.z) / 2);
            group.worldToLocal(topCenter);
            this._addSmokeEffect(group, topCenter.x, topCenter.y + 2, topCenter.z);

            const flameGroup = new THREE.Group();
            const midY = (bbox.min.y + bbox.max.y) * 0.25;
            flameGroup.position.y = midY;
            flameGroup.visible = false;
            group.add(flameGroup);
            group.userData.flameGroup = flameGroup;
            this._buildFlame(flameGroup, 2.5);

            this.scene.add(group);
            this.equipmentMap[bf.id] = group;
        });
    },

    _buildConverters(proto) {
        if (!this.currentState || !proto) return;
        const positions = [[30, 0, -5], [30, 0, 15]];
        this.currentState.converters.forEach((c, i) => {
            const group = proto.clone(true);
            const [px, py, pz] = positions[i];
            group.position.set(px, py, pz);
            this._centerModelY(group);
            group.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    if (o.material && o.material.emissive !== undefined) {
                        o.userData.origEmissive = o.material.emissive ? o.material.emissive.getHex() : 0;
                        o.userData.origEmissiveIntensity = o.material.emissiveIntensity || 0;
                        o.userData.origColor = o.material.color ? o.material.color.getHex() : 0;
                    }
                }
            });
            group.userData.type = 'converter';
            group.userData.data = c;
            group.userData.id = c.id;
            group.userData.name = c.name;
            group.userData.baseColor = 0x553322;
            group.userData.shell = group;

            const h = this._getBBoxHeight(group);
            this._addLabel(group, c.name, h + 3);

            const bbox = new THREE.Box3().setFromObject(group);
            const topCenter = new THREE.Vector3((bbox.min.x + bbox.max.x) / 2, bbox.max.y, (bbox.min.z + bbox.max.z) / 2);
            group.worldToLocal(topCenter);
            this._addFlameOnTop(group, topCenter.x, topCenter.y, topCenter.z, c.flameColor);

            const bubbleGroup = new THREE.Group();
            bubbleGroup.position.y = (bbox.min.y + bbox.max.y) * 0.3;
            bubbleGroup.visible = false;
            group.add(bubbleGroup);
            group.userData.bubbleGroup = bubbleGroup;
            this._buildBubbles(bubbleGroup, 3.5);

            this.scene.add(group);
            this.equipmentMap[c.id] = group;
        });
    },

    _buildRollingMills(proto) {
        if (!this.currentState || !proto) return;
        const positions = [[-25, 0, 20], [0, 0, 20]];
        this.currentState.rollingMills.forEach((rm, i) => {
            const group = proto.clone(true);
            const [px, py, pz] = positions[i];
            group.position.set(px, py, pz);
            this._centerModelY(group);
            group.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    if (o.geometry && (o.geometry.type === 'CylinderGeometry' || o.geometry.type === 'CylinderBufferGeometry')) {
                        o.userData.type = 'workRoll';
                        this.effects.push(o);
                    }
                }
            });
            group.userData.type = 'rollingMill';
            group.userData.data = rm;
            group.userData.id = rm.id;
            group.userData.name = rm.name;

            const h = this._getBBoxHeight(group);
            const labelColor = rm.lineType === 'CSP' ? '#00d4ff' : '#ff9933';
            this._addLabel(group, rm.name, h + 2, labelColor);

            const bbox = new THREE.Box3().setFromObject(group);
            const sz = new THREE.Vector3();
            bbox.getSize(sz);
            this._addWarningGlow(group,
                new THREE.BoxGeometry(sz.x + 4, sz.y + 4, sz.z + 4),
                new THREE.Vector3(0, sz.y / 2, 0),
                0xff6600
            );

            this.scene.add(group);
            this.equipmentMap[rm.id] = group;
        });
    },

    _buildCasters(proto) {
        if (!this.currentState || !proto) return;
        const positions = [[10, 0, 5], [10, 0, -8]];
        this.currentState.casters.forEach((ct, i) => {
            const group = proto.clone(true);
            const [px, py, pz] = positions[i];
            group.position.set(px, py, pz);
            this._centerModelY(group);
            group.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    if (o.geometry && (o.geometry.type === 'CylinderGeometry' || o.geometry.type === 'CylinderBufferGeometry')) {
                        const gh = o.geometry.parameters ? o.geometry.parameters.height : 0;
                        if (gh > 1.5) {
                            o.userData.type = 'roller';
                            this.effects.push(o);
                        }
                    }
                }
            });
            group.userData.type = 'caster';
            group.userData.data = ct;
            group.userData.id = ct.id;
            group.userData.name = ct.name;

            const h = this._getBBoxHeight(group);
            this._addLabel(group, ct.name, h + 2);

            const bbox = new THREE.Box3().setFromObject(group);
            const sz = new THREE.Vector3();
            bbox.getSize(sz);
            this._addWarningGlow(group,
                new THREE.BoxGeometry(sz.x + 4, sz.y + 4, sz.z + 4),
                new THREE.Vector3(0, sz.y / 2, 0),
                0xff0000
            );

            this.scene.add(group);
            this.equipmentMap[ct.id] = group;
        });
    },

    _buildStacks(proto) {
        if (!this.currentState || !proto) return;
        const positions = [[-10, 0, -30], [10, 0, -30]];
        this.currentState.stacks.forEach((st, i) => {
            const group = proto.clone(true);
            const [px, py, pz] = positions[i];
            group.position.set(px, py, pz);
            this._centerModelY(group);
            group.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    if (o.geometry && (o.geometry.type === 'TorusGeometry' || o.geometry.type === 'TorusBufferGeometry')) {
                        group.userData.warningBand = o;
                        if (o.material.emissive !== undefined) {
                            o.material.emissiveIntensity = 0;
                        }
                    }
                }
            });
            group.userData.type = 'stack';
            group.userData.data = st;
            group.userData.id = st.id;
            group.userData.name = st.name;

            const h = this._getBBoxHeight(group);
            this._addLabel(group, st.name, h + 3);

            const bbox = new THREE.Box3().setFromObject(group);
            const sz = new THREE.Vector3();
            bbox.getSize(sz);
            this._addWarningGlow(group,
                new THREE.CylinderGeometry(sz.x * 0.8, sz.x * 0.8, sz.y + 4, 24),
                new THREE.Vector3(0, sz.y / 2, 0),
                0xff0000
            );

            const topCenter = new THREE.Vector3(0, bbox.max.y, 0);
            group.worldToLocal(topCenter);
            this._addSmokeEffect(group, topCenter.x, topCenter.y + 1, topCenter.z);

            this.scene.add(group);
            this.equipmentMap[st.id] = group;
        });
    },

    _buildReclaimers(proto) {
        if (!this.currentState || !proto) return;
        const positions = [[-35, 0, 0], [-35, 0, 12], [-35, 0, -12]];
        const rawData = this.currentState.rawYard || [];
        positions.forEach((pos, i) => {
            const group = proto.clone(true);
            const [px, py, pz] = pos;
            group.position.set(px, py, pz);
            this._centerModelY(group);
            group.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                }
            });
            const pile = rawData[i];
            const data = pile || { id: 'reclaim_' + i, name: '取料机' + (i + 1) };
            group.userData.type = 'rawPile';
            group.userData.data = data;
            group.userData.id = data.id;
            group.userData.name = data.name;

            const h = this._getBBoxHeight(group);
            const labelText = pile ? pile.name + ': ' + Math.floor(pile.stock) + 't' : '取料机' + (i + 1);
            const labelColor = pile && pile.lowStock ? '#ff9900' : '#00d4ff';
            this._addLabel(group, labelText, h + 2, labelColor);

            const bbox = new THREE.Box3().setFromObject(group);
            const sz = new THREE.Vector3();
            bbox.getSize(sz);
            this._addWarningGlow(group,
                new THREE.BoxGeometry(sz.x + 4, sz.y + 4, sz.z + 4),
                new THREE.Vector3(0, sz.y / 2, 0),
                0xff8800
            );

            this.scene.add(group);
            this.equipmentMap[data.id] = group;
        });
    },

    _buildPersonnel(proto) {
        if (!this.currentState || !proto) return;
        this.personnelGroup = {};
        this.currentState.personnel.forEach(p => {
            const group = proto.clone(true);
            group.position.set(p.x, 0, p.z);
            this._centerModelY(group);
            group.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                    if (o.material) {
                        o.userData.origColor = o.material.color ? o.material.color.getHex() : 0;
                    }
                }
            });
            group.userData.type = 'personnel';
            group.userData.data = p;
            group.userData.id = p.id;
            group.userData.name = p.name;

            const helmet = this._findHelmetMesh(group);
            if (helmet) {
                group.userData.helmet = helmet;
                group.userData.helmetMesh = helmet;
                if (helmet.material.color !== undefined && helmet.material.color !== null && !helmet.material.color.isColor) {
                    if (typeof helmet.material.color === 'number' || typeof helmet.material.color === 'string') {
                        helmet.material.color = new THREE.Color(helmet.material.color);
                    }
                }
                if (helmet.material.emissive !== undefined) {
                    if (!helmet.material.emissive || !helmet.material.emissive.isColor) {
                        if (typeof helmet.material.emissive === 'number' || typeof helmet.material.emissive === 'string') {
                            helmet.material.emissive = new THREE.Color(helmet.material.emissive);
                        } else {
                            helmet.material.emissive = new THREE.Color(0);
                        }
                    }
                    helmet.userData.origEmissive = helmet.material.emissive.getHex();
                    if (helmet.material.emissiveIntensity === undefined) helmet.material.emissiveIntensity = 0;
                }
            }

            const h = this._getBBoxHeight(group);
            const labelColor = p.inDanger ? '#ff0000' : '#10b981';
            const label = this._makeLabel(p.name + ' | ' + p.role, labelColor, 42);
            label.position.y = h + 1;
            group.add(label);
            group.userData.label = label;
            group.userData.labelSprite = label;

            const warningGlow = new THREE.Mesh(
                new THREE.SphereGeometry(1.5, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.BackSide })
            );
            warningGlow.position.y = h / 2;
            warningGlow.visible = false;
            warningGlow.userData.type = 'warningGlow';
            group.add(warningGlow);
            this.effects.push(warningGlow);
            group.userData.warningGlow = warningGlow;

            this.scene.add(group);
            this.personnelGroup[p.id] = group;
        });
    },

    _buildFlame(parent, size = 2) {
        const count = 50;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const sizes = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * size * 0.4;
            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = Math.random() * size * 0.3;
            positions[i * 3 + 2] = Math.sin(a) * r;
            velocities.push({
                x: (Math.random() - 0.5) * 0.05,
                y: 0.08 + Math.random() * 0.12,
                z: (Math.random() - 0.5) * 0.05,
                life: 1
            });
            sizes[i] = size * 0.4 + Math.random() * size * 0.4;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const mat = new THREE.PointsMaterial({
            color: 0xffaa00, size: size * 0.6, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        const pts = new THREE.Points(geo, mat);
        pts.userData.velocities = velocities;
        pts.userData.type = 'flame';
        parent.add(pts);
        this.effects.push(pts);

        const core = new THREE.Mesh(
            new THREE.SphereGeometry(size * 0.6, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.8 })
        );
        core.userData.type = 'flameCore';
        parent.add(core);
        this.effects.push(core);
    },

    _addFlameOnTop(parent, x, y, z, colorHex) {
        const flameGroup = new THREE.Group();
        flameGroup.position.set(x, y, z);
        parent.add(flameGroup);
        parent.userData.topFlame = flameGroup;

        const flameMat = new THREE.MeshBasicMaterial({
            color: colorHex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
        });
        for (let i = 0; i < 8; i++) {
            const h = 2 + Math.random() * 3;
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.8 + Math.random() * 0.6, h, 8),
                flameMat.clone()
            );
            cone.position.set(
                (Math.random() - 0.5) * 2,
                h / 2,
                (Math.random() - 0.5) * 2
            );
            cone.userData.baseH = h;
            cone.userData.offset = Math.random() * Math.PI * 2;
            cone.userData.type = 'flameCone';
            flameGroup.add(cone);
            this.effects.push(cone);
        }

        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(2, 16, 16),
            new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending })
        );
        glow.userData.type = 'flameGlow';
        flameGroup.add(glow);
        this.effects.push(glow);
    },

    _buildBubbles(parent, size = 2) {
        const count = 25;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const sizes = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * size;
            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = Math.random() * size * 0.5;
            positions[i * 3 + 2] = Math.sin(a) * r;
            velocities.push({
                x: (Math.random() - 0.5) * 0.03,
                y: 0.06 + Math.random() * 0.1,
                z: (Math.random() - 0.5) * 0.03,
                baseR: r, angle: a, speed: 0.02 + Math.random() * 0.03
            });
            sizes[i] = 0.15 + Math.random() * 0.25;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x88ccff, size: 0.3, transparent: true, opacity: 0.75,
            blending: THREE.AdditiveBlending, sizeAttenuation: true, depthWrite: false
        });
        const pts = new THREE.Points(geo, mat);
        pts.userData = { velocities, count, size };
        pts.userData.type = 'bubbles';
        parent.add(pts);
        this.effects.push(pts);
    },

    _addSmokeEffect(parent, x, y, z) {
        const smokeGroup = new THREE.Group();
        smokeGroup.position.set(x, y, z);
        parent.add(smokeGroup);

        for (let i = 0; i < 15; i++) {
            const s = 0.6 + Math.random() * 0.4;
            const mat = new THREE.MeshBasicMaterial({
                color: 0x888888, transparent: true, opacity: 0,
                depthWrite: false, blending: THREE.NormalBlending
            });
            const sph = new THREE.Mesh(new THREE.SphereGeometry(s * 1.2, 8, 8), mat);
            sph.userData = {
                baseScale: s, speed: 0.015 + Math.random() * 0.02,
                life: 0, phase: Math.random()
            };
            sph.userData.type = 'smoke';
            smokeGroup.add(sph);
            this.effects.push(sph);
        }
        parent.userData.smoke = smokeGroup;
    },

    _buildDangerZone(dz) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(dz.radius - 0.3, dz.radius, 48),
            new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(dz.x, 0.05, dz.z);
        ring.userData.type = 'dangerRing';
        this.scene.add(ring);
        this.effects.push(ring);

        const label = this._makeLabel('⚠ ' + dz.name, '#ff3300', 40);
        label.position.set(dz.x, dz.radius * 0.4, dz.z);
        this.scene.add(label);
    },

    _buildWarehouse() {
        const group = new THREE.Group();
        group.position.set(50, 0, -15);

        const frame = new THREE.Mesh(
            new THREE.BoxGeometry(24, 10, 16),
            new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.5, roughness: 0.5, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
        );
        frame.position.y = 5;
        group.add(frame);

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const coil = new THREE.Mesh(
                    new THREE.CylinderGeometry(2, 2, 2.8, 24),
                    new THREE.MeshStandardMaterial({
                        color: new THREE.Color().setHSL(0.08 + i * 0.02, 0.3 + j * 0.1, 0.35 + j * 0.05),
                        metalness: 0.7, roughness: 0.4
                    })
                );
                coil.rotation.z = Math.PI / 2;
                coil.position.set(-8 + i * 8, 3 + j * 3, 0);
                coil.castShadow = true;
                group.add(coil);
            }
        }

        const label = this._makeLabel('成品库');
        label.position.y = 12;
        group.add(label);

        this.scene.add(group);
    },

    _buildControlRoom() {
        const group = new THREE.Group();
        group.position.set(50, 0, 25);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(20, 8, 14),
            new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.4, roughness: 0.55 })
        );
        base.position.y = 4;
        base.castShadow = base.receiveShadow = true;
        group.add(base);

        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(21, 0.8, 15),
            new THREE.MeshStandardMaterial({ color: 0x2244aa, metalness: 0.5, roughness: 0.4 })
        );
        roof.position.y = 8.4;
        group.add(roof);

        for (let i = 0; i < 5; i++) {
            const win = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 2.2, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x001122, emissive: 0x00aaff, emissiveIntensity: 0.6 })
            );
            win.position.set(-8 + i * 4, 5.5, 7.1);
            group.add(win);
        }

        const label = this._makeLabel('中央控制室', '#10b981');
        label.position.y = 11;
        group.add(label);

        this.scene.add(group);
    },

    setState(state) {
        if (!this.currentState) {
            this.currentState = state;
            if (this._modelsLoaded && !this._equipmentBuilt) {
                this._buildAllFromProtos();
                this._updateEquipment(state);
            }
        } else {
            this.currentState = state;
            if (this._equipmentBuilt) {
                this._updateEquipment(state);
            }
        }
    },

    _updateEquipment(state) {
        if (!this._modelsLoaded) return;

        if (state.dangerZones && state.dangerZones.length > 0 && !this._dangerZonesBuilt) {
            state.dangerZones.forEach(dz => this._buildDangerZone(dz));
            this._dangerZonesBuilt = true;
        }

        state.blastFurnaces.forEach(bf => {
            const g = this.equipmentMap[bf.id];
            if (!g) return;
            if (g.userData.flameGroup) g.userData.flameGroup.visible = bf.hotMetalTemp < 1480;
        });

        state.converters.forEach(c => {
            const g = this.equipmentMap[c.id];
            if (!g) return;
            if (g.userData.bubbleGroup) g.userData.bubbleGroup.visible = c.argonActive;
            if (g.userData.topFlame) {
                g.userData.topFlame.children.forEach(child => {
                    if (child.material && child.material.color) {
                        child.material.color.setHex(c.flameColor);
                    }
                });
            }
            const overHeat = c.temp > 1700;
            g.traverse(o => {
                if (o.isMesh && o.material && o.material.color) {
                    const hex = o.material.color.getHex();
                    if (hex !== 0xffff88 && hex !== c.flameColor) {
                        if (overHeat) {
                            if (!o.userData.origColor) o.userData.origColor = hex;
                            o.material.color.lerp(new THREE.Color(0xff0000), 0.6);
                            if (o.material.emissive) {
                                o.material.emissive.setHex(0xff2200);
                                o.material.emissiveIntensity = 0.35;
                            }
                        } else if (o.userData.origColor) {
                            o.material.color.setHex(o.userData.origColor);
                            if (o.material.emissive) {
                                o.material.emissive.setHex(o.userData.origEmissive || 0);
                                o.material.emissiveIntensity = o.userData.origEmissiveIntensity || 0;
                            }
                        }
                    }
                }
            });
        });

        state.casters.forEach(ct => {
            const g = this.equipmentMap[ct.id];
            if (!g || !g.userData.warningGlow) return;
            const danger = ct.levelVariation > 3;
            g.userData.warningGlow.visible = danger;
            if (danger) {
                g.userData.warningGlow.material.opacity = 0.12 + Math.sin(Date.now() / 150) * 0.08;
            }
        });

        state.rollingMills.forEach(rm => {
            const g = this.equipmentMap[rm.id];
            if (!g || !g.userData.warningGlow) return;
            const danger = Math.abs(rm.thicknessDeviation) > 0.1;
            g.userData.warningGlow.visible = danger;
            if (danger) {
                g.userData.warningGlow.material.opacity = 0.1 + Math.sin(Date.now() / 180) * 0.07;
            }
        });

        const rawPiles = state.rawYard || [];
        rawPiles.forEach(pile => {
            const g = this.equipmentMap[pile.id];
            if (!g || !g.userData.warningGlow) return;
            g.userData.warningGlow.visible = pile.lowStock;
            if (pile.lowStock) {
                g.userData.warningGlow.material.opacity = 0.1 + Math.sin(Date.now() / 200) * 0.07;
            }
        });

        state.stacks.forEach(st => {
            const g = this.equipmentMap[st.id];
            if (!g) return;
            if (g.userData.warningGlow) {
                g.userData.warningGlow.visible = st.overLimit;
                if (st.overLimit) {
                    g.userData.warningGlow.material.opacity = 0.12 + Math.sin(Date.now() / 160) * 0.08;
                }
            }
            if (g.userData.warningBand) {
                g.userData.warningBand.material.emissiveIntensity = st.overLimit ? 0.8 : 0;
            }
        });

        const time = this.clock.elapsedTime;
        state.personnel.forEach(p => {
            const g = this.personnelGroup[p.id];
            if (!g) return;
            g.position.x = p.x;
            g.position.z = p.z;

            if (g.userData.warningGlow) {
                g.userData.warningGlow.visible = p.inDanger;
                if (p.inDanger) {
                    g.userData.warningGlow.material.opacity = 0.18 + Math.sin(time * 8) * 0.12;
                }
            }
            if (g.userData.helmetMesh) {
                const helmet = g.userData.helmetMesh;
                if (p.inDanger) {
                    helmet.material.color.setHex(0xff0000);
                    if (helmet.material.emissive) {
                        helmet.material.emissive.setHex(0xff0000);
                        helmet.material.emissiveIntensity = 0.3 + Math.abs(Math.sin(time * 8)) * 0.7;
                    }
                } else {
                    helmet.material.color.setHex(0xf59e0b);
                    if (helmet.material.emissive) {
                        helmet.material.emissive.setHex(0);
                        helmet.material.emissiveIntensity = 0;
                    }
                }
            }
            if (g.userData.labelSprite) {
                const sprite = g.userData.labelSprite;
                if (p.inDanger) {
                    sprite.material.color.setHex(0xff0000);
                    sprite.material.opacity = 0.5 + Math.abs(Math.sin(time * 8)) * 0.5;
                } else {
                    sprite.material.color.setHex(0x10b981);
                    sprite.material.opacity = 1;
                }
            }
        });
    },

    _setupInteraction() {
        this.renderer.domElement.addEventListener('click', (e) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const hits = this.raycaster.intersectObjects(this.scene.children, true);
            for (const hit of hits) {
                let cur = hit.object;
                while (cur && !cur.userData.type) cur = cur.parent;
                if (cur && this.onClick) {
                    this.onClick(cur.userData);
                    break;
                }
            }
        });
    },

    focusArea(area) {
        const targets = {
            overview: { pos: [60, 55, 80], tgt: [10, 0, 0] },
            rawYard: { pos: [-45, 30, -15], tgt: [-40, 5, -15] },
            blastFurnace: { pos: [0, 30, -45], tgt: [5, 10, -15] },
            converter: { pos: [25, 25, -30], tgt: [22, 8, -5] },
            caster: { pos: [-5, 25, -20], tgt: [0, 5, 10] },
            rollingMill: { pos: [55, 25, 20], tgt: [30, 6, 20] },
            warehouse: { pos: [70, 25, -15], tgt: [50, 5, -15] },
            controlRoom: { pos: [70, 25, 25], tgt: [50, 5, 25] }
        };
        const cfg = targets[area] || targets.overview;
        const startPos = this.camera.position.clone();
        const startTgt = this.controls.target.clone();
        const endPos = new THREE.Vector3(...cfg.pos);
        const endTgt = new THREE.Vector3(...cfg.tgt);
        const startTime = Date.now();
        const dur = 900;
        const anim = () => {
            const t = Math.min(1, (Date.now() - startTime) / dur);
            const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            this.camera.position.lerpVectors(startPos, endPos, e);
            this.controls.target.lerpVectors(startTgt, endTgt, e);
            this.controls.update();
            if (t < 1) requestAnimationFrame(anim);
        };
        anim();
    },

    _onResize() {
        if (!this.container) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    },

    _animate() {
        requestAnimationFrame(() => this._animate());
        const delta = this.clock.getDelta();
        const time = this.clock.elapsedTime;

        this.controls.update();

        this.effects.forEach(obj => {
            const t = obj.userData.type;
            if (t === 'smoke') {
                const ud = obj.userData;
                ud.life += ud.speed;
                if (ud.life > 1) ud.life = 0;
                obj.position.y = ud.life * 8;
                const sc = ud.baseScale * (0.5 + ud.life * 1.5);
                obj.scale.setScalar(sc);
                obj.material.opacity = Math.sin(ud.life * Math.PI) * 0.55;
            } else if (t === 'flameCone') {
                const s = 1 + Math.sin(time * 8 + obj.userData.offset) * 0.15;
                obj.scale.set(s, s, s);
                obj.material.opacity = 0.7 + Math.sin(time * 6 + obj.userData.offset) * 0.2;
            } else if (t === 'flameGlow') {
                const s = 1 + Math.sin(time * 5) * 0.12;
                obj.scale.setScalar(s);
                obj.material.opacity = 0.25 + Math.sin(time * 4) * 0.1;
            } else if (t === 'flame') {
                const pos = obj.geometry.attributes.position.array;
                const vel = obj.userData.velocities;
                for (let i = 0; i < vel.length; i++) {
                    pos[i * 3] += vel[i].x;
                    pos[i * 3 + 1] += vel[i].y;
                    pos[i * 3 + 2] += vel[i].z;
                    if (pos[i * 3 + 1] > 3) {
                        const a = Math.random() * Math.PI * 2;
                        const r = Math.random() * 1;
                        pos[i * 3] = Math.cos(a) * r;
                        pos[i * 3 + 1] = 0;
                        pos[i * 3 + 2] = Math.sin(a) * r;
                    }
                }
                obj.geometry.attributes.position.needsUpdate = true;
            } else if (t === 'flameCore') {
                const s = 1 + Math.sin(time * 10) * 0.15;
                obj.scale.setScalar(s);
                obj.material.opacity = 0.6 + Math.sin(time * 8) * 0.2;
            } else if (t === 'bubbles') {
                const pos = obj.geometry.attributes.position.array;
                const vel = obj.userData.velocities;
                for (let i = 0; i < vel.length; i++) {
                    pos[i * 3] = Math.cos(vel[i].angle) * vel[i].baseR * (0.6 + Math.sin(time * vel[i].speed * 50 + i) * 0.4);
                    pos[i * 3 + 1] += vel[i].y;
                    pos[i * 3 + 2] = Math.sin(vel[i].angle) * vel[i].baseR * (0.6 + Math.cos(time * vel[i].speed * 45 + i) * 0.4);
                    if (pos[i * 3 + 1] > 3) {
                        pos[i * 3 + 1] = 0;
                        vel[i].angle = Math.random() * Math.PI * 2;
                        vel[i].baseR = Math.random() * obj.userData.size;
                    }
                }
                obj.geometry.attributes.position.needsUpdate = true;
            } else if (t === 'dangerRing') {
                obj.material.opacity = 0.3 + Math.sin(time * 3) * 0.2;
            } else if (t === 'workRoll' || t === 'roller') {
                obj.rotation.x += delta * 4;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }
};
