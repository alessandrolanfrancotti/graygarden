const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permette connessioni da qualsiasi origine
    }
});

// Serve i file statici (il tuo index.html, personaggio.png, ecc.)
app.use(express.static(__dirname));

// Gestione dei giocatori connessi
const players = {};

io.on('connection', (socket) => {
    console.log(`Giocatore connesso: ${socket.id}`);

    // Quando un giocatore si muove
    socket.on('move', (data) => {
        // Aggiorniamo i dati nel server (opzionale, ma utile)
        players[socket.id] = data;

        // Invia i dati a TUTTI gli altri giocatori connessi
        socket.broadcast.emit('player-moved', {
            id: socket.id,
            x: data.x,
            y: data.y,
            z: data.z
        });
    });

    // Quando un giocatore si disconnette
    socket.on('disconnect', () => {
        console.log(`Giocatore disconnesso: ${socket.id}`);
        delete players[socket.id];
        // Avvisa gli altri di rimuovere il personaggio
        io.emit('player-disconnected', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
