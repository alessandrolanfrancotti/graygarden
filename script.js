const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- LUCI ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 7);
scene.add(sun);

// --- MONDO ---
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

// --- GIOCATORE ---
const player = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
player.position.y = 0.5;
scene.add(player);
const otherPlayers = {};

// --- SPADA (Mano Destra) ---
const swordGroup = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
blade.position.y = 0.4;
swordGroup.add(blade);
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
handle.position.y = -0.1;
swordGroup.add(handle);

swordGroup.position.set(0.4, -0.4, -0.6); // Posizione base
swordGroup.rotation.z = Math.PI / 4;
swordGroup.scale.set(0.5, 0.5, 0.5);
camera.add(swordGroup);
scene.add(camera); // Importante per vedere la spada attaccata alla camera

// --- LOGICA ATTACCO (OSCILLAZIONE) ---
let isAttacking = false;
let attackTime = 0;

document.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === document.body && !isAttacking) {
        isAttacking = true;
        attackTime = 0;
    } else {
        document.body.requestPointerLock();
    }
});

// --- CONTROLLI MOUSE (First Person) ---
let pitch = 0;
let yaw = 0;

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        const sensitivity = 0.002;
        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;
        pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch));
    }
});

// --- CONTROLLI TASTIERA ---
const keys = {};
let velY = 0;
const speed = 0.12;
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function checkCollision(newX, newZ) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(newX, player.position.y, newZ),
        new THREE.Vector3(0.9, 0.9, 0.9)
    );
    for (let wall of walls) {
        if (playerBox.intersectsBox(new THREE.Box3().setFromObject(wall))) return true;
    }
    return false;
}

function update() {
    // Rotazione Giocatore
    player.rotation.y = yaw;

    // Movimento
    let moveX = 0;
    let moveZ = 0;
    if (keys['KeyW']) { moveX -= Math.sin(yaw); moveZ -= Math.cos(yaw); }
    if (keys['KeyS']) { moveX += Math.sin(yaw); moveZ += Math.cos(yaw); }
    if (keys['KeyA']) { moveX -= Math.cos(yaw); moveZ += Math.sin(yaw); }
    if (keys['KeyD']) { moveX += Math.cos(yaw); moveZ -= Math.sin(yaw); }

    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
        moveX = (moveX / length) * speed;
        moveZ = (moveZ / length) * speed;
    }

    if (!checkCollision(player.position.x + moveX, player.position.z)) player.position.x += moveX;
    if (!checkCollision(player.position.x, player.position.z + moveZ)) player.position.z += moveZ;

    // Salto
    if (keys['Space'] && player.position.y <= 0.51) velY = 0.15;
    velY -= 0.008;
    player.position.y += velY;
    if (player.position.y < 0.5) { player.position.y = 0.5; velY = 0; }

    // Camera
    camera.position.copy(player.position);
    camera.position.y += 0.4;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    // --- ANIMAZIONE SPADA ---
    if (isAttacking) {
        attackTime += 0.15; // Velocità dell'attacco
        // Effetto oscillazione (avanti e rotazione)
        swordGroup.position.z = -0.6 - Math.sin(attackTime) * 0.4;
        swordGroup.rotation.x = -Math.sin(attackTime) * 1.2;
        
        if (attackTime >= Math.PI) { // Fine del ciclo di oscillazione
            isAttacking = false;
            attackTime = 0;
            swordGroup.position.z = -0.6; // Ritorna in posizione base
            swordGroup.rotation.x = 0;
        }
    } else {
        // Oscillazione leggera quando si cammina (effetto "bobbing")
        if (length > 0) {
            const bob = Math.sin(Date.now() * 0.01) * 0.02;
            swordGroup.position.y = -0.4 + bob;
        }
    }

    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
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

socket.on('player-disconnected', (id) => { if (otherPlayers[id]) { scene.remove(otherPlayers[id]); delete otherPlayers[id]; } });

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
