const FactoryScene = {
    scene: null,
    camera: null,
    renderer: null,
    objects: {},
    animations: [],
    raycaster: null,
    mouse: null,
    labelRenderer: null,

    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found: ' + containerId);
            return;
        }

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e1a);
        this.scene.fog = new THREE.Fog(0x0a0e1a, 100, 300);

        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 80, 100);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this._setupLights();
        this._buildGround();
        this._buildRoads();
        this._buildAllFacilities();
        this._buildPersonnel();
        this._buildDangerZones();

        window.addEventListener('resize', () => this._onResize());
    },

    _setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        const pointLight1 = new THREE.PointLight(0xff6600, 0.6, 80);
        pointLight1.position.set(-30, 20, -20);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff6600, 0.6, 80);
        pointLight2.position.set(0, 20, -20);
        this.scene.add(pointLight2);
    },

    _buildGround() {
        const groundGeometry = new THREE.PlaneGeometry(200, 150);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1f2e,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(200, 40, 0x00d4ff, 0x1a2332);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
    },

    _buildRoads() {
        const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2f3e, roughness: 0.8 });

        const road1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 140), roadMaterial);
        road1.rotation.x = -Math.PI / 2;
        road1.position.set(-45, 0.02, 0);
        this.scene.add(road1);

        const road2 = new THREE.Mesh(new THREE.PlaneGeometry(140, 8), roadMaterial);
        road2.rotation.x = -Math.PI / 2;
        road2.position.set(10, 0.02, -5);
        this.scene.add(road2);
    },

    _buildAllFacilities() {
        this._buildRawMaterialYard();
        this._buildBlastFurnaces();
        this._buildConverters();
        this._buildCasters();
        this._buildRollingMills();
        this._buildWarehouse();
        this._buildControlRoom();
        this._buildEnvironmentalStacks();
    },

    _buildRawMaterialYard() {
        const yardGroup = new THREE.Group();
        this.objects.rawMaterialYard = {};

        FactoryData.rawMaterialYard.forEach(pile => {
            const pileGroup = new THREE.Group();
            const pileGeom = new THREE.ConeGeometry(5, 6 + (pile.stock / 10000) * 3, 8);
            const pileMat = new THREE.MeshStandardMaterial({
                color: pile.color,
                roughness: 0.9
            });
            const pileMesh = new THREE.Mesh(pileGeom, pileMat);
            pileMesh.position.y = pileGeom.parameters.height / 2;
            pileMesh.castShadow = true;
            pileMesh.userData = { type: 'rawPile', id: pile.id, data: pile };
            pileGroup.add(pileMesh);

            if (pile.lowStock) {
                this._addWarningGlow(pileGroup, 0xff9900, 7);
            }

            pileGroup.position.set(pile.position.x, pile.position.y, pile.position.z);
            this.objects.rawMaterialYard[pile.id] = pileGroup;
            yardGroup.add(pileGroup);
        });

        this._addAreaLabel(yardGroup, '原料场', -60, 15, 0);
        this.scene.add(yardGroup);
    },

    _buildBlastFurnaces() {
        this.objects.blastFurnaces = {};

        FactoryData.blastFurnaces.forEach(bf => {
            const bfGroup = new THREE.Group();

            const baseGeom = new THREE.CylinderGeometry(8, 10, 4, 16);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.7, roughness: 0.3 });
            const base = new THREE.Mesh(baseGeom, baseMat);
            base.position.y = 2;
            base.castShadow = true;
            bfGroup.add(base);

            const bodyGeom = new THREE.CylinderGeometry(6, 8, 20, 16);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.8, roughness: 0.2 });
            const body = new THREE.Mesh(bodyGeom, bodyMat);
            body.position.y = 14;
            body.castShadow = true;
            bfGroup.add(body);

            const topGeom = new THREE.CylinderGeometry(5, 6, 6, 16);
            const top = new THREE.Mesh(topGeom, bodyMat);
            top.position.y = 27;
            top.castShadow = true;
            bfGroup.add(top);

            const hoistGeom = new THREE.BoxGeometry(3, 8, 3);
            const hoistMat = new THREE.MeshStandardMaterial({ color: 0x444455 });
            const hoist = new THREE.Mesh(hoistGeom, hoistMat);
            hoist.position.set(8, 20, 0);
            hoist.castShadow = true;
            bfGroup.add(hoist);

            const tuyereRing = new THREE.Mesh(
                new THREE.TorusGeometry(9, 0.5, 8, 32),
                new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.5 })
            );
            tuyereRing.position.y = 5;
            tuyereRing.rotation.x = Math.PI / 2;
            bfGroup.add(tuyereRing);

            if (bf.heatingActive) {
                this._addFireEffect(bfGroup, 0, 2, 0);
            }

            const supportGeom = new THREE.BoxGeometry(1, 12, 1);
            const supportMat = new THREE.MeshStandardMaterial({ color: 0x888899 });
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const support = new THREE.Mesh(supportGeom, supportMat);
                support.position.set(Math.cos(angle) * 10, 8, Math.sin(angle) * 10);
                support.castShadow = true;
                bfGroup.add(support);
            }

            bfGroup.traverse(child => {
                if (child.isMesh) {
                    child.userData = { type: 'blastFurnace', id: bf.id, data: bf };
                }
            });
            bfGroup.userData = { type: 'blastFurnace', id: bf.id, data: bf };

            bfGroup.position.set(bf.position.x, bf.position.y, bf.position.z);
            this.objects.blastFurnaces[bf.id] = bfGroup;
            this.scene.add(bfGroup);

            this._addFloatingLabel(bfGroup, bf.name, 0, 35, 0);
        });
    },

    _buildConverters() {
        this.objects.converters = {};

        FactoryData.converters.forEach(conv => {
            const convGroup = new THREE.Group();

            const bodyGeom = new THREE.CylinderGeometry(5, 7, 12, 16);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: conv.status === 'overheat' ? 0xff3333 : 0x777788,
                metalness: 0.8,
                roughness: 0.2,
                emissive: conv.status === 'overheat' ? 0xff0000 : 0x000000,
                emissiveIntensity: conv.status === 'overheat' ? 0.3 : 0
            });
            const body = new THREE.Mesh(bodyGeom, bodyMat);
            body.position.y = 10;
            body.castShadow = true;
            convGroup.add(body);

            const mouthGeom = new THREE.CylinderGeometry(6, 5, 3, 16);
            const mouthMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.9 });
            const mouth = new THREE.Mesh(mouthGeom, mouthMat);
            mouth.position.y = 17.5;
            mouth.castShadow = true;
            convGroup.add(mouth);

            const flameGroup = this._createFlameEffect(conv.flameColor);
            flameGroup.position.set(0, 20, 0);
            flameGroup.scale.set(1, 1.5, 1);
            convGroup.add(flameGroup);

            const trunnionGeom = new THREE.CylinderGeometry(1, 1, 14, 16);
            const trunnionMat = new THREE.MeshStandardMaterial({ color: 0x444455 });
            const trunnion = new THREE.Mesh(trunnionGeom, trunnionMat);
            trunnion.rotation.z = Math.PI / 2;
            trunnion.position.y = 10;
            convGroup.add(trunnion);

            const supportGeom = new THREE.BoxGeometry(2, 15, 2);
            const supportMat = new THREE.MeshStandardMaterial({ color: 0x888899 });
            const leftSupport = new THREE.Mesh(supportGeom, supportMat);
            leftSupport.position.set(-8, 7.5, 0);
            leftSupport.castShadow = true;
            convGroup.add(leftSupport);
            const rightSupport = new THREE.Mesh(supportGeom, supportMat);
            rightSupport.position.set(8, 7.5, 0);
            rightSupport.castShadow = true;
            convGroup.add(rightSupport);

            if (conv.argonBlowing) {
                this._addBubbleEffect(convGroup, 0, 5, 0);
            }

            convGroup.traverse(child => {
                if (child.isMesh) {
                    child.userData = { type: 'converter', id: conv.id, data: conv };
                }
            });
            convGroup.userData = { type: 'converter', id: conv.id, data: conv };

            convGroup.position.set(conv.position.x, conv.position.y, conv.position.z);
            this.objects.converters[conv.id] = convGroup;
            this.scene.add(convGroup);

            this._addFloatingLabel(convGroup, conv.name, 0, 28, 0);
        });
    },

    _buildCasters() {
        this.objects.casters = {};

        FactoryData.casters.forEach(caster => {
            const casterGroup = new THREE.Group();

            const baseGeom = new THREE.BoxGeometry(8, 3, 20);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6 });
            const base = new THREE.Mesh(baseGeom, baseMat);
            base.position.y = 1.5;
            base.castShadow = true;
            casterGroup.add(base);

            const towerGeom = new THREE.BoxGeometry(4, 12, 4);
            const towerMat = new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.7 });
            const tower = new THREE.Mesh(towerGeom, towerMat);
            tower.position.set(-2, 10, 0);
            tower.castShadow = true;
            casterGroup.add(tower);

            const moldGeom = new THREE.BoxGeometry(3, 4, 3);
            const moldMat = new THREE.MeshStandardMaterial({
                color: caster.status === 'warning' ? 0xff4444 : 0x44aaff,
                metalness: 0.9,
                emissive: caster.status === 'warning' ? 0xff0000 : 0x0044aa,
                emissiveIntensity: 0.2
            });
            const mold = new THREE.Mesh(moldGeom, moldMat);
            mold.position.set(-2, 5, 0);
            mold.castShadow = true;
            casterGroup.add(mold);

            for (let i = 0; i < 5; i++) {
                const rollGeom = new THREE.CylinderGeometry(0.8, 0.8, 6, 16);
                const rollMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });
                const roll = new THREE.Mesh(rollGeom, rollMat);
                roll.rotation.z = Math.PI / 2;
                roll.position.set(2 + i * 3, 2, 0);
                roll.castShadow = true;
                casterGroup.add(roll);
            }

            if (caster.status === 'warning') {
                this._addWarningGlow(casterGroup, 0xff0000, 12);
            }

            casterGroup.traverse(child => {
                if (child.isMesh) {
                    child.userData = { type: 'caster', id: caster.id, data: caster };
                }
            });
            casterGroup.userData = { type: 'caster', id: caster.id, data: caster };

            casterGroup.position.set(caster.position.x, caster.position.y, caster.position.z);
            this.objects.casters[caster.id] = casterGroup;
            this.scene.add(casterGroup);

            this._addFloatingLabel(casterGroup, caster.name, 0, 20, 0);
        });
    },

    _buildRollingMills() {
        this.objects.rollingMills = {};

        FactoryData.rollingMills.forEach(rm => {
            const rmGroup = new THREE.Group();

            const baseGeom = new THREE.BoxGeometry(18, 4, 10);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.6 });
            const base = new THREE.Mesh(baseGeom, baseMat);
            base.position.y = 2;
            base.castShadow = true;
            rmGroup.add(base);

            const housingGeom = new THREE.BoxGeometry(4, 10, 12);
            const housingMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.7 });
            const leftHousing = new THREE.Mesh(housingGeom, housingMat);
            leftHousing.position.set(-4, 11, 0);
            leftHousing.castShadow = true;
            rmGroup.add(leftHousing);
            const rightHousing = new THREE.Mesh(housingGeom, housingMat);
            rightHousing.position.set(4, 11, 0);
            rightHousing.castShadow = true;
            rmGroup.add(rightHousing);

            const topRoll = new THREE.Mesh(
                new THREE.CylinderGeometry(1.5, 1.5, 14, 16),
                new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.95 })
            );
            topRoll.rotation.z = Math.PI / 2;
            topRoll.position.set(0, 12, 0);
            topRoll.castShadow = true;
            rmGroup.add(topRoll);

            const bottomRoll = new THREE.Mesh(
                new THREE.CylinderGeometry(1.5, 1.5, 14, 16),
                new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.95 })
            );
            bottomRoll.rotation.z = Math.PI / 2;
            bottomRoll.position.set(0, 7, 0);
            bottomRoll.castShadow = true;
            rmGroup.add(bottomRoll);

            const motorGeom = new THREE.CylinderGeometry(2, 2, 5, 16);
            const motorMat = new THREE.MeshStandardMaterial({ color: 0x333344 });
            const motor = new THREE.Mesh(motorGeom, motorMat);
            motor.rotation.x = Math.PI / 2;
            motor.position.set(0, 6, 10);
            rmGroup.add(motor);

            if (rm.status === 'warning') {
                this._addWarningGlow(rmGroup, 0xffaa00, 15);
            }

            rmGroup.traverse(child => {
                if (child.isMesh) {
                    child.userData = { type: 'rollingMill', id: rm.id, data: rm };
                }
            });
            rmGroup.userData = { type: 'rollingMill', id: rm.id, data: rm };

            rmGroup.position.set(rm.position.x, rm.position.y, rm.position.z);
            this.objects.rollingMills[rm.id] = rmGroup;
            this.scene.add(rmGroup);

            this._addFloatingLabel(rmGroup, rm.name, 0, 20, 0);
        });
    },

    _buildWarehouse() {
        const wh = FactoryData.finishedWarehouse;
        const whGroup = new THREE.Group();

        const buildingGeom = new THREE.BoxGeometry(20, 12, 25);
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0x445566,
            metalness: 0.3,
            roughness: 0.7,
            transparent: true,
            opacity: 0.85
        });
        const building = new THREE.Mesh(buildingGeom, buildingMat);
        building.position.y = 6;
        building.castShadow = true;
        whGroup.add(building);

        const roofGeom = new THREE.ConeGeometry(16, 6, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x00aadd, metalness: 0.5 });
        const roof = new THREE.Mesh(roofGeom, roofMat);
        roof.position.y = 15;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        whGroup.add(roof);

        wh.areas.forEach(area => {
            const areaGeom = new THREE.BoxGeometry(6, 3, 4);
            const areaMat = new THREE.MeshStandardMaterial({
                color: 0x00ddaa,
                transparent: true,
                opacity: 0.6,
                emissive: 0x00aa66,
                emissiveIntensity: 0.2
            });
            const areaMesh = new THREE.Mesh(areaGeom, areaMat);
            areaMesh.position.set(area.position.x - wh.position.x, 3, area.position.z - wh.position.z);
            whGroup.add(areaMesh);
        });

        whGroup.userData = { type: 'warehouse', id: wh.id, data: wh };
        whGroup.position.set(wh.position.x, wh.position.y, wh.position.z);
        this.objects.warehouse = whGroup;
        this.scene.add(whGroup);

        this._addAreaLabel(whGroup, '成品库', 0, 22, 0);
    },

    _buildControlRoom() {
        const cr = FactoryData.controlRoom;
        const crGroup = new THREE.Group();

        const buildingGeom = new THREE.BoxGeometry(18, 10, 12);
        const buildingMat = new THREE.MeshStandardMaterial({
            color: 0x223344,
            metalness: 0.4,
            roughness: 0.5
        });
        const building = new THREE.Mesh(buildingGeom, buildingMat);
        building.position.y = 5;
        building.castShadow = true;
        crGroup.add(building);

        for (let i = -1; i <= 1; i++) {
            for (let j = 0; j < 2; j++) {
                const windowGeom = new THREE.BoxGeometry(2.5, 2, 0.1);
                const windowMat = new THREE.MeshStandardMaterial({
                    color: 0x00ffff,
                    emissive: 0x0088ff,
                    emissiveIntensity: 0.6
                });
                const window = new THREE.Mesh(windowGeom, windowMat);
                window.position.set(i * 4, 4 + j * 3, 6.05);
                crGroup.add(window);
            }
        }

        const antennaGeom = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const antennaMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const antenna = new THREE.Mesh(antennaGeom, antennaMat);
        antenna.position.set(0, 14, 0);
        crGroup.add(antenna);

        crGroup.userData = { type: 'controlRoom', id: cr.id, data: cr };
        crGroup.position.set(cr.position.x, cr.position.y, cr.position.z);
        this.objects.controlRoom = crGroup;
        this.scene.add(crGroup);

        this._addAreaLabel(crGroup, '中央控制室', 0, 20, 0);
    },

    _buildEnvironmentalStacks() {
        this.objects.stacks = {};

        FactoryData.environmentalStations.forEach(station => {
            const stackGroup = new THREE.Group();

            const stackGeom = new THREE.CylinderGeometry(1.5, 2.5, 25, 16);
            const stackColor = station.status === 'overlimit' ? 0xff3333 : 0x666677;
            const stackMat = new THREE.MeshStandardMaterial({
                color: stackColor,
                metalness: 0.5,
                emissive: station.status === 'overlimit' ? 0xff0000 : 0x000000,
                emissiveIntensity: station.status === 'overlimit' ? 0.3 : 0
            });
            const stack = new THREE.Mesh(stackGeom, stackMat);
            stack.position.y = 12.5;
            stack.castShadow = true;
            stackGroup.add(stack);

            const topGeom = new THREE.CylinderGeometry(2, 1.5, 2, 16);
            const top = new THREE.Mesh(topGeom, new THREE.MeshStandardMaterial({ color: 0x555555 }));
            top.position.y = 26;
            stackGroup.add(top);

            this._addSmokeEffect(stackGroup, 0, 28, 0, station.status);

            stackGroup.userData = { type: 'stack', id: station.id, data: station };
            stackGroup.position.set(station.position.x, station.position.y - 15, station.position.z);
            this.objects.stacks[station.id] = stackGroup;
            this.scene.add(stackGroup);
        });
    },

    _buildPersonnel() {
        this.objects.personnel = {};

        FactoryData.personnel.forEach(person => {
            const personGroup = new THREE.Group();

            const bodyGeom = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
            const bodyColor = person.inDanger ? 0xff3333 : 0x00aaff;
            const bodyMat = new THREE.MeshStandardMaterial({
                color: bodyColor,
                emissive: person.inDanger ? 0xff0000 : 0x004488,
                emissiveIntensity: person.inDanger ? 0.4 : 0.1
            });
            const body = new THREE.Mesh(bodyGeom, bodyMat);
            body.position.y = 1.5;
            body.castShadow = true;
            personGroup.add(body);

            const headGeom = new THREE.SphereGeometry(0.4, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
            const head = new THREE.Mesh(headGeom, headMat);
            head.position.y = 3;
            personGroup.add(head);

            personGroup.position.set(person.position.x, 0, person.position.z);
            personGroup.userData = { type: 'personnel', id: person.id, data: person };
            this.objects.personnel[person.id] = personGroup;
            this.scene.add(personGroup);
        });
    },

    _buildDangerZones() {
        FactoryData.dangerZones.forEach(zone => {
            const zoneGeom = new THREE.RingGeometry(zone.radius - 0.3, zone.radius, 32);
            const zoneMat = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const zoneMesh = new THREE.Mesh(zoneGeom, zoneMat);
            zoneMesh.rotation.x = -Math.PI / 2;
            zoneMesh.position.set(zone.center.x, 0.05, zone.center.z);
            this.scene.add(zoneMesh);
        });
    },

    _createFlameEffect(color) {
        const flameGroup = new THREE.Group();
        const flameCount = 8;

        for (let i = 0; i < flameCount; i++) {
            const flameGeom = new THREE.ConeGeometry(0.8, 3, 6);
            const flameMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const flame = new THREE.Mesh(flameGeom, flameMat);
            flame.position.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            );
            flame.rotation.z = (Math.random() - 0.5) * 0.3;
            flame.userData = { baseScale: 0.8 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2 };
            this.animations.push({
                mesh: flame,
                update: (time) => {
                    const s = flame.userData.baseScale * (0.8 + 0.4 * Math.sin(time * 5 + flame.userData.phase));
                    flame.scale.set(s, s * (1 + 0.3 * Math.sin(time * 8)), s);
                    flame.material.opacity = 0.5 + 0.3 * Math.sin(time * 6 + flame.userData.phase);
                }
            });
            flameGroup.add(flame);
        }

        return flameGroup;
    },

    _addFireEffect(group, x, y, z) {
        const fireGroup = this._createFlameEffect(0xff6600);
        fireGroup.position.set(x, y, z);
        fireGroup.scale.set(1.5, 2, 1.5);
        group.add(fireGroup);

        const lightGeom = new THREE.SphereGeometry(3, 16, 16);
        const lightMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.3
        });
        const light = new THREE.Mesh(lightGeom, lightMat);
        light.position.set(x, y + 2, z);
        group.add(light);
    },

    _addBubbleEffect(group, x, y, z) {
        for (let i = 0; i < 15; i++) {
            const bubbleGeom = new THREE.SphereGeometry(0.15 + Math.random() * 0.2, 8, 8);
            const bubbleMat = new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.6
            });
            const bubble = new THREE.Mesh(bubbleGeom, bubbleMat);
            bubble.position.set(x + (Math.random() - 0.5) * 4, y + Math.random() * 8, z + (Math.random() - 0.5) * 4);
            bubble.userData = { baseY: bubble.position.y, speed: 0.5 + Math.random() };
            this.animations.push({
                mesh: bubble,
                update: (time) => {
                    bubble.position.y = bubble.userData.baseY + ((time * bubble.userData.speed * 2) % 10);
                    bubble.material.opacity = 0.3 + 0.3 * Math.sin(time * 4);
                }
            });
            group.add(bubble);
        }
    },

    _addSmokeEffect(group, x, y, z, status) {
        const smokeCount = 12;
        const smokeColor = status === 'overlimit' ? 0x884444 : 0xaaaaaa;

        for (let i = 0; i < smokeCount; i++) {
            const smokeGeom = new THREE.SphereGeometry(1.5, 8, 8);
            const smokeMat = new THREE.MeshBasicMaterial({
                color: smokeColor,
                transparent: true,
                opacity: 0.4
            });
            const smoke = new THREE.Mesh(smokeGeom, smokeMat);
            smoke.position.set(x, y, z);
            smoke.userData = { baseY: y, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.3 };
            this.animations.push({
                mesh: smoke,
                update: (time) => {
                    const t = (time * smoke.userData.speed + smoke.userData.phase) % 8;
                    smoke.position.y = smoke.userData.baseY + t * 3;
                    smoke.position.x = x + Math.sin(time + smoke.userData.phase) * 2;
                    smoke.scale.setScalar(1 + t * 0.3);
                    smoke.material.opacity = Math.max(0, 0.5 - t * 0.06);
                }
            });
            group.add(smoke);
        }
    },

    _addWarningGlow(group, color, size) {
        const glowGeom = new THREE.SphereGeometry(size, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.y = size / 2;
        group.add(glow);

        this.animations.push({
            mesh: glow,
            update: (time) => {
                glow.material.opacity = 0.1 + 0.15 * Math.abs(Math.sin(time * 3));
            }
        });
    },

    _addFloatingLabel(group, text, x, y, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(x, y, z);
        sprite.scale.set(8, 2, 1);
        group.add(sprite);
    },

    _addAreaLabel(group, text, x, y, z) {
        this._addFloatingLabel(group, text, x, y, z);
    },

    _onResize() {
        const container = document.getElementById('three-container');
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    },

    render(time) {
        const t = time * 0.001;
        this.animations.forEach(anim => anim.update(t));
        this.renderer.render(this.scene, this.camera);
    },

    getIntersects(event) {
        const container = document.getElementById('three-container');
        const rect = container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(this.scene.children, true);
    }
};
