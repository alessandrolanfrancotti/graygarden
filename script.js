const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// --- BLOCCO DEL MOUSE (FPS Mode) ---
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

window.addEventListener('keydown', (e) => {
    // Salta solo se premi Spazio e non stai già saltando
    if (e.code === 'Space' && !isJumping) {
        isJumping = true;
        verticalVelocity = jumpStrength;
    }
});

// Loop principale a 50fps (20ms)
setInterval(() => {
    // 1. Gestione Altezza (Salto e Gravità)
    // Usiamo object3D.position per non interferire con il movimento WASD
    if (isJumping || rig.object3D.position.y > 0.1) {
        verticalVelocity += gravity;
        rig.object3D.position.y += verticalVelocity;

        // Controllo atterraggio sul pavimento (altezza 0.1)
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // 2. Invio Dati al Server
    if (socket.connected) {
        // Prendiamo la posizione aggiornata dal motore 3D (che include collisioni e salto)
        const currentPos = rig.object3D.position;
        const camRot = localCamera.getAttribute('rotation');
        
        socket.emit('move', {
            x: currentPos.x, 
            y: currentPos.y, 
            z: currentPos.z,
            rx: camRot.x, 
            ry: camRot.y, // Direzione dello sguardo
            rz: camRot.z
        });
    }
}, 20);

// --- LOGICA MULTIPLAYER ---

// Ricevi i giocatori già connessi
socket.on('current-players', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) createPlayerAvatar(id, players[id]);
    });
});

// Aggiorna movimento degli altri giocatori
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        createPlayerAvatar(data.id, data);
    } else {
        const avatar = otherPlayers[data.id];
        avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
        // Gli altri cubi ruotano solo sull'asse Y (sinistra/destra)
        avatar.setAttribute('rotation', { x: 0, y: data.ry, z: 0 });
    }
});

// Rimuovi chi si disconnette
socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.removeChild(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

// Funzione per creare i "cubi" degli altri giocatori
function createPlayerAvatar(id, data) {
    const avatar = document.createElement('a-box');
    avatar.setAttribute('id', id);
    avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
    avatar.setAttribute('color', '#FF5733'); // Colore arancione per gli altri
    avatar.setAttribute('width', '0.5');
    avatar.setAttribute('height', '1.5');
    avatar.setAttribute('depth', '0.5');
    
    // Aggiungi un "naso" nero per capire dove guardano gli altri
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
