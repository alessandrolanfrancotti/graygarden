const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const scene = document.querySelector('a-scene');
const otherPlayers = {};

// Blocco Mouse
scene.addEventListener('click', () => { scene.canvas.requestPointerLock(); });

// Salto Semplificato
let isJumping = false;
let vVel = 0;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        vVel = 0.2;
    }
});

// Loop 50fps
setInterval(() => {
    // Gravità
    if (isJumping || rig.object3D.position.y > 0.1) {
        vVel -= 0.01;
        rig.object3D.position.y += vVel;
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            vVel = 0;
        }
    }

    // Invio dati
    if (socket.connected) {
        const p = rig.object3D.position;
        socket.emit('move', { x: p.x, y: p.y, z: p.z, ry: localCamera.getAttribute('rotation').y });
    }
}, 20);

// Altri giocatori
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        const box = document.createElement('a-box');
        box.setAttribute('color', 'orange');
        box.setAttribute('width', '0.5');
        box.setAttribute('height', '1.5');
        scene.appendChild(box);
        otherPlayers[data.id] = box;
    }
    otherPlayers[data.id].object3D.position.set(data.x, data.y, data.z);
});
