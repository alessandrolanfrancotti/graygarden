const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const scene = document.querySelector('a-scene');
const otherPlayers = {};

// LOGICA SALTO
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.01;
const jumpStrength = 0.15;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// LOOP PRINCIPALE
setInterval(() => {
    // Gestione Salto
    if (isJumping || rig.object3D.position.y > 0.1) {
        verticalVelocity += gravity;
        rig.object3D.position.y += verticalVelocity;
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // INVIO DATI (Multiplayer)
    if (socket.connected) {
        const pos = rig.object3D.position;
        const rot = localCamera.getAttribute('rotation');
        socket.emit('move', {
            x: pos.x, y: pos.y, z: pos.z,
            rx: rot.x, ry: rot.y, rz: rot.z
        });
    }
}, 20);

// GESTIONE ALTRI GIOCATORI
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        const el = document.createElement('a-box');
        el.setAttribute('color', '#FF5733');
        el.setAttribute('width', '0.5');
        el.setAttribute('height', '1.5');
        scene.appendChild(el);
        otherPlayers[data.id] = el;
    }
    otherPlayers[data.id].object3D.position.set(data.x, data.y, data.z);
    otherPlayers[data.id].object3D.rotation.y = (data.ry * Math.PI) / 180;
});
