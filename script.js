const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// --- BLOCCO DEL MOUSE (FPS Mode) ---
scene.addEventListener('click', () => {
    if (scene.canvas) {
        scene.canvas.requestPointerLock();
    }
});

// --- LOGICA DI SALTO ---
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.01;
const jumpStrength = 0.18; // Leggermente ridotto per stabilità

window.addEventListener('keydown', (e) => {
    // Saltiamo solo se siamo vicini al suolo
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.15) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// Loop principale a 50fps (20ms)
setInterval(() => {
    let pos = rig.object3D.position;

    // --- 1. GESTIONE SALTO (Invariata) ---
    if (isJumping || pos.y > 0.1) {
        verticalVelocity += gravity;
        pos.y += verticalVelocity;
        if (pos.y <= 0.1) {
            pos.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // --- 2. NUOVA LOGICA COLLISIONI ---
    const walls = document.querySelectorAll('.collidable');
    walls.forEach(wall => {
        const wallPos = wall.object3D.position;
        const wallWidth = wall.getAttribute('width') || 1;
        const wallDepth = wall.getAttribute('depth') || 1;

        // Calcoliamo se il giocatore è dentro i confini del blocco (con un piccolo margine di 0.5)
        const hitX = Math.abs(pos.x - wallPos.x) < (wallWidth / 2 + 0.4);
        const hitZ = Math.abs(pos.z - wallPos.z) < (wallDepth / 2 + 0.4);
        const hitY = pos.y < (wallPos.y + wall.getAttribute('height') / 2);

        if (hitX && hitZ && hitY) {
            // Se sbatti, ti riportiamo alla posizione precedente o ti respingiamo
            // Questo è un modo brutale ma impedisce di entrare nel blocco
            const dirX = pos.x - wallPos.x;
            const dirZ = pos.z - wallPos.z;
            
            if (Math.abs(dirX) > Math.abs(dirZ)) {
                pos.x += dirX > 0 ? 0.05 : -0.05;
            } else {
                pos.z += dirZ > 0 ? 0.05 : -0.05;
            }
        }
    });

    // --- 3. INVIO DATI ---
    if (socket.connected) {
        const camRot = localCamera.getAttribute('rotation');
        socket.emit('move', {
            x: pos.x, y: pos.y, z: pos.z,
            rx: camRot.x, ry: camRot.y, rz: camRot.z
        });
    }
}, 20);
    // 2. Invio Dati al Server
    if (socket.connected) {
        // Usiamo le coordinate di object3D che sono quelle "reali" processate dalla fisica
        const currentPos = rig.object3D.position;
        const camRot = localCamera.getAttribute('rotation');
        
        socket.emit('move', {
            x: currentPos.x, 
            y: currentPos.y, 
            z: currentPos.z,
            rx: camRot.x, 
            ry: camRot.y, 
            rz: camRot.z
        });
    }
}, 20);

// --- LOGICA MULTIPLAYER ---

socket.on('current-players', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) createPlayerAvatar(id, players[id]);
    });
});

socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        createPlayerAvatar(data.id, data);
    } else {
        const avatar = otherPlayers[data.id];
        // Usiamo object3D per fluidità anche sugli altri giocatori
        avatar.object3D.position.set(data.x, data.y, data.z);
        avatar.object3D.rotation.set(0, THREE.MathUtils.degToRad(data.ry), 0);
    }
});

socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.removeChild(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function createPlayerAvatar(id, data) {
    const avatar = document.createElement('a-box');
    avatar.setAttribute('id', id);
    avatar.setAttribute('color', '#FF5733'); 
    avatar.setAttribute('width', '0.5');
    avatar.setAttribute('height', '1.5');
    avatar.setAttribute('depth', '0.5');
    avatar.object3D.position.set(data.x, data.y, data.z);
    
    const nose = document.createElement('a-box');
    nose.setAttribute('position', '0 0.5 -0.3');
    nose.setAttribute('width', '0.2');
    nose.setAttribute('height', '0.2');
    nose.setAttribute('depth', '0.4');
    nose.setAttribute('color', 'black');
    avatar.appendChild(nose);

    scene.appendChild(avatar);
    otherPlayers[id] = avatar;
}
