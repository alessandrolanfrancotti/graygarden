const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// Forza il caricamento dei corpi fisici
scene.addEventListener('loaded', () => {
    console.log("Scena caricata, fisica in ascolto...");
});

// LOCK MOUSE
scene.addEventListener('click', () => {
    if (scene.canvas) scene.canvas.requestPointerLock();
});

// SALTO
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.012;
const jumpStrength = 0.22;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// LOOP PRINCIPALE
setInterval(() => {
    // Gestione altezza
    if (isJumping || rig.object3D.position.y > 0.1) {
        verticalVelocity += gravity;
        rig.object3D.position.y += verticalVelocity;

        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // Invio dati multiplayer
    if (socket.connected) {
        const p = rig.object3D.position;
        const r = localCamera.getAttribute('rotation');
        socket.emit('move', { x: p.x, y: p.y, z: p.z, rx: r.x, ry: r.y, rz: r.z });
    }
}, 20);

// MULTIPLAYER (Gestione avatar)
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
        avatar.object3D.position.set(data.x, data.y, data.z);
        avatar.object3D.rotation.y = (data.ry * Math.PI) / 180;
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
    avatar.setAttribute('color', '#FF5733');
    avatar.setAttribute('width', '0.5');
    avatar.setAttribute('height', '1.6');
    avatar.setAttribute('depth', '0.5');
    
    const nose = document.createElement('a-box');
    nose.setAttribute('position', '0 0.5 -0.3');
    nose.setAttribute('width', '0.2'); nose.setAttribute('height', '0.2'); nose.setAttribute('depth', '0.4');
    nose.setAttribute('color', 'black');
    
    avatar.appendChild(nose);
    scene.appendChild(avatar);
    otherPlayers[id] = avatar;
}
