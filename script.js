const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const scene = document.querySelector('a-scene');
const otherPlayers = {};

// 1. BLOCCO MOUSE
scene.addEventListener('click', () => {
    scene.canvas.requestPointerLock();
});

// 2. LOGICA SALTO
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.01;
const jumpStrength = 0.15;

window.addEventListener('keydown', (e) => {
    // Salta solo se vicino a terra
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// LOOP DI AGGIORNAMENTO (50fps)
setInterval(() => {
    // GESTIONE FISICA SALTO (Solo asse Y)
    if (isJumping || rig.object3D.position.y > 0.1) {
        verticalVelocity += gravity;
        rig.object3D.position.y += verticalVelocity;

        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // INVIO POSIZIONE AL SERVER
    if (socket.connected) {
        const pos = rig.object3D.position;
        const rot = localCamera.getAttribute('rotation');
        socket.emit('move', {
            x: pos.x, y: pos.y, z: pos.z,
            rx: rot.x, ry: rot.y, rz: rot.z
        });
    }
}, 20);

// 3. MULTIPLAYER
socket.on('current-players', (players) => {
    Object.keys(players).forEach(id => {
        if (id !== socket.id) createAvatar(id, players[id]);
    });
});

socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        createAvatar(data.id, data);
    } else {
        const p = otherPlayers[data.id];
        p.object3D.position.set(data.x, data.y, data.z);
        p.object3D.rotation.y = THREE.MathUtils.degToRad(data.ry);
    }
});

socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.removeChild(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function createAvatar(id, data) {
    const el = document.createElement('a-box');
    el.setAttribute('id', id);
    el.setAttribute('color', '#FF5733');
    el.setAttribute('width', '0.5');
    el.setAttribute('height', '1.6');
    el.setAttribute('depth', '0.5');
    scene.appendChild(el);
    otherPlayers[id] = el;
}
