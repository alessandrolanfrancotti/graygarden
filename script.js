// Forza il rig a resettare la telecamera se prova a muoversi indipendentemente
const rig = document.getElementById('camera-rig');

document.querySelector('a-scene').addEventListener('click', function () {
    this.canvas.requestPointerLock();
});

// Messaggio di log per verificare che il file carichi
console.log("Personaggio pronto. Se premi W e il cubo blu non avanza, scrivimelo subito.");
