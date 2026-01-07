const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const scene = document.querySelector('a-scene');
const otherPlayers = {};

// Blocco mouse
scene.addEventListener('click', () => { scene.canvas.requestPointerLock(); });

let isJumping = false;
let vVel = 0;

// Eseguiamo il controllo collisioni 50 volte al secondo
setInterval(() => {
    let pos = rig.object3D.position;

    // --- LOGICA MURI (Coordinate fisse) ---
    // Il quadrato è tra -15 e +15. Usiamo 14.7 per fermarci un istante prima.
    if (pos.x > 14.7) pos.x = 14.7;
    if (pos.x < -14.7) pos.x = -14.7;
    if (pos.z > 14.7) pos.z = 14.7;
    if (pos.z < -14.7) pos.z = -14.7;

    // --- LOGICA SALTO ---
    if (isJumping || pos.y > 0.1) {
        vVel -= 0.01;
        pos.y += vVel;
        if (pos.y <= 0.1) {
            pos.y = 0.1;
            isJumping = false;
            vVel = 0;
        }
    }

    // --- MULTIPLAYER ---
    if (socket.connected) {
        socket.emit('move', { 
            x: pos.x, y: pos.y, z: pos.z, 
            ry: localCamera.getAttribute('rotation').y 
        });
    }
}, 20);

// Ascolto tasto spazio
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        vVel = 0.2;
    }
});

// Altri giocatori
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        const avatar = document.createElement('a-box');
        avatar.setAttribute('width', '0.5');
        avatar.setAttribute('height', '1.5');
        avatar.setAttribute('color', 'orange');
        scene.appendChild(avatar);
        otherPlayers[data.id] = avatar;
    }
    otherPlayers[data.id].object3D.position.set(data.x, data.y, data.z);
    otherPlayers[data.id].object3D.rotation.y = (data.ry * Math.PI) / 180;
});
