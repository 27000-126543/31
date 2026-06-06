const SceneControls = {
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    spherical: { radius: 130, phi: Math.PI / 4, theta: Math.PI / 4 },
    target: new THREE.Vector3(0, 5, 0),
    targetSpherical: null,
    onObjectClick: null,
    onClickCallback: null,

    areaCameraPositions: {
        overview: { radius: 130, phi: Math.PI / 4, theta: Math.PI / 4, target: [0, 5, 0] },
        'raw-material': { radius: 60, phi: Math.PI / 3, theta: Math.PI / 6, target: [-60, 5, 0] },
        'blast-furnace': { radius: 50, phi: Math.PI / 3, theta: Math.PI / 3, target: [-30, 10, -5] },
        converter: { radius: 50, phi: Math.PI / 3, theta: Math.PI / 2, target: [0, 10, -5] },
        caster: { radius: 50, phi: Math.PI / 3, theta: Math.PI / 3, target: [30, 5, -5] },
        rolling: { radius: 50, phi: Math.PI / 3, theta: 0, target: [55, 5, 0] },
        warehouse: { radius: 50, phi: Math.PI / 3, theta: -Math.PI / 3, target: [75, 5, 0] },
        control: { radius: 45, phi: Math.PI / 3, theta: Math.PI, target: [0, 5, 40] }
    },

    init(onClickCallback) {
        this.onClickCallback = onClickCallback;
        const container = document.getElementById('three-container');
        if (!container) return;

        container.addEventListener('mousedown', (e) => this._onMouseDown(e));
        container.addEventListener('mousemove', (e) => this._onMouseMove(e));
        container.addEventListener('mouseup', (e) => this._onMouseUp(e));
        container.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
        container.addEventListener('click', (e) => this._onClick(e));

        this._updateCamera();
    },

    _onMouseDown(e) {
        e.preventDefault();
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
    },

    _onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaMove = {
            x: e.clientX - this.previousMousePosition.x,
            y: e.clientY - this.previousMousePosition.y
        };

        this.spherical.theta -= deltaMove.x * 0.005;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.spherical.phi + deltaMove.y * 0.005));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        this._updateCamera();
    },

    _onMouseUp(e) {
        this.isDragging = false;
    },

    _onWheel(e) {
        e.preventDefault();
        this.spherical.radius = Math.max(20, Math.min(250, this.spherical.radius + e.deltaY * 0.1));
        this._updateCamera();
    },

    _onClick(e) {
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - this.previousMousePosition.x, 2) +
            Math.pow(e.clientY - this.previousMousePosition.y, 2)
        );

        if (moveDistance > 5) return;

        const intersects = FactoryScene.getIntersects(e);
        if (intersects.length > 0) {
            let clicked = null;
            for (const intersect of intersects) {
                if (intersect.object.userData && intersect.object.userData.type) {
                    clicked = intersect.object.userData;
                    break;
                }
            }
            if (!clicked) {
                let obj = intersect.object;
                while (obj.parent && !obj.userData.type) {
                    obj = obj.parent;
                }
                if (obj.userData && obj.userData.type) {
                    clicked = obj.userData;
                }
            }
            if (clicked && this.onClickCallback) {
                this.onClickCallback(clicked);
            }
        }
    },

    moveToArea(area) {
        const pos = this.areaCameraPositions[area];
        if (pos) {
            this.spherical.radius = pos.radius;
            this.spherical.phi = pos.phi;
            this.spherical.theta = pos.theta;
            this.target.set(pos.target[0], pos.target[1], pos.target[2]);
            this._updateCamera();
        }
    },

    focusOnObject(position) {
        this.target.set(position.x, position.y + 5, position.z);
        this.spherical.radius = 40;
        this._updateCamera();
    },

    _updateCamera() {
        const x = this.target.x + this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
        const y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
        const z = this.target.z + this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);

        FactoryScene.camera.position.set(x, y, z);
        FactoryScene.camera.lookAt(this.target);
    }
};
