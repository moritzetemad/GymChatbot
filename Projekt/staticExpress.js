const express = require('express')
const { Server } = require('socket.io')
var http = require('http')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static('public'))
app.use('/css', express.static(__dirname + '/public/css'))
app.use('/js', express.static(__dirname + '/public/js'))
app.use('/images', express.static(__dirname + '/public/images'))

var bot = require('./bot.js')
var myBot = new bot()
var connections = {}

// Wenn Sich ein client Socket mit dem Server verbinden will kommt er hier an
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  let username = null

  socket.on('join', (data) => {
  username = data.name;
  connections[username] = socket;

  if (!myBot.connected && username !== 'Rick') {
    myBot.connect();
  }

  const welcomeMsg = {
    type: 'msg',
    name: 'Rick',
    msg: 'Hallo! Frag mich etwas über Zellorganellen! Nachdem du alle gelernt hast das ich dir beibringen kann kannst du am ende dein wissen in einem kleinen quiz testen. >:) (Du kannst das Quiz auch jederzeit starten wen du quiz schreibst )',
    sender: username  
  };

  socket.emit('message', welcomeMsg);
});

  socket.on('msg', (data) => {
    if (!username) return

    const msgObj = {
      type: 'msg',
      name: username,
      msg: data.msg,
      sender: data.sender
    }

    if (username === 'Rick' && data.sender) {
      const targetSocket = connections[data.sender]
      if (targetSocket) {
        targetSocket.emit('message', msgObj)
      }
    } else {
      io.emit('message', msgObj)
    }
  })

  socket.on('disconnect', () => {
    if (username && connections[username]) {
      delete connections[username]
      console.log(`User disconnected: ${username}`)

      const leaveMsg = {
        type: 'leave',
        name: username,
        names: Object.keys(connections)
      }

      io.emit('message', leaveMsg)
    }
  })
})

server.listen(8081, () => {
  console.log('Server started at http://localhost:8081')
})