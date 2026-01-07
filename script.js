// Sostituisci con l'URL di Render una volta deployato
const socket = io("http://localhost:3000"); 

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// --- MONDO E COLLISIONI ---
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const walls = [];

function createWall(x, z, w, d) {
    const geo = new THREE.BoxGeometry(w, 4, d);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, 2, z);
    scene.add(mesh);
    walls.push(mesh); // Aggiungiamo all'array per controllare le collisioni
}

// Pavimento
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x111111 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Creazione Stanza (Pareti: Nord, Sud, Est, Ovest)
createWall(0, -10, 20, 1); 
createWall(0, 10, 20, 1);
createWall(-10, 0, 1, 20);
createWall(10, 0, 1, 20);

// --- GIOCATORE ---
const playerGeo = new THREE.BoxGeometry(1, 1, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 0.5;
scene.add(player);

const otherPlayers = {}; // Per gestire gli altri cubi

// --- LOGICA MOVIMENTO ---
const keys = {};
let velocityY = 0;
const gravity = -0.01;
const speed = 0.1;
let isGrounded = true;

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function checkCollision(newX, newZ) {
    const playerBox = new THREE.Box3().setFromObject(player);
    // Spostiamo virtualmente la box per testare la collisione
    playerBox.translate(new THREE.Vector3(newX - player.position.x, 0, newZ - player.position.z));
    
    for (let wall of walls) {
        const wallBox = new THREE.Box3().setFromObject(wall);
        if (playerBox.intersectsBox(wallBox)) return true;
    }
    return false;
}

function update() {
    let nextX = player.position.x;
    let nextZ = player.position.z;

    if (keys['KeyW'] || keys['ArrowUp']) nextZ -= speed;
    if (keys['KeyS'] || keys['ArrowDown']) nextZ += speed;
    if (keys['KeyA'] || keys['ArrowLeft']) nextX -= speed;
    if (keys['KeyD'] || keys['ArrowRight']) nextX += speed;

    // Movimento X
    if (!checkCollision(nextX, player.position.z)) {
        player.position.x = nextX;
    }
    // Movimento Z
    if (!checkCollision(player.position.x, nextZ)) {
        player.position.z = nextZ;
    }

    // Salto
    if (keys['Space'] && isGrounded) {
        velocityY = 0.2;
        isGrounded = false;
    }

    velocityY += gravity;
    player.position.y += velocityY;

    if (player.position.y <= 0.5) {
        player.position.y = 0.5;
        velocityY = 0;
        isGrounded = true;
    }

    // Camera segue il giocatore
    camera.position.set(player.position.x, player.position.y + 5, player.position.z + 8);
    camera.lookAt(player.position);

    // Invia posizione al server
    socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z });
}

// --- MULTIPLAYER ---
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        const p = new THREE.Mesh(playerGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        scene.add(p);
        otherPlayers[data.id] = p;
    }
    otherPlayers[data.id].position.set(data.x, data.y, data.z);
});

socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

// --- RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
animate();
