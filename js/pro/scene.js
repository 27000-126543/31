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

        this._setupLights();
        this._buildGround();
        this._buildGrid();
        this._buildAllEquipment();

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

    _buildBlastFurnace(x, z, data) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData = { type: 'blastFurnace', data };

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(6.5, 7.5, 3, 24),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 })
        );
        base.position.y = 1.5;
        base.castShadow = base.receiveShadow = true;
        group.add(base);

        const hearth = new THREE.Mesh(
            new THREE.CylinderGeometry(5.8, 6.3, 8, 32),
            new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.75, roughness: 0.35 })
        );
        hearth.position.y = 7;
        hearth.castShadow = hearth.receiveShadow = true;
        group.add(hearth);

        const belly = new THREE.Mesh(
            new THREE.CylinderGeometry(4.5, 5.8, 6, 32),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 })
        );
        belly.position.y = 14;
        belly.castShadow = belly.receiveShadow = true;
        group.add(belly);

        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(3.5, 4.5, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.65, roughness: 0.45 })
        );
        shaft.position.y = 25;
        shaft.castShadow = shaft.receiveShadow = true;
        group.add(shaft);

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(4, 3.5, 3, 32),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 })
        );
        top.position.y = 34.5;
        top.castShadow = top.receiveShadow = true;
        group.add(top);

        const hoops = [6, 10, 16, 22, 28];
        hoops.forEach((hy, i) => {
            const hoop = new THREE.Mesh(
                new THREE.TorusGeometry(5.5 - i * 0.25, 0.25, 8, 48),
                new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.2 })
            );
            hoop.rotation.x = Math.PI / 2;
            hoop.position.y = hy;
            group.add(hoop);
        });

        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const col = new THREE.Mesh(
                new THREE.BoxGeometry(1, 18, 1),
                new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 })
            );
            col.position.set(Math.cos(angle) * 5.5, 14, Math.sin(angle) * 5.5);
            col.castShadow = true;
            group.add(col);
        }

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const tuyere = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.45, 1.2, 12),
                new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 0.8 })
            );
            tuyere.rotation.z = Math.PI / 2;
            tuyere.position.set(Math.cos(angle) * 6.5, 4.5, Math.sin(angle) * 6.5);
            tuyere.rotation.y = -angle;
            group.add(tuyere);
        }

        const stack = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.9, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 })
        );
        stack.position.y = 42;
        stack.castShadow = true;
        group.add(stack);

        const platform = new THREE.Mesh(
            new THREE.CylinderGeometry(7.5, 7.5, 0.3, 32),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.6 })
        );
        platform.position.y = 33;
        group.add(platform);

        const rail = new THREE.Mesh(
            new THREE.TorusGeometry(7.5, 0.12, 6, 48),
            new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xff9900, emissiveIntensity: 0.3 })
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.y = 33.7;
        group.add(rail);

        this._addSmokeEffect(group, 0, 48, 0);

        const flameGroup = new THREE.Group();
        flameGroup.position.y = 4;
        flameGroup.visible = false;
        group.add(flameGroup);
        group.userData.flameGroup = flameGroup;
        this._buildFlame(flameGroup, 2.5);

        const label = this._makeLabel(data.name);
        label.position.y = 52;
        group.add(label);

        group.userData.baseColor = 0x3a3a3a;
        this.scene.add(group);
        this.equipmentMap[data.id] = group;
        return group;
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

    _buildConverter(x, z, data) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData = { type: 'converter', data };

        const basePlatform = new THREE.Mesh(
            new THREE.BoxGeometry(22, 1.5, 18),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 })
        );
        basePlatform.position.y = 0.75;
        basePlatform.castShadow = basePlatform.receiveShadow = true;
        group.add(basePlatform);

        for (let i = 0; i < 6; i++) {
            const col = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 8, 1.2),
                new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 })
            );
            col.position.set(-9 + i * 3.6, 5.5, -7);
            col.castShadow = true;
            group.add(col);
            const col2 = col.clone();
            col2.position.z = 7;
            group.add(col2);
        }

        const upperDeck = new THREE.Mesh(
            new THREE.BoxGeometry(22, 1, 18),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 })
        );
        upperDeck.position.y = 9.5;
        upperDeck.castShadow = upperDeck.receiveShadow = true;
        group.add(upperDeck);

        const trunnionL = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.2, 4, 16),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9, roughness: 0.2 })
        );
        trunnionL.rotation.z = Math.PI / 2;
        trunnionL.position.set(-10, 16, 0);
        trunnionL.castShadow = true;
        group.add(trunnionL);
        const trunnionR = trunnionL.clone();
        trunnionR.position.x = 10;
        group.add(trunnionR);

        const shell = new THREE.Group();
        shell.position.y = 16;
        group.add(shell);

        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(5.5, 4, 10, 32),
            new THREE.MeshStandardMaterial({ color: 0x553322, metalness: 0.6, roughness: 0.5 })
        );
        body.position.y = 0;
        body.castShadow = body.receiveShadow = true;
        shell.add(body);

        const bottom = new THREE.Mesh(
            new THREE.SphereGeometry(4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x442211, metalness: 0.5, roughness: 0.6 })
        );
        bottom.rotation.x = Math.PI;
        bottom.position.y = -5;
        bottom.castShadow = true;
        shell.add(bottom);

        const mouth = new THREE.Mesh(
            new THREE.CylinderGeometry(6.5, 5.5, 2.5, 32),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 })
        );
        mouth.position.y = 6.2;
        mouth.castShadow = true;
        shell.add(mouth);

        const trunnionRing = new THREE.Mesh(
            new THREE.TorusGeometry(6, 0.6, 12, 48),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9, roughness: 0.2 })
        );
        trunnionRing.rotation.x = Math.PI / 2;
        trunnionRing.position.y = 0;
        shell.add(trunnionRing);

        const hood = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 6, 5, 24),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 })
        );
        hood.position.y = 23;
        hood.castShadow = true;
        group.add(hood);

        const duct = new THREE.Mesh(
            new THREE.BoxGeometry(4, 4, 15),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.75, roughness: 0.35 })
        );
        duct.position.set(0, 26, 9);
        duct.castShadow = true;
        group.add(duct);

        this._addFlameOnTop(shell, 0, 8, 0, data.flameColor);

        const bubbleGroup = new THREE.Group();
        bubbleGroup.position.y = -3;
        bubbleGroup.visible = false;
        shell.add(bubbleGroup);
        group.userData.bubbleGroup = bubbleGroup;
        this._buildBubbles(bubbleGroup, 3.5);

        const label = this._makeLabel(data.name);
        label.position.y = 32;
        group.add(label);

        group.userData.shell = shell;
        group.userData.baseColor = 0x553322;
        this.scene.add(group);
        this.equipmentMap[data.id] = group;
        return group;
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

        const textures = [];
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

    _buildCaster(x, z, data) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData = { type: 'caster', data };

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(18, 1, 10),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 })
        );
        base.position.y = 0.5;
        base.castShadow = base.receiveShadow = true;
        group.add(base);

        const tundish = new THREE.Mesh(
            new THREE.BoxGeometry(5, 2.5, 4),
            new THREE.MeshStandardMaterial({ color: 0x553311, metalness: 0.4, roughness: 0.7 })
        );
        tundish.position.set(-5, 4, 0);
        tundish.castShadow = tundish.receiveShadow = true;
        group.add(tundish);

        const tundishTop = new THREE.Mesh(
            new THREE.BoxGeometry(5.5, 0.4, 4.5),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 })
        );
        tundishTop.position.set(-5, 5.45, 0);
        group.add(tundishTop);

        const mold = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 3.5, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.85, roughness: 0.25 })
        );
        mold.position.set(-1, 3, 0);
        mold.castShadow = true;
        group.add(mold);

        for (let i = 0; i < 8; i++) {
            const roller = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.35, 2.5, 16),
                new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 })
            );
            roller.rotation.z = Math.PI / 2;
            roller.position.set(2 + i * 1.8, 1.5, 0);
            roller.castShadow = true;
            roller.userData.type = 'roller';
            group.add(roller);
            this.effects.push(roller);
        }

        const sprayChamber = new THREE.Mesh(
            new THREE.BoxGeometry(8, 3, 3),
            new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.4, transparent: true, opacity: 0.8 })
        );
        sprayChamber.position.set(6, 2, 0);
        group.add(sprayChamber);

        for (let i = 0; i < 5; i++) {
            const support = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 5, 0.6),
                new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 })
            );
            support.position.set(-7 + i * 4, 2.5, -3.5);
            support.castShadow = true;
            group.add(support);
            const s2 = support.clone();
            s2.position.z = 3.5;
            group.add(s2);
        }

        const slab = new THREE.Mesh(
            new THREE.BoxGeometry(14, 0.5, 1.6),
            new THREE.MeshStandardMaterial({ color: 0xcc3300, emissive: 0xff2200, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.5 })
        );
        slab.position.set(3, 1.9, 0);
        group.add(slab);

        const label = this._makeLabel(data.name);
        label.position.y = 8.5;
        group.add(label);

        const warningGlow = new THREE.Mesh(
            new THREE.BoxGeometry(19, 6, 11),
            new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.BackSide })
        );
        warningGlow.position.y = 3;
        warningGlow.visible = false;
        warningGlow.userData.type = 'warningGlow';
        group.add(warningGlow);
        this.effects.push(warningGlow);
        group.userData.warningGlow = warningGlow;

        this.scene.add(group);
        this.equipmentMap[data.id] = group;
        return group;
    },

    _buildRollingMill(x, z, data) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData = { type: 'rollingMill', data };

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(30, 1.2, 14),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 })
        );
        base.position.y = 0.6;
        base.castShadow = base.receiveShadow = true;
        group.add(base);

        for (let i = 0; i < 5; i++) {
            const stand = new THREE.Group();
            stand.position.set(-10 + i * 5, 0, 0);
            group.add(stand);

            const housingL = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 8, 4),
                new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.85, roughness: 0.25 })
            );
            housingL.position.set(-1.8, 4, 0);
            housingL.castShadow = housingL.receiveShadow = true;
            stand.add(housingL);

            const housingR = housingL.clone();
            housingR.position.x = 1.8;
            stand.add(housingR);

            const topChock = new THREE.Mesh(
                new THREE.BoxGeometry(4.8, 1.2, 4),
                new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.2 })
            );
            topChock.position.y = 8.6;
            topChock.castShadow = true;
            stand.add(topChock);

            const topRoll = new THREE.Mesh(
                new THREE.CylinderGeometry(0.7, 0.7, 4.2, 24),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.95, roughness: 0.15 })
            );
            topRoll.rotation.z = Math.PI / 2;
            topRoll.position.y = 6.5;
            topRoll.userData.type = 'workRoll';
            stand.add(topRoll);
            this.effects.push(topRoll);

            const bottomRoll = topRoll.clone();
            bottomRoll.position.y = 3.5;
            stand.add(bottomRoll);
            this.effects.push(bottomRoll);

            const screwL = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 3, 12),
                new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.95, roughness: 0.15 })
            );
            screwL.position.set(-1.8, 10.5, 0);
            stand.add(screwL);
            const screwR = screwL.clone();
            screwR.position.x = 1.8;
            stand.add(screwR);
        }

        const coilBox = new THREE.Mesh(
            new THREE.BoxGeometry(6, 5, 8),
            new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.4 })
        );
        coilBox.position.set(-18, 2.5, 0);
        coilBox.castShadow = coilBox.receiveShadow = true;
        group.add(coilBox);

        const runOutTable = new THREE.Mesh(
            new THREE.BoxGeometry(14, 0.6, 8),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 })
        );
        runOutTable.position.set(17, 2.2, 0);
        runOutTable.castShadow = runOutTable.receiveShadow = true;
        group.add(runOutTable);

        for (let i = 0; i < 8; i++) {
            const tableRoll = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.25, 8, 16),
                new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.85, roughness: 0.25 })
            );
            tableRoll.rotation.z = Math.PI / 2;
            tableRoll.position.set(11.5 + i * 1.5, 2.8, 0);
            group.add(tableRoll);
        }

        for (let i = 0; i < 6; i++) {
            const col = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 8, 0.8),
                new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.3 })
            );
            col.position.set(-14 + i * 6, 4, -5.5);
            col.castShadow = true;
            group.add(col);
            const c2 = col.clone();
            c2.position.z = 5.5;
            group.add(c2);
        }

        const craneBeam = new THREE.Mesh(
            new THREE.BoxGeometry(32, 0.8, 1.2),
            new THREE.MeshStandardMaterial({ color: 0xff8800, metalness: 0.6, roughness: 0.5 })
        );
        craneBeam.position.y = 12;
        group.add(craneBeam);

        const label = this._makeLabel(data.name, data.lineType === 'CSP' ? '#00d4ff' : '#ff9933');
        label.position.y = 14.5;
        group.add(label);

        const warningGlow = new THREE.Mesh(
            new THREE.BoxGeometry(32, 14, 16),
            new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0, side: THREE.BackSide })
        );
        warningGlow.position.y = 6;
        warningGlow.visible = false;
        warningGlow.userData.type = 'warningGlow';
        group.add(warningGlow);
        this.effects.push(warningGlow);
        group.userData.warningGlow = warningGlow;

        this.scene.add(group);
        this.equipmentMap[data.id] = group;
        return group;
    },

    _buildRawPile(x, z, data) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData = { type: 'rawPile', data };

        const w = 10, d = 8, h = 4 + (data.stock / 30000) * 3;
        const pile = new THREE.Mesh(
            new THREE.ConeGeometry(w * 0.7, h, 4),
            new THREE.MeshStandardMaterial({
                color: data.color, roughness: 0.95, metalness: 0.02
            })
        );
        pile.rotation.y = Math.PI / 4;
        pile.position.y = h / 2;
        pile.castShadow = pile.receiveShadow = true;
        group.add(pile);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(w + 1, 0.3, d + 1),
            new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 })
        );
        base.position.y = 0.15;
        base.receiveShadow = true;
        group.add(base);

        const reclaimer = new THREE.Group();
        reclaimer.position.set(w * 0.6, 0, 0);
        group.add(reclaimer);

        const boom = new THREE.Mesh(
            new THREE.BoxGeometry(8, 0.3, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.6, roughness: 0.5 })
        );
        boom.position.set(-3, 3, 0);
        boom.rotation.z = -0.3;
        reclaimer.add(boom);

        const bucket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.8, 0.5, 12),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 })
        );
        bucket.rotation.x = Math.PI / 2;
        bucket.position.set(-7, 1.2, 0);
        reclaimer.add(bucket);

        const mast = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 5, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.7, roughness: 0.4 })
        );
        mast.position.y = 2.5;
        reclaimer.add(mast);

        const cab = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x2244aa, metalness: 0.5, roughness: 0.4 })
        );
        cab.position.set(0.8, 5, 0);
        reclaimer.add(cab);

        const label = this._makeLabel(data.name + ': ' + Math.floor(data.stock) + 't',
            data.lowStock ? '#ff9900' : '#00d4ff');
        label.position.y = h + 2;
        group.add(label);

        const warningGlow = new THREE.Mesh(
            new THREE.BoxGeometry(w + 3, h + 4, d + 3),
            new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0, side: THREE.BackSide })
        );
        warningGlow.position.y = h / 2 + 1;
        warningGlow.visible = false;
        warningGlow.userData.type = 'warningGlow';
        group.add(warningGlow);
        this.effects.push(warningGlow);
        group.userData.warningGlow = warningGlow;

        this.scene.add(group);
        this.equipmentMap[data.id] = group;
        return group;
    },

    _buildStack(x, z, data) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.userData = { type: 'stack', data };

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3.5, 2, 24),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.5 })
        );
        base.position.y = 1;
        base.castShadow = base.receiveShadow = true;
        group.add(base);

        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(1.8, 2.8, 28, 24),
            new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5, roughness: 0.55 })
        );
        shaft.position.y = 16;
        shaft.castShadow = shaft.receiveShadow = true;
        group.add(shaft);

        for (let i = 0; i < 7; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(2.4 - i * 0.1, 0.15, 6, 32),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 4 + i * 3.5;
            group.add(ring);
        }

        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(2.2, 1.8, 1.5, 24),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.4 })
        );
        top.position.y = 30.75;
        group.add(top);

        const warningBand = new THREE.Mesh(
            new THREE.TorusGeometry(2.1, 0.18, 8, 32),
            new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff0000, emissiveIntensity: 0 })
        );
        warningBand.rotation.x = Math.PI / 2;
        warningBand.position.y = 30;
        group.add(warningBand);
        group.userData.warningBand = warningBand;

        this._addSmokeEffect(group, 0, 32, 0);

        const label = this._makeLabel(data.name);
        label.position.y = 36;
        group.add(label);

        const warningGlow = new THREE.Mesh(
            new THREE.CylinderGeometry(4, 4, 34, 24),
            new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.BackSide })
        );
        warningGlow.position.y = 17;
        warningGlow.visible = false;
        warningGlow.userData.type = 'warningGlow';
        group.add(warningGlow);
        this.effects.push(warningGlow);
        group.userData.warningGlow = warningGlow;

        this.scene.add(group);
        this.equipmentMap[data.id] = group;
        return group;
    },

    _buildPersonnel(pdata) {
        const group = new THREE.Group();
        group.position.set(pdata.x, 0, pdata.z);
        group.userData = { type: 'personnel', data: pdata };

        const bodyMat = new THREE.MeshStandardMaterial({
            color: pdata.inDanger ? 0xff0000 : 0x2266aa, metalness: 0.3, roughness: 0.6
        });

        const legs = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.28, 1, 12),
            new THREE.MeshStandardMaterial({ color: 0x222244, metalness: 0.3, roughness: 0.6 })
        );
        legs.position.y = 0.5;
        group.add(legs);

        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.35, 1.2, 14),
            bodyMat
        );
        body.position.y = 1.6;
        group.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.7 })
        );
        head.position.y = 2.55;
        group.add(head);

        const helmet = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({
                color: pdata.inDanger ? 0xff0000 : 0xffaa00,
                emissive: pdata.inDanger ? 0xff0000 : 0,
                emissiveIntensity: pdata.inDanger ? 0.5 : 0,
                metalness: 0.4, roughness: 0.4
            })
        );
        helmet.position.y = 2.65;
        group.add(helmet);
        group.userData.helmet = helmet;
        group.userData.bodyMat = bodyMat;

        const label = this._makeLabel(pdata.name + ' | ' + pdata.role,
            pdata.inDanger ? '#ff0000' : '#10b981', 42);
        label.position.y = 3.6;
        group.add(label);
        group.userData.label = label;

        const warningGlow = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, side: THREE.BackSide })
        );
        warningGlow.position.y = 1.8;
        warningGlow.visible = false;
        warningGlow.userData.type = 'warningGlow';
        group.add(warningGlow);
        this.effects.push(warningGlow);
        group.userData.warningGlow = warningGlow;

        this.scene.add(group);
        return group;
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

    _buildAllEquipment() {
        if (!this.currentState) return;
        const s = this.currentState;

        const bfPos = [[-5, -20], [5, -18], [15, -22]];
        s.blastFurnaces.forEach((bf, i) => {
            this._buildBlastFurnace(bfPos[i][0], bfPos[i][1], bf);
        });

        const convPos = [[18, -6], [28, -4]];
        s.converters.forEach((c, i) => {
            this._buildConverter(convPos[i][0], convPos[i][1], c);
        });

        const castPos = [[-5, 8], [5, 12]];
        s.casters.forEach((ct, i) => {
            this._buildCaster(castPos[i][0], castPos[i][1], ct);
        });

        const rmPos = [[30, 12], [30, 28]];
        s.rollingMills.forEach((rm, i) => {
            this._buildRollingMill(rmPos[i][0], rmPos[i][1], rm);
        });

        s.rawYard.forEach(pile => {
            this._buildRawPile(pile.position.x, pile.position.z, pile);
        });

        s.stacks.forEach(st => {
            this._buildStack(st.position.x, st.position.z, st);
        });

        this.personnelGroup = {};
        s.personnel.forEach(p => {
            this.personnelGroup[p.id] = this._buildPersonnel(p);
        });

        s.dangerZones.forEach(dz => this._buildDangerZone(dz));

        this._buildWarehouse();
        this._buildControlRoom();
    },

    setState(state) {
        if (!this.currentState) {
            this.currentState = state;
            this._buildAllEquipment();
        } else {
            this.currentState = state;
            this._updateEquipment(state);
        }
    },

    _updateEquipment(state) {
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
            if (g.userData.shell) {
                const overHeat = c.temp > 1700;
                g.userData.shell.traverse(o => {
                    if (o.isMesh && o.material && o.material.color &&
                        o.material.color.getHex() !== 0xffff88 && o.material.color.getHex() !== c.flameColor) {
                        if (overHeat) {
                            if (!o.userData.origColor) o.userData.origColor = o.material.color.getHex();
                            o.material.color.lerp(new THREE.Color(0xff0000), 0.6);
                            if (o.material.emissive) {
                                o.material.emissive.setHex(0xff2200);
                                o.material.emissiveIntensity = 0.35;
                            }
                        } else if (o.userData.origColor) {
                            o.material.color.setHex(o.userData.origColor);
                            if (o.material.emissive) {
                                o.material.emissive.setHex(0x000000);
                                o.material.emissiveIntensity = 0;
                            }
                        }
                    }
                });
            }
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

        state.rawYard.forEach(pile => {
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

        state.personnel.forEach(p => {
            const g = this.personnelGroup[p.id];
            if (!g) return;
            g.position.x = p.x;
            g.position.z = p.z;

            if (g.userData.warningGlow) {
                g.userData.warningGlow.visible = p.inDanger;
                if (p.inDanger) {
                    g.userData.warningGlow.material.opacity = 0.18 + Math.sin(Date.now() / 100) * 0.12;
                }
            }
            if (g.userData.helmet) {
                g.userData.helmet.material.color.setHex(p.inDanger ? 0xff0000 : 0xffaa00);
                g.userData.helmet.material.emissive.setHex(p.inDanger ? 0xff0000 : 0x000000);
                g.userData.helmet.material.emissiveIntensity = p.inDanger ? 0.5 : 0;
            }
            if (g.userData.bodyMat) {
                g.userData.bodyMat.color.setHex(p.inDanger ? 0xff0000 : 0x2266aa);
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