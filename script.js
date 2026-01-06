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
    // 1. Gestione Altezza (Salto e Gravità)
    if (isJumping || rig.object3D.position.y > 0.1) {
        verticalVelocity += gravity;
        
        // Applichiamo il movimento verticale direttamente all'object3D
        rig.object3D.position.y += verticalVelocity;

        // Controllo atterraggio (0.1 è l'altezza base del rig)
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

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
