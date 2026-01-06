const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// --- BLOCCO DEL MOUSE (Pointer Lock) ---
scene.addEventListener('click', () => {
    if (scene.canvas) {
        scene.canvas.requestPointerLock();
    }
});

// --- LOGICA DI SALTO ---
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.01;
const jumpStrength = 0.2;
let currentY = 0.1; // Altezza base

window.addEventListener('keydown', (e) => {
    // Saltiamo solo se siamo vicini a terra e premiamo Spazio
    if (e.code === 'Space' && !isJumping) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// Loop principale (50fps)
setInterval(() => {
    let pos = rig.getAttribute('position');

    // 1. Gestione Gravità/Salto
    if (isJumping || pos.y > 0.1) {
        verticalVelocity += gravity;
        currentY = pos.y + verticalVelocity;

        if (currentY <= 0.1) { // Atterraggio
            currentY = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
        
        // Applichiamo solo il cambio di altezza, lasciando che WASD gestisca X e Z
        rig.setAttribute('position', { x: pos.x, y: currentY, z: pos.z });
    }

    // 2. Invio posizione e rotazione al server
    if (socket.connected) {
        const camRot = localCamera.getAttribute('rotation');
        
        socket.emit('move', {
            x: pos.x, 
            y: pos.y, 
            z: pos.z,
            rx: camRot.x, 
            ry: camRot.y, 
            rz: camRot.z
        });
    }
}, 20);

// --- LOGICA MULTIPLAYER ---
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
        // Aggiorna posizione e rotazione degli altri cubi
        avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
        avatar.setAttribute('rotation', { x: 0, y: data.ry, z: 0 }); // Ruota solo il corpo sull'asse Y
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
    avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
    avatar.setAttribute('color', '#FF5733'); 
    avatar.setAttribute('width', '0.5');
    avatar.setAttribute('height', '1.5');
    avatar.setAttribute('depth', '0.5');
    
    // Naso per capire la direzione
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
