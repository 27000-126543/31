THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = domElement;

	this.enabled = true;
	this.target = new THREE.Vector3();
	this.minDistance = 0;
	this.maxDistance = Infinity;
	this.minPolarAngle = 0;
	this.maxPolarAngle = Math.PI;
	this.enableDamping = true;
	this.dampingFactor = 0.08;
	this.enableZoom = true;
	this.zoomSpeed = 1.0;
	this.enableRotate = true;
	this.rotateSpeed = 1.0;
	this.enablePan = true;
	this.panSpeed = 1.0;

	var scope = this;
	var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
	var state = STATE.NONE;

	var spherical = new THREE.Spherical();
	var sphericalDelta = new THREE.Spherical();
	var scale = 1;
	var panOffset = new THREE.Vector3();

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	this.update = function () {

		var offset = new THREE.Vector3();
		var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
		var quatInverse = quat.clone().invert();

		var position = scope.object.position;
		offset.copy( position ).sub( scope.target );
		offset.applyQuaternion( quat );

		spherical.setFromVector3( offset );

		if ( scope.enableDamping ) {
			spherical.theta += sphericalDelta.theta * scope.dampingFactor;
			spherical.phi += sphericalDelta.phi * scope.dampingFactor;
		} else {
			spherical.theta += sphericalDelta.theta;
			spherical.phi += sphericalDelta.phi;
		}

		spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );
		spherical.makeSafe();

		spherical.radius *= scale;
		spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

		if ( scope.enableDamping ) {
			panOffset.multiplyScalar( scope.dampingFactor );
		}

		scope.target.add( panOffset );

		offset.setFromSpherical( spherical );
		offset.applyQuaternion( quatInverse );
		position.copy( scope.target ).add( offset );
		scope.object.lookAt( scope.target );

		if ( scope.enableDamping ) {
			sphericalDelta.theta *= ( 1 - scope.dampingFactor );
			sphericalDelta.phi *= ( 1 - scope.dampingFactor );
			panOffset.multiplyScalar( 1 - scope.dampingFactor );
		} else {
			sphericalDelta.set( 0, 0, 0 );
			panOffset.set( 0, 0, 0 );
		}

		scale = 1;
		return true;

	};

	function handleRotateStart( x, y ) {
		rotateStart.set( x, y );
	}
	function handleRotateMove( x, y ) {
		rotateEnd.set( x, y );
		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );
		var el = scope.domElement;
		sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / el.clientHeight;
		sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / el.clientHeight;
		rotateStart.copy( rotateEnd );
	}
	function handlePan( deltaX, deltaY ) {
		var el = scope.domElement;
		var offset = new THREE.Vector3();
		offset.copy( scope.object.position ).sub( scope.target );
		var targetDistance = offset.length();
		targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );
		var te = scope.object.matrix.elements;
		var v = new THREE.Vector3();
		v.setFromMatrixColumn( scope.object.matrix, 0 );
		v.multiplyScalar( - 2 * deltaX * targetDistance / el.clientHeight * scope.panSpeed );
		panOffset.add( v );
		v.setFromMatrixColumn( scope.object.matrix, 1 );
		v.multiplyScalar( 2 * deltaY * targetDistance / el.clientHeight * scope.panSpeed );
		panOffset.add( v );
	}
	function handleDolly( delta ) {
		var normalized_delta = Math.abs( delta ) / 100;
		if ( delta > 0 ) {
			scale /= Math.pow( 0.95, scope.zoomSpeed * ( normalized_delta + 1 ) );
		} else {
			scale *= Math.pow( 0.95, scope.zoomSpeed * ( normalized_delta + 1 ) );
		}
	}

	function onPointerDown( event ) {
		if ( ! scope.enabled ) return;
		if ( event.pointerType === 'mouse' && event.button === 0 ) {
			state = STATE.ROTATE;
			handleRotateStart( event.clientX, event.clientY );
		} else if ( event.pointerType === 'mouse' && event.button === 2 ) {
			state = STATE.PAN;
			panStart.set( event.clientX, event.clientY );
		} else if ( event.pointerType === 'mouse' && event.button === 1 ) {
			state = STATE.DOLLY;
			dollyStart.set( event.clientX, event.clientY );
		}
		domElement.setPointerCapture( event.pointerId );
	}
	function onPointerMove( event ) {
		if ( ! scope.enabled ) return;
		if ( state === STATE.ROTATE ) {
			handleRotateMove( event.clientX, event.clientY );
		} else if ( state === STATE.PAN ) {
			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			handlePan( panDelta.x, panDelta.y );
			panStart.copy( panEnd );
		} else if ( state === STATE.DOLLY ) {
			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );
			if ( dollyDelta.y > 0 ) handleDolly( 1 );
			else if ( dollyDelta.y < 0 ) handleDolly( -1 );
			dollyStart.copy( dollyEnd );
		}
	}
	function onPointerUp( event ) {
		state = STATE.NONE;
		try { domElement.releasePointerCapture( event.pointerId ); } catch ( e ) {}
	}
	function onMouseWheel( event ) {
		if ( ! scope.enabled || ! scope.enableZoom ) return;
		event.preventDefault();
		handleDolly( event.deltaY );
	}
	function onContextMenu( event ) {
		event.preventDefault();
	}

	domElement.addEventListener( 'contextmenu', onContextMenu );
	domElement.addEventListener( 'pointerdown', onPointerDown );
	domElement.addEventListener( 'pointermove', onPointerMove );
	domElement.addEventListener( 'pointerup', onPointerUp );
	domElement.addEventListener( 'pointercancel', onPointerUp );
	domElement.addEventListener( 'wheel', onMouseWheel, { passive: false } );

	this.dispose = function () {
		domElement.removeEventListener( 'contextmenu', onContextMenu );
		domElement.removeEventListener( 'pointerdown', onPointerDown );
		domElement.removeEventListener( 'pointermove', onPointerMove );
		domElement.removeEventListener( 'pointerup', onPointerUp );
		domElement.removeEventListener( 'pointercancel', onPointerUp );
		domElement.removeEventListener( 'wheel', onMouseWheel );
	};

	this.update();

};
