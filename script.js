const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');
const localCamera = document.getElementById('local-player');

let isJumping = false;
let vVel = 0;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        vVel = 0.2;
    }
});

setInterval(() => {
    // Gestione Y (Salto)
    if (isJumping || rig.object3D.position.y > 0.1) {
        vVel -= 0.01;
        rig.object3D.position.y += vVel;
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            vVel = 0;
        }
    }

    // Invia la posizione calcolata dal motore fisico (X e Z sono bloccate dai muri)
    if (socket && socket.connected) {
        const p = rig.object3D.position;
        socket.emit('move', { x: p.x, y: p.y, z: p.z, ry: localCamera.getAttribute('rotation').y });
    }
}, 20);
