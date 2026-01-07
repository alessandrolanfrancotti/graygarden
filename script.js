// --- CONFIGURAZIONE SOCKET ---
// Se lavori in locale usa 'http://localhost:3000'
// Se hai già deployato su Render, usa l'URL fornito da loro (es: 'https://tuo-gioco.onrender.com')
const socket = io("http://localhost:3000");

// --- SETUP BASE DI THREE.JS ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Cielo azzurro invece che nero

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- ILLUMINAZIONE (Per non vedere nero) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Luce diffusa
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.8); // Luce tipo sole
sunLight.position.set(5, 10, 7);
scene.add(sunLight);

// --- MONDO E COLLISIONI ---
const walls = [];

// Funzione per creare pareti
function createWall(x, z, width, depth, color = 0x808080) {
    const geometry = new THREE.BoxGeometry(width, 4, depth);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, 2, z); // Alzata di 2 perché è alta 4
    scene.add(wall);
    walls.push(wall);
}

// Pavimento (Griglia per orientarsi meglio)
const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Creiamo i confini della stanza
createWall(0, -10, 20, 1); // Nord
createWall(0, 10, 20, 1);  // Sud
createWall(-10, 0, 1, 20); // Ovest
createWall(10, 0, 1, 20);  // Est

// --- IL GIOCATORE (Cubo Verde) ---
const playerGeo = new THREE.BoxGeometry(1, 1, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 0.5; // Appoggiato sul pavimento
scene.add(player);

// Altri giocatori (Cubi Rossi)
const otherPlayers = {};

// --- CONTROLLI E MOVIMENTO ---
const keys = {};
let velY = 0;
const speed = 0.15;
const gravity = -0.01;
let canJump = true;

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Funzione per controllare le collisioni
function checkCollision(newX, newZ) {
    // Creiamo una bounding box temporanea per la posizione futura
    const playerBox = new THREE.Box3().setFromObject(player);
    // Applichiamo lo spostamento alla box di test
    playerBox.translate(new THREE.Vector3(newX - player.position.x, 0, newZ - player.position.z));

    for (let wall of walls) {
        const wallBox = new THREE.Box3().setFromObject(wall);
        if (playerBox.intersectsBox(wallBox)) {
            return true; // C'è una collisione
        }
    }
    return false;
}

// --- LOGICA DI AGGIORNAMENTO ---
function update() {
    let nextX = player.position.x;
    let nextZ = player.position.z;

    // Input movimenti
    if (keys['KeyW'] || keys['ArrowUp']) nextZ -= speed;
    if (keys['KeyS'] || keys['ArrowDown']) nextZ += speed;
    if (keys['KeyA'] || keys['ArrowLeft']) nextX -= speed;
    if (keys['KeyD'] || keys['ArrowRight']) nextX += speed;

    // Applica collisioni asse X
    if (!checkCollision(nextX, player.position.z)) {
        player.position.x = nextX;
    }
    // Applica collisioni asse Z
    if (!checkCollision(player.position.x, nextZ)) {
        player.position.z = nextZ;
    }

    // Gestione Salto e Gravità
    if (keys['Space'] && canJump) {
        velY = 0.2;
        canJump = false;
    }

    velY += gravity;
    player.position.y += velY;

    if (player.position.y <= 0.5) {
        player.position.y = 0.5;
        velY = 0;
        canJump = true;
    }

    // La camera segue il giocatore
    camera.position.set(player.position.x, player.position.y + 5, player.position.z + 10);
    camera.lookAt(player.position);

    // Invia posizione al server (solo se connesso)
    if (socket.connected) {
        socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z });
    }
}

// --- GESTIONE MULTIPLAYER ---
socket.on('current-players', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) addOtherPlayer(id, players[id]);
    });
});

socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        addOtherPlayer(data.id, data);
    } else {
        otherPlayers[data.id].position.set(data.x, data.y, data.z);
    }
});

socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function addOtherPlayer(id, data) {
    const p = new THREE.Mesh(playerGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    p.position.set(data.x, data.y, data.z);
    scene.add(p);
    otherPlayers[id] = p;
}

// --- LOOP DI RENDERING ---
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// Gestione ridimensionamento finestra
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
