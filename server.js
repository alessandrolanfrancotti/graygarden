const socket = io("https://graygarden.onrender.com");

// Quando clicco, dico al server dove mi trovo
window.addEventListener("click", (event) => {
    const posizione = { x: event.clientX, y: event.clientY };
    socket.emit("click-del-giocatore", posizione);
});

// Quando il server mi dice che qualcuno ha cliccato, disegno
socket.on("disegna-cerchio", (data) => {
    const cerchio = document.createElement("div");
    cerchio.style.position = "absolute";
    cerchio.style.left = data.x + "px";
    cerchio.style.top = data.y + "px";
    cerchio.style.width = "20px";
    cerchio.style.height = "20px";
    cerchio.style.backgroundColor = data.id === socket.id ? "blue" : "red"; // Blu io, rosso gli altri
    cerchio.style.borderRadius = "50%";
    document.body.appendChild(cerchio);
});
