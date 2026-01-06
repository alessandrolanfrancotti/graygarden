const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// BLOCCO MOUSE
scene.addEventListener('click', () => {
    scene.canvas.requestPointerLock();
});

// LOGICA SALTO
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.012;
const jumpStrength = 0.2;

window.addEventListener('keydown', (e) => {
    // Permette il salto solo se il rig è vicino al suolo
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.15) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// LOOP PRINCIPALE (50 FPS)
setInterval(() => {
    // 1. Gestione Salto e Gravità (Solo Y)
    if (isJumping || rig.object3D.position.y > 0.1) {
        verticalVelocity += gravity;
        rig.object3D.position.y += verticalVelocity;

        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // 2. Invio Posizione al Server
    if (socket && socket.connected) {
        const pos = rig.object3D.position;
        const rot = localCamera.getAttribute('rotation');
        socket.emit('move', {
            x: pos.x, y: pos.y, z: pos.z,
            ry: rot.y // Invia solo la rotazione Y per il corpo degli altri
        });
    }
}, 20);

// MULTIPLAYER: Gestione degli altri giocatori
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        // Crea un avatar ispirato al link (semplice ed efficace)
        const avatar = document.createElement('a-entity');
        
        // Corpo dell'avatar
        const body = document.createElement('a-box');
        body.setAttribute('width', '0.5');
        body.setAttribute('height', '1.6');
        body.setAttribute('depth', '0.5');
        body.setAttribute('color', '#FF5733');
        avatar.appendChild(body);

        // Direzione sguardo (naso)
        const nose = document.createElement('a-box');
        nose.setAttribute('width', '0.2');
        nose.setAttribute('height', '0.2');
        nose.setAttribute('depth', '0.4');
        nose.setAttribute('position', '0 0.5 -0.3');
        nose.setAttribute('color', '#222');
        avatar.appendChild(nose);

        scene.appendChild(avatar);
        otherPlayers[data.id] = avatar;
    }

    const p = otherPlayers[data.id];
    p.object3D.position.set(data.x, data.y, data.z);
    p.object3D.rotation.y = THREE.MathUtils.degToRad(data.ry);
});

socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.removeChild(otherPlayers[id]);
        delete otherPlayers[id];
    }
});
