const socket = io("https://graygarden.onrender.com");

window.addEventListener("click", (event) => {
    socket.emit("click-del-giocatore", { x: event.clientX, y: event.clientY });
});

socket.on("disegna-cerchio", (data) => {
    const cerchio = document.createElement("div");
    cerchio.style.position = "absolute";
    cerchio.style.left = (data.x - 10) + "px";
    cerchio.style.top = (data.y - 10) + "px";
    cerchio.style.width = "20px";
    cerchio.style.height = "20px";
    cerchio.style.borderRadius = "50%";
    cerchio.style.backgroundColor = data.id === socket.id ? "blue" : "red";
    document.body.appendChild(cerchio);
});
