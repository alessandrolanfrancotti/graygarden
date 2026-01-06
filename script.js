const socket = io("https://graygarden.onrender.com");

socket.on("connect", () => {
    console.log("CONNESSO! Il mio ID è: " + socket.id);
    document.body.innerHTML = "<h1>Connesso al Server Multiplayer! 🚀</h1><p>Controlla la console (F12) per il tuo ID.</p>";
});

socket.on("connect_error", (err) => {
    console.error("Errore di connessione:", err);
});