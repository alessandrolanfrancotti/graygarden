const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Pagina di benvenuto per confermare che il server è vivo
app.get('/', (req, res) => {
  res.send('Server di GrayGarden attivo!');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permette la connessione da GitHub Pages
  }
});

io.on('connection', (socket) => {
  console.log('Un giocatore si è connesso! ID:', socket.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
