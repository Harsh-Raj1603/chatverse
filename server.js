const express = require('express');
const http = require('http');
// const mongoose = require('mongoose');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('✅ MongoDB Connected'))
//   .catch(err => console.log(err));

const users = {}; // { socketId: { name } }
const userSockets = {}; // { name: socketId }

io.on('connection', socket => {
  console.log('🟢 New client connected', socket.id);
  
  socket.on('login', ({ name, password }) => {
    if (!name || password !== '123') {
      return socket.emit('loginError', 'Invalid name or password.');
    }
    users[socket.id] = { name };
    userSockets[name] = socket.id;

    socket.emit('loginSuccess', name);
    io.emit('updateUsers', Object.values(users).map(u => u.name));
  });

  socket.on('sendMessage', ({ sender, recipient, text, time }) => {
    const toSocket = userSockets[recipient];
    if (toSocket) {
      io.to(toSocket).emit('receiveMessage', { sender, recipient, text, time });
    }
    // echo back to sender
    socket.emit('receiveMessage', { sender, recipient, text, time });
  });

  socket.on('typing', ({ sender, recipient }) => {
    const toSocket = userSockets[recipient];
    if (toSocket) io.to(toSocket).emit('showTyping', sender);
  });

  socket.on('stopTyping', ({ sender, recipient }) => {
    const toSocket = userSockets[recipient];
    if (toSocket) io.to(toSocket).emit('hideTyping', sender);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected', socket.id);
    const name = users[socket.id]?.name;
    delete users[socket.id];
    if (name) delete userSockets[name];
    io.emit('updateUsers', Object.values(users).map(u => u.name));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
