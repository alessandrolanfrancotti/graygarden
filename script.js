// Aspettiamo che la scena sia caricata
document.querySelector('a-scene').addEventListener('click', function () {
    // Quando clicchi sulla schermata, il mouse viene "catturato" per ruotare la visuale
    this.canvas.requestPointerLock();
});

console.log("Sistema di movimento pronto. Usa WASD per muoverti.");
