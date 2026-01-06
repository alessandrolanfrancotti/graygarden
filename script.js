const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// --- LOGICA DI SALTO ---
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.01;
const jumpStrength = 0.2;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// Loop per gestire la gravità del salto e l'invio dati
setInterval(() => {
    // 1. Gestione fisica salto locale
    if (isJumping) {
        let pos = rig.getAttribute('position');
        verticalVelocity += gravity;
        let newY = pos.y + verticalVelocity;

        if (newY <= 0.1) { // Tocca terra
            newY = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
        rig.setAttribute('position', { x: pos.x, y: newY, z: pos.z });
    }

    // 2. Invio posizione al server (inclusa l'altezza del salto)
    if (socket.connected) {
        const rigPos = rig.getAttribute('position');
        const camRot = localCamera.getAttribute('rotation');
        socket.emit('move', {
            x: rigPos.x, y: rigPos.y, z: rigPos.z,
            rx: camRot.x, ry: camRot.y, rz: camRot.z
        });
    }
}, 20); // Più veloce (20ms) per un salto fluido

// --- LOGICA MULTIPLAYER (Invariata) ---
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
        avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
        avatar.setAttribute('rotation', { x: data.rx, y: data.ry, z: data.rz });
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
    avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
    avatar.setAttribute('color', '#FF5733'); 
    avatar.setAttribute('width', '0.5');
    avatar.setAttribute('height', '1.5');
    avatar.setAttribute('depth', '0.5');
    scene.appendChild(avatar);
    otherPlayers[id] = avatar;
}
