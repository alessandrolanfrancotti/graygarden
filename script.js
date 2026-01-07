const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- OROLOGIO PER IL DELTA TIME ---
const clock = new THREE.Clock();

// --- LUCI ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 7);
scene.add(sun);

// --- MONDO (PARETI E BERSAGLI) ---
const walls = [];
function createWall(x, z, w, d) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), new THREE.MeshStandardMaterial({ color: 0x808080 }));
    wall.position.set(x, 2, z);
    scene.add(wall);
    walls.push(wall);
}
scene.add(new THREE.GridHelper(20, 20));
createWall(0, -10, 20, 1); createWall(0, 10, 20, 1);
createWall(-10, 0, 1, 20); createWall(10, 0, 1, 20);

const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    target.position.set(x, 0.4, z);
    scene.add(target);
    targets.push(target);
}
createTarget(3, -5); createTarget(-4, 2); createTarget(0, -7);

// --- GIOCATORE ---
const player = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0 }));
player.position.y = 0.5;
scene.add(player);
const otherPlayers = {};

// --- SPADA ---
const swordGroup = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
blade.position.y = 0.4;
swordGroup.add(blade);
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
handle.position.y = -0.1;
swordGroup.add(handle);
swordGroup.position.set(0.4, -0.4, -0.6);
swordGroup.rotation.z = Math.PI / 4;
swordGroup.scale.set(0.5, 0.5, 0.5);
camera.add(swordGroup);
scene.add(camera);

// --- LOGICA ATTACCO ---
let isAttacking = false, attackTime = 0, hasHitInThisSwing = false;
document.addEventListener('mousedown', () => {
    if (document.pointerLockElement === document.body && !isAttacking) {
        isAttacking = true; attackTime = 0; hasHitInThisSwing = false;
    } else { document.body.requestPointerLock(); }
});

// --- CONTROLLI ---
let pitch = 0, yaw = 0;
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch));
    }
});

const keys = {};
let velY = 0;
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function checkCollision(newX, newZ) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, player.position.y, newZ), new THREE.Vector3(0.9, 0.9, 0.9));
    for (let wall of walls) { if (playerBox.intersectsBox(new THREE.Box3().setFromObject(wall))) return true; }
    return false;
}

// --- UPDATE FISICA ---
function update(delta) {
    player.rotation.y = yaw;
    let moveX = 0, moveZ = 0;
    
    // Velocità base al secondo (moltiplicata per delta)
    const baseSpeed = 7.0; 
    const currentSpeed = baseSpeed * delta;

    if (keys['KeyW']) { moveX -= Math.sin(yaw); moveZ -= Math.cos(yaw); }
    if (keys['KeyS']) { moveX += Math.sin(yaw); moveZ += Math.cos(yaw); }
    if (keys['KeyA']) { moveX -= Math.cos(yaw); moveZ += Math.sin(yaw); }
    if (keys['KeyD']) { moveX += Math.cos(yaw); moveZ -= Math.sin(yaw); }

    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
        moveX = (moveX / length) * currentSpeed;
        moveZ = (moveZ / length) * currentSpeed;
    }

    if (!checkCollision(player.position.x + moveX, player.position.z)) player.position.x += moveX;
    if (!checkCollision(player.position.x, player.position.z + moveZ)) player.position.z += moveZ;

    // Salto e Gravità (anch'essi scalati con delta)
    if (keys['Space'] && player.position.y <= 0.51) velY = 0.25;
    velY -= 0.6 * delta; 
    player.position.y += velY;
    if (player.position.y < 0.5) { player.position.y = 0.5; velY = 0; }

    camera.position.copy(player.position);
    camera.position.y += 0.4;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    // Animazione Spada
    if (isAttacking) {
        attackTime += 10 * delta; 
        swordGroup.position.z = -0.6 - Math.sin(attackTime) * 0.5;
        swordGroup.rotation.x = -Math.sin(attackTime) * 1.5;
        if (!hasHitInThisSwing && attackTime > 1.0) checkSwordHit();
        if (attackTime >= Math.PI) {
            isAttacking = false;
            swordGroup.position.z = -0.6;
            swordGroup.rotation.x = 0;
        }
    }

    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
}

function checkSwordHit() {
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, direction);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0 && intersects[0].distance < 2.5) {
        const hitObject = intersects[0].object;
        scene.remove(hitObject);
        targets.splice(targets.indexOf(hitObject), 1);
        hasHitInThisSwing = true;
    }
}

// --- MULTIPLAYER ---
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        otherPlayers[data.id] = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color: 0xff0000}));
        scene.add(otherPlayers[data.id]);
    }
    otherPlayers[data.id].position.set(data.x, data.y, data.z);
    otherPlayers[data.id].rotation.y = data.rotY || 0;
});

// --- RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // Ottieni il tempo passato dall'ultimo frame
    update(delta);
    renderer.render(scene, camera);
}
animate();
