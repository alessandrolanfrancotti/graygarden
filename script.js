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

// --- CONTROLLI MOUSE (First Person) ---
let pitch = 0; // Rotazione su/giù
let yaw = 0;   // Rotazione destra/sinistra

// Blocca il mouse al click sulla finestra
document.addEventListener('click', () => {
    document.body.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        const sensitivity = 0.002;
        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;
        
        // Limita la visuale su e giù (evita di fare il giro completo)
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
        new THREE.Vector3(0.9, 0.9, 0.9) // Box leggermente più piccola per scivolare meglio
    );
    for (let wall of walls) {
        if (playerBox.intersectsBox(new THREE.Box3().setFromObject(wall))) return true;
    }
    return false;
}

function update() {
    // 1. Ruota il giocatore in base al mouse (sinistra/destra)
    player.rotation.y = yaw;

    // 2. Calcola direzione movimento in base alla rotazione
    let moveX = 0;
    let moveZ = 0;

    if (keys['KeyW']) { moveX -= Math.sin(yaw); moveZ -= Math.cos(yaw); }
    if (keys['KeyS']) { moveX += Math.sin(yaw); moveZ += Math.cos(yaw); }
    if (keys['KeyA']) { moveX -= Math.cos(yaw); moveZ += Math.sin(yaw); }
    if (keys['KeyD']) { moveX += Math.cos(yaw); moveZ -= Math.sin(yaw); }

    // Normalizza movimento per non andare più veloci in diagonale
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
        moveX = (moveX / length) * speed;
        moveZ = (moveZ / length) * speed;
    }

    // 3. Collisioni
    if (!checkCollision(player.position.x + moveX, player.position.z)) player.position.x += moveX;
    if (!checkCollision(player.position.x, player.position.z + moveZ)) player.position.z += moveZ;

    // 4. Salto e Gravità
    if (keys['Space'] && player.position.y <= 0.51) velY = 0.15;
    velY -= 0.008;
    player.position.y += velY;
    if (player.position.y < 0.5) { player.position.y = 0.5; velY = 0; }

    // 5. Posiziona la Camera (Prima persona)
    camera.position.copy(player.position);
    camera.position.y += 0.4; // Altezza "occhi"
    camera.rotation.order = "YXZ"; // Fondamentale per FPS
    camera.rotation.set(pitch, yaw, 0);

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
