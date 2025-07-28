const socket = io();

let username = '';
let currentChat = null;

const loginScreen = document.getElementById('loginScreen');
const chatApp = document.getElementById('chatApp');
const loginError = document.getElementById('loginError');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');

const userList = document.getElementById('userList');
const messages = document.getElementById('messages');
const messageForm = document.getElementById('chat-form');
const messageInput = document.getElementById('messageInput');
const typingIndicator = document.getElementById('typingIndicator');

const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebar = document.getElementById('sidebar');

const chatHeader = document.querySelector('.chat-header');

const unreadCounts = {};       // { contactName: number }
const messageHistory = {};     // { contactName: [ {sender, text, time} ] }
let typingTimeout;
let isTyping = false;

// --- LOGIN ---
loginBtn.onclick = () => {
  const name = usernameInput.value.trim();
  const pw = passwordInput.value.trim();
  if (!name) return loginError.innerText = 'Enter name.';
  if (pw !== '123') return loginError.innerText = 'Incorrect password.';
  socket.emit('login', { name, password: pw });
};

socket.on('loginError', msg => loginError.innerText = msg);

socket.on('loginSuccess', name => {
  username = name;
  loginScreen.classList.add('hidden');
  chatApp.classList.remove('hidden');
  addSystem('Welcome! Click a contact or start typing to begin.');
});

// --- USER LIST ---
socket.on('updateUsers', users => {
  userList.innerHTML = '';
  users.filter(u => u !== username).forEach(u => {
    if (!(u in unreadCounts)) unreadCounts[u] = 0;
    if (!(u in messageHistory)) messageHistory[u] = [];

    const li = document.createElement('li');
    li.className = 'contact';
    li.dataset.name = u;
    li.innerHTML = `<span class="name">${u}</span>`;
    if (unreadCounts[u] > 0) li.classList.add('unread');

    li.addEventListener('click', () => {
      openChat(u);
    });

    userList.appendChild(li);
  });
});

// --- SENDING AND RECEIVING MESSAGES ---
messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const textRaw = messageInput.value.trim();
  if (!textRaw) return;

  const recipient = currentChat || Object.keys(unreadCounts)[0];
  const text = sanitize(textRaw);
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  socket.emit('sendMessage', { sender: username, recipient, text, time });
  appendMessage(username, text, time);
  messageInput.value = '';

  socket.emit('stopTyping', { sender: username, recipient });
  isTyping = false;
});

socket.on('receiveMessage', ({ sender, recipient, text, time }) => {
  if (recipient === username) {
    messageHistory[sender].push({ sender, text, time });
    if (sender !== currentChat) {
      unreadCounts[sender]++;
      markUnreadDot(sender);
    } else {
      appendMessage(sender, text, time);
    }
  }

  if (sender === username && recipient === currentChat) {
    // already appended locally
  }
});

// --- TYPING INDICATOR ---
messageInput.addEventListener('input', () => {
  if (!currentChat) return;
  if (!isTyping) {
    socket.emit('typing', { sender: username, recipient: currentChat });
    isTyping = true;
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping', { sender: username, recipient: currentChat });
    isTyping = false;
  }, 1000);
});

socket.on('showTyping', name => {
  if (name === currentChat) {
    typingIndicator.innerText = `${name} is typing...`;
  }
});

socket.on('hideTyping', name => {
  if (name === currentChat) {
    typingIndicator.innerText = '';
  }
});

// --- SIDEBAR TOGGLE ---
openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

// --- HELPERS ---
function openChat(user) {
  currentChat = user;
  unreadCounts[user] = 0;
  clearUnreadDot(user);
  sidebar.classList.remove('open');
  messages.innerHTML = '';
  messageHistory[user].forEach(m => appendMessage(m.sender, m.text, m.time));

  chatHeader.innerHTML = `
    <button id="openSidebarBtn" class="hamburger" aria-label="Open contacts panel">☰</button>
    <span class="chat-partner" style="color: ${getColorForName(user)};">${user}</span>
  `;

  // Re-bind the hamburger menu
  document.getElementById('openSidebarBtn').addEventListener('click', () => {
    sidebar.classList.add('open');
  });
}

function appendMessage(senderName, text, time) {
  const isSelf = senderName === username;
  const div = document.createElement('div');
  div.className = 'message ' + (isSelf ? 'right' : 'left');
  div.innerHTML = `<p>${text}</p><span class="timestamp">${time}</span>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  if (senderName !== username && currentChat) {
    messageHistory[currentChat].push({ sender: senderName, text, time });
  }
}

function addSystem(text) {
  const div = document.createElement('div');
  div.className = 'message left';
  div.style.textAlign = 'center';
  div.style.fontStyle = 'italic';
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function sanitize(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function markUnreadDot(user) {
  const li = userList.querySelector(`.contact[data-name="${user}"]`);
  if (li) li.classList.add('unread');
}

function clearUnreadDot(user) {
  const li = userList.querySelector(`.contact[data-name="${user}"]`);
  if (li) li.classList.remove('unread');
}

function getColorForName(name) {
  const colors = ['#ff6b6b', '#6bc5ff', '#ffd93d', '#6fff7e', '#ff8bff', '#ffb347', '#63f5ef'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

