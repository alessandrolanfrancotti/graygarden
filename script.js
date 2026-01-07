// Connessione al server Socket.io
const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// 1. BLOCCO DEL MOUSE
// Necessario per giocare come un FPS (WASD + Mouse)
scene.addEventListener('click', () => {
    scene.canvas.requestPointerLock();
});

// 2. LOGICA DI SALTO E GRAVITÀ
let isJumping = false;
let velocityY = 0;
const gravity = -0.012; // Forza di gravità
const jumpPower = 0.2;  // Forza del salto

window.addEventListener('keydown', (e) => {
    // Salta solo se premi Spazio e sei vicino al suolo
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        velocityY = jumpPower;
        
        // "Sveglia" la fisica del corpo se era entrato in modalità riposo
        if (rig.body) rig.body.wakeUp();
    }
});

// 3. LOOP DI AGGIORNAMENTO (Gira ogni 20ms - circa 50 FPS)
setInterval(() => {
    // Gestione fisica del salto (Asse Y)
    if (isJumping || rig.object3D.position.y > 0.1) {
        velocityY += gravity;
        rig.object3D.position.y += velocityY;

        // Atterraggio: impedisce di scendere sotto il livello del mare
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            velocityY = 0;
        }
    }

    // Se ci stiamo muovendo con WASD, assicuriamoci che la fisica sia attiva
    if (rig.body && rig.body.velocity.length() < 0.1) {
        // Questo trucco impedisce al cubo di "congelarsi" sul posto
        rig.body.wakeUp();
    }

    // 4. INVIO POSIZIONE AL SERVER (Multiplayer)
    if (socket && socket.connected) {
        const pos = rig.object3D.position;
        const rot = localCamera.getAttribute('rotation');
        
        socket.emit('move', {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            ry: rot.y // Invia la rotazione della testa per l'avatar degli altri
        });
    }
}, 20);

// 5. GESTIONE ALTRI GIOCATORI
socket.on('player-moved', (data) => {
    // Se il giocatore non esiste ancora, crealo
    if (!otherPlayers[data.id]) {
        const avatar = document.createElement('a-entity');
        
        // Crea un corpo visibile per l'altro giocatore
        const body = document.createElement('a-box');
        body.setAttribute('width', '0.5');
        body.setAttribute('height', '1.5');
        body.setAttribute('color', 'orange'); // Colore diverso per distinguere gli altri
        avatar.appendChild(body);

        // Aggiungi un piccolo "naso" per capire dove guarda
        const nose = document.createElement('a-box');
        nose.setAttribute('width', '0.15');
        nose.setAttribute('height', '0.15');
        nose.setAttribute('depth', '0.5');
        nose.setAttribute('position', '0 0.5 -0.25');
        nose.setAttribute('color', 'black');
        avatar.appendChild(nose);

        scene.appendChild(avatar);
        otherPlayers[data.id] = avatar;
    }

    // Aggiorna posizione e rotazione dell'altro giocatore
    const p = otherPlayers[data.id];
    p.object3D.position.set(data.x, data.y, data.z);
    // Converte la rotazione da gradi (A-Frame) a radianti (Three.js)
    p.object3D.rotation.y = (data.ry * Math.PI) / 180;
});

// Rimuovi avatar se un giocatore si disconnette
socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.removeChild(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

console.log("Script.js caricato correttamente!");
