const socket = io("https://graygarden.onrender.com");
const rig = document.getElementById('camera-rig');

// CONTROLLO AUTOMATICO FISICA
window.onload = () => {
    setTimeout(() => {
        if (rig.components['kinematic-body']) {
            console.log("✅ FISICA ATTIVA: I muri dovrebbero funzionare.");
        } else {
            console.error("❌ FISICA FALLITA: Il componente kinematic-body non è caricato!");
            alert("Errore: La fisica non è partita. Ricarica la pagina con CTRL+F5.");
        }
    }, 1000);
};

// LOGICA MOVIMENTO/SALTO
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
        socket.emit('move', { x: p.x, y: p.y, z: p.z, ry: document.getElementById('local-player').getAttribute('rotation').y });
    }
}, 20);
