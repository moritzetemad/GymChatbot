const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const ChatBot = require('./chatbot')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static('public'))
app.use('/css', express.static(__dirname + '/public/css'))
app.use('/js', express.static(__dirname + '/public/js'))
app.use('/images', express.static(__dirname + '/public/images'))

const bots = new Map()
const connections = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  let username = null

  socket.on('join', async (data) => {
    username = data.name
    connections.set(socket.id, socket)

    if (!bots.has(socket.id)) {
      try {
        const bot = new ChatBot('./intents.json')
        if (bot.init) {
          await bot.init()
        }
        bots.set(socket.id, bot)
      } catch (err) {
        console.error('Fehler beim Initialisieren des Bots:', err)
        socket.emit('message', {
          type: 'msg',
          name: 'Ronnie Coleman',
          msg: 'Entschuldigung, der Bot kann momentan nicht starten.',
          sender: username
        })
        return
      }
    }

    const userBot = bots.get(socket.id)
    const welcomeMsgText = await userBot.processInput('')

    const welcomeMsg = {
      type: 'msg',
      name: 'Ronnie Coleman',
      msg: welcomeMsgText,
      sender: username
    }
    socket.emit('message', welcomeMsg)
  })

  socket.on('msg', async (data) => {
    if (!bots.has(socket.id)) return

    const userBot = bots.get(socket.id)
    try {
      const userMessage = data.msg
      const botReply = await userBot.processInput(userMessage)

      const botMsgObj = {
        type: 'msg',
        name: 'Ronnie Coleman',
        msg: botReply,
        sender: data.sender
      }
      socket.emit('message', botMsgObj)
    } catch (err) {
      console.error('Fehler bei der Bot-Antwort:', err)
    }
  })

  socket.on('disconnect', () => {
    if (connections.has(socket.id)) {
      connections.delete(socket.id)
    }
    if (bots.has(socket.id)) {
      bots.delete(socket.id)
    }
    console.log(`User disconnected: ${socket.id}`)
  })
})

const port = process.env.PORT || 8081;
server.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});


