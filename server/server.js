const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Messaggio di test per Render
app.get('/', (req, res) => {
    res.send('Server 3D GrayGarden Online! 🚀');
});

let players = {};

io.on('connection', (socket) => {
    console.log('Giocatore connesso:', socket.id);

    // Invia i giocatori esistenti al nuovo arrivato
    socket.emit('current-players', players);

    // Gestisce il movimento
    socket.on('move', (data) => {
        players[socket.id] = data;
        // Invia la posizione agli altri (broadcast)
        socket.broadcast.emit('player-moved', { id: socket.id, ...data });
    });

    // Gestisce la disconnessione
    socket.on('disconnect', () => {
        console.log('Giocatore disconnesso:', socket.id);
        delete players[socket.id];
        io.emit('player-disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
