const socket = io("https://graygarden.onrender.com");
const scene = document.querySelector('a-scene');
const localCamera = document.getElementById('local-player');
const otherPlayers = {};

// 1. Invia la mia posizione ogni 50ms
setInterval(() => {
    if (socket.connected) {
        const pos = localCamera.getAttribute('position');
        const rot = localCamera.getAttribute('rotation');
        socket.emit('move', {
            x: pos.x, y: pos.y, z: pos.z,
            rx: rot.x, ry: rot.y, rz: rot.z
        });
    }
}, 50);

// 2. Crea gli avatar dei giocatori già presenti
socket.on('current-players', (players) => {
    Object.keys(players).forEach((id) => {
        if (id !== socket.id) createPlayerAvatar(id, players[id]);
    });
});

// 3. Muove o crea un avatar quando qualcuno si muove
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        createPlayerAvatar(data.id, data);
    } else {
        const avatar = otherPlayers[data.id];
        avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
        avatar.setAttribute('rotation', { x: data.rx, y: data.ry, z: data.rz });
    }
});

// 4. Rimuove l'avatar quando qualcuno esce
socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) {
        scene.removeChild(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

// Funzione di supporto per creare un avatar (un cubo colorato)
function createPlayerAvatar(id, data) {
    const avatar = document.createElement('a-box');
    avatar.setAttribute('id', id);
    avatar.setAttribute('position', { x: data.x, y: data.y, z: data.z });
    avatar.setAttribute('rotation', { x: data.rx, y: data.ry, z: data.rz });
    avatar.setAttribute('color', '#' + Math.floor(Math.random()*16777215).toString(16)); // Colore casuale
    avatar.setAttribute('width', '0.5');
    avatar.setAttribute('height', '1.5');
    avatar.setAttribute('depth', '0.5');
    scene.appendChild(avatar);
    otherPlayers[id] = avatar;
}
