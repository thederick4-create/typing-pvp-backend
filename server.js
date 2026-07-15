const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  }
});

let waitingPlayer = null;
let rooms = {}; 

const sentences = [
  "the quick brown fox jumps over the lazy dog",
  "goblins invade dungeons with sharp rusty swords",
  "magical bards sing songs of ancient power",
  "coding a game on a phone requires patience and skill"
];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_game', () => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const roomId = `room_${waitingPlayer.id}_${socket.id}`;
      const gameSentence = sentences[Math.floor(Math.random() * sentences.length)];
      
      socket.join(roomId);
      waitingPlayer.join(roomId);

      rooms[roomId] = {
        players: [waitingPlayer.id, socket.id],
        sentence: gameSentence
      };

      io.to(roomId).emit('game_start', {
        roomId: roomId,
        sentence: gameSentence,
        opponentId: socket.id === waitingPlayer.id ? socket.id : waitingPlayer.id
      });

      waitingPlayer = null; 
    } else {
      waitingPlayer = socket;
      socket.emit('waiting', 'Searching for an opponent...');
    }
  });

  socket.on('type_progress', (data) => {
    socket.to(data.roomId).emit('opponent_progress', {
      percent: data.percent
    });
  });

  socket.on('game_won', (data) => {
    io.to(data.roomId).emit('game_over', {
      winnerId: socket.id
    });
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Multiplayer server running on port ${PORT}`);
});

