const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const scene = document.querySelector('a-scene');

let isJumping = false;
let vVel = 0;

// Salto
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        vVel = 0.2;
    }
});

setInterval(() => {
    // Gestione altezza (Gravità)
    if (isJumping || rig.object3D.position.y > 0.1) {
        vVel -= 0.01;
        rig.object3D.position.y += vVel;
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            vVel = 0;
        }
    }

    // MULTIPLAYER: Invia i dati che il motore fisico ha calcolato
    if (socket && socket.connected) {
        const p = rig.object3D.position;
        const r = localCamera.getAttribute('rotation');
        socket.emit('move', { x: p.x, y: p.y, z: p.z, ry: r.y });
    }
}, 20);

// Logica per ricevere gli altri giocatori (come nel link)
socket.on('player-moved', (data) => {
    // ... stessa logica di creazione avatar ...
});
