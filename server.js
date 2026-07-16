const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let waitingPlayers = {
  chaos: null,
  t9: null,
  death: null,
  tug: null
};

let rooms = {};

// Long paragraphs to generate enough typing time for attacks!
const paragraphs = [
  "In the deepest chambers of the forgotten dungeon, a glowing chest sat silently upon a stone altar. The rogue approached with silent footsteps, keeping a watchful eye out for hidden pressure plates and poison dart traps. Suddenly, the ancient stone door slammed shut, and the torches flared with a violent purple fire.",
  "Deep-space salvage vessel Genesis detected a faint distress beacon originating from an uncharted nebula. The captain ordered the crew to battle stations as they dropped out of warp drive. Before them lay a massive graveyard of derelict starships, drifting silently in the cosmic dust of a dead solar system.",
  "The alchemist carefully measured three drops of dragon blood into the boiling cauldron. A thick silver vapor rose from the mixture, filling the dimly lit stone laboratory with the sweet scent of ozone and stardust. One wrong ingredient would trigger a chaotic explosion, leveling the entire wizard academy."
];

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // 1. JOIN MATCHMAKING WITH LOBBY TYPE, USERNAME, AND WIN STREAK
  socket.on('join_game', (data) => {
    const { mode, username, streak } = data;
    
    // Safety check for mode
    const selectedMode = mode || 'chaos';

    if (waitingPlayers[selectedMode] && waitingPlayers[selectedMode].id !== socket.id) {
      const opponent = waitingPlayers[selectedMode];
      const roomId = `room_${selectedMode}_${opponent.id}_${socket.id}`;
      
      socket.join(roomId);
      opponent.join(roomId);

      // Choose a long paragraph
      const gameText = paragraphs[Math.floor(Math.random() * paragraphs.length)];

      rooms[roomId] = {
        players: [opponent.id, socket.id],
        mode: selectedMode,
        sentence: gameText
      };

      // Start the match for both players
      io.to(roomId).emit('game_start', {
        roomId: roomId,
        sentence: gameText,
        p1: { id: opponent.id, username: opponent.username, streak: opponent.streak },
        p2: { id: socket.id, username: username, streak: streak }
      });

      waitingPlayers[selectedMode] = null;
    } else {
      // Put player in mode queue
      socket.username = username || "Anonymous";
      socket.streak = streak || 0;
      waitingPlayers[selectedMode] = socket;
      socket.emit('waiting', `Searching for an opponent in ${selectedMode.toUpperCase()} mode...`);
    }
  });

  // 2. SYNC PROGRESS WITH OPPONENT
  socket.on('type_progress', (data) => {
    socket.to(data.roomId).emit('opponent_progress', {
      percent: data.percent
    });
  });

  // 3. PASS ATTACKS BACK AND FORTH
  socket.on('cast_attack', (data) => {
    // Relay the attack directly to the opponent in the room
    socket.to(data.roomId).emit('receive_attack', {
      type: data.type // 'smoke' or 'scramble'
    });
  });

  // 4. DETERMINE WINNER
  socket.on('game_won', (data) => {
    io.to(data.roomId).emit('game_over', {
      winnerId: socket.id
    });
    delete rooms[data.roomId];
  });

  // HANDLE DISCONNECTS
  socket.on('disconnect', () => {
    for (let mode in waitingPlayers) {
      if (waitingPlayers[mode] && waitingPlayers[mode].id === socket.id) {
        waitingPlayers[mode] = null;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
