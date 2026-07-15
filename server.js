<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PvP Typing Battle - Realtime Arena</title>
  <!-- Load Socket.io client -->
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --accent: #3b82f6;
      --text-main: #f8fafc;
      --text-muted: #64748b;
      --correct: #10b981;
      --wrong: #ef4444;
    }

    body {
      margin: 0;
      padding: 16px;
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }

    .container {
      width: 100%;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 10px;
    }

    h1 {
      margin: 0;
      text-align: center;
      font-size: 1.6rem;
      color: var(--accent);
    }

    /* PvP Progress Arena Styles */
    .arena-card {
      background: var(--card-bg);
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 12px;
    }

    .player-row {
      margin-bottom: 12px;
    }
    .player-row:last-child {
      margin-bottom: 0;
    }

    .player-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .progress-bar-bg {
      background: #0f172a;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      width: 0%;
      background: var(--accent);
      transition: width 0.1s ease;
    }

    #opp-fill {
      background: #a855f7; /* Opponent gets a purple bar */
    }

    .text-display {
      background: var(--card-bg);
      padding: 16px;
      border-radius: 12px;
      font-size: 1.1rem;
      line-height: 1.5;
      border: 1px solid #334155;
      min-height: 60px;
    }

    .char-correct { color: var(--correct); }
    .char-wrong { color: var(--wrong); background-color: rgba(239, 68, 68, 0.2); }
    .char-current { border-bottom: 2px solid var(--accent); }

    .input-box {
      width: 100%;
      background: var(--card-bg);
      border: 2px solid #334155;
      border-radius: 8px;
      padding: 14px;
      color: var(--text-main);
      font-size: 1rem;
      box-sizing: border-box;
      outline: none;
      -webkit-text-security: none; 
    }

    .btn {
      background: var(--accent);
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    }
    .btn:disabled {
      background: var(--text-muted);
      cursor: not-allowed;
    }
  </style>
</head>
<body>

  <div class="container">
    <h1>PvP Typing Arena</h1>

    <!-- 1. Battle Progress Trackers -->
    <div class="arena-card">
      <div class="player-row">
        <div class="player-label">
          <span>You (Blue)</span>
          <span id="your-percent">0%</span>
        </div>
        <div class="progress-bar-bg">
          <div id="your-fill" class="progress-fill"></div>
        </div>
      </div>
      <div class="player-row">
        <div class="player-label">
          <span>Opponent (Purple)</span>
          <span id="opp-percent">0%</span>
        </div>
        <div class="progress-bar-bg">
          <div id="opp-fill" class="progress-fill"></div>
        </div>
      </div>
    </div>

    <!-- 2. Interactive text box -->
    <div id="status-text" style="text-align: center; color: var(--accent);">Tap "Find Match" to start</div>
    <div id="text-display" class="text-display">Waiting...</div>

    <input 
      type="password" 
      id="typing-input" 
      class="input-box" 
      placeholder="Wait for match..."
      disabled
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    />

    <button id="match-btn" class="btn">Find Match</button>
  </div>

  <script>
    // ⚠️ REPLACE THIS LINK WITH YOUR LIVE GLITCH URL!
    const SERVER_URL = "https://your-project-name.glitch.me"; 
    
    const socket = io(SERVER_URL);

    let currentTarget = "";
    let activeRoom = null;
    let gameActive = false;

    const textDisplay = document.getElementById('text-display');
    const typingInput = document.getElementById('typing-input');
    const matchBtn = document.getElementById('match-btn');
    const statusText = document.getElementById('status-text');
    const yourFill = document.getElementById('your-fill');
    const yourPercent = document.getElementById('your-percent');
    const oppFill = document.getElementById('opp-fill');
    const oppPercent = document.getElementById('opp-percent');

    // Button to join queue
    matchBtn.addEventListener('click', () => {
      statusText.textContent = "Connecting to matchmaking...";
      matchBtn.disabled = true;
      socket.emit('join_game');
    });

    // Server says we are waiting in queue
    socket.on('waiting', (msg) => {
      statusText.textContent = "Searching for opponent...";
      textDisplay.textContent = "Lobby queue active. Waiting for player 2...";
    });

    // Match found! Let's play
    socket.on('game_start', (data) => {
      activeRoom = data.roomId;
      currentTarget = data.sentence;
      gameActive = true;
      
      statusText.textContent = "MATCH FOUND! GO!";
      typingInput.disabled = false;
      typingInput.value = "";
      typingInput.focus();

      // Reset bars
      yourFill.style.width = "0%";
      yourPercent.textContent = "0%";
      oppFill.style.width = "0%";
      oppPercent.textContent = "0%";

      updateDisplay("");
    });

    // Track Opponent's Progress
    socket.on('opponent_progress', (data) => {
      oppFill.style.width = `${data.percent}%`;
      oppPercent.textContent = `${data.percent}%`;
    });

    // Typing processing
    typingInput.addEventListener('input', () => {
      if (!gameActive) return;

      const val = typingInput.value;
      updateDisplay(val);

      // Send our progress percentage to the server
      const percent = Math.min(100, Math.round((val.length / currentTarget.length) * 100));
      yourFill.style.width = `${percent}%`;
      yourPercent.textContent = `${percent}%`;

      socket.emit('type_progress', {
        roomId: activeRoom,
        percent: percent
      });

      // Victory Condition
      if (val === currentTarget) {
        gameActive = false;
        socket.emit('game_won', { roomId: activeRoom });
      }
    });

    // Game End trigger
    socket.on('game_over', (data) => {
      gameActive = false;
      typingInput.disabled = true;
      matchBtn.disabled = false;
      
      if (data.winnerId === socket.id) {
        statusText.textContent = "👑 VICTORY! You won!";
      } else {
        statusText.textContent = "❌ DEFEAT! Opponent finished first!";
      }
    });

    function updateDisplay(typedText) {
      let html = "";
      for (let i = 0; i < currentTarget.length; i++) {
        const char = currentTarget[i];
        if (i < typedText.length) {
          html += `<span class="${typedText[i] === char ? 'char-correct' : 'char-wrong'}">${char}</span>`;
        } else if (i === typedText.length) {
          html += `<span class="char-current">${char}</span>`;
        } else {
          html += `<span>${char}</span>`;
        }
      }
      textDisplay.innerHTML = html;
    }
  </script>
</body>
</html>
