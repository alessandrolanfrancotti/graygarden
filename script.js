const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');

// Lock mouse
document.querySelector('a-scene').addEventListener('click', () => {
    document.querySelector('a-scene').canvas.requestPointerLock();
});

let isJumping = false;
let vVel = 0;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping && rig.object3D.position.y <= 0.2) {
        isJumping = true;
        vVel = 0.2;
    }
});

setInterval(() => {
    if (isJumping || rig.object3D.position.y > 0.1) {
        vVel -= 0.01;
        rig.object3D.position.y += vVel;
        if (rig.object3D.position.y <= 0.1) {
            rig.object3D.position.y = 0.1;
            isJumping = false;
            vVel = 0;
        }
    }
    
    if (socket.connected) {
        const p = rig.object3D.position;
        const r = document.getElementById('local-player').getAttribute('rotation');
        socket.emit('move', { x: p.x, y: p.y, z: p.z, ry: r.y });
    }
}, 20);
