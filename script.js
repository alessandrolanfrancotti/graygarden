// Gestione del Salto
let canJump = true;
const rig = document.getElementById('camera-rig');

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && canJump) {
        // Applichiamo una velocità verso l'alto
        const currentPos = rig.getAttribute('position');
        
        // Semplice animazione di salto (visto che kinematic-body è complesso da gestire via script puro)
        // Usiamo un piccolo trucco di movimento fluido
        let jumpHeight = 0;
        let jumpSpeed = 0.15;
        
        canJump = false;

        const jumpInterval = setInterval(() => {
            jumpHeight += jumpSpeed;
            jumpSpeed -= 0.01; // Simula la gravità
            
            rig.setAttribute('position', { 
                x: currentPos.x, 
                y: Math.max(0.1, currentPos.y + jumpHeight), 
                z: currentPos.z 
            });

            if (jumpHeight <= 0 && jumpSpeed < 0) {
                clearInterval(jumpInterval);
                canJump = true;
            }
        }, 20);
    }
});
