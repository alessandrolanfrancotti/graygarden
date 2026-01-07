const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// Blocco cursore per FPS
scene.addEventListener('click', () => {
    scene.canvas.requestPointerLock();
});

// Gestione Salto
let isJumping = false;
let velocityY = 0;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        velocityY = 0.2;
    }
});

// Loop di rete (50ms)
setInterval(() => {
    // Gravità manuale per il salto
    if (isJumping || rig.object3D.position.y > 0.1) {
        velocityY -= 0.01;
        rig.object3D.position.y += velocityY;
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            velocityY = 0;
        }
    }

    // Invio posizione al server (X e Z sono gestite dal motore fisico)
    if (socket.connected) {
        socket.emit('move', {
            x: rig.object3D.position.x,
            y: rig.object3D.position.y,
            z: rig.object3D.position.z,
            ry: localCamera.getAttribute('rotation').y
        });
    }
}, 20);

// Ricezione altri giocatori
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        const avatar = document.createElement('a-box');
        avatar.setAttribute('width', '0.5');
        avatar.setAttribute('height', '1.5');
        avatar.setAttribute('color', 'orange');
        scene.appendChild(avatar);
        otherPlayers[data.id] = avatar;
    }
    const p = otherPlayers[data.id];
    p.object3D.position.set(data.x, data.y, data.z);
    p.object3D.rotation.y = (data.ry * Math.PI) / 180;
});
