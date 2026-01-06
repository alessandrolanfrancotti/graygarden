const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// --- LOCK DEL MOUSE ---
scene.addEventListener('click', () => {
    if (scene.canvas) scene.canvas.requestPointerLock();
});

// --- LOGICA SALTO ---
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.012;
const jumpStrength = 0.22;

window.addEventListener('keydown', (e) => {
    // Salta solo se sei a terra (altezza circa 0.1)
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// Loop di aggiornamento (50 volte al secondo)
setInterval(() => {
    // 1. Applichiamo la gravità/salto solo all'asse Y
    if (isJumping || rig.object3D.position.y > 0.1) {
        verticalVelocity += gravity;
        rig.object3D.position.y += verticalVelocity;

        // Reset quando tocchi terra
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // 2. Invio dati al server
    if (socket.connected) {
        const pos = rig.object3D.position;
        const rot = localCamera.getAttribute('rotation');
        
        socket.emit('move', {
            x: pos.x, y: pos.y, z: pos.z,
            rx: rot.x, ry: rot.y, rz: rot.z
        });
    }
}, 20);

// --- MULTIPLAYER ---
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
        avatar.object3D.rotation.set(0, (data.ry * Math.PI) / 180, 0);
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
    avatar.setAttribute('height', '1.6');
    avatar.setAttribute('depth', '0.5');
    
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
