const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const scene = document.querySelector('a-scene');
const otherPlayers = {};

// Forza l'aggiornamento della fisica all'avvio
scene.addEventListener('loaded', () => {
    console.log("Sistema fisico pronto.");
});

// LOGICA MOVIMENTO/SALTO
let isJumping = false;
let vVel = 0;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        vVel = 0.2;
    }
});

setInterval(() => {
    // Solo l'asse Y viene gestito manualmente per il salto
    if (isJumping || rig.object3D.position.y > 0.1) {
        vVel -= 0.01;
        rig.object3D.position.y += vVel;
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            vVel = 0;
        }
    }

    // Invio al server (prendiamo le coordinate X e Z calcolate dal motore fisico)
    if (socket.connected) {
        const p = rig.object3D.position;
        const r = localCamera.getAttribute('rotation');
        socket.emit('move', { x: p.x, y: p.y, z: p.z, ry: r.y });
    }
}, 20);

// Avatar altri giocatori
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        const b = document.createElement('a-box');
        b.setAttribute('color', 'orange');
        b.setAttribute('width', '0.5');
        b.setAttribute('height', '1.5');
        scene.appendChild(b);
        otherPlayers[data.id] = b;
    }
    otherPlayers[data.id].object3D.position.set(data.x, data.y, data.z);
});
