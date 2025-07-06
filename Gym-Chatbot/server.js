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

io.on('connection', (socket) => {
  let username = null

  socket.on('join', async (data) => {
    username = data.name

    const bot = new ChatBot('./intents.json')
    await bot.init()
    bots.set(socket.id, bot)

    const welcome = await bot.processInput('')
    socket.emit('message', {
      type: 'msg',
      name: 'Ronnie Coleman',
      msg: welcome,
      sender: username
    })
  })

  socket.on('msg', async (data) => {
    const bot = bots.get(socket.id)
    if (!bot) return

    const reply = await bot.processInput(data.msg)

    if (Array.isArray(reply)) {
      reply.forEach((msg, i) => {
        setTimeout(() => {
          socket.emit('message', {
            type: 'msg',
            name: 'Ronnie Coleman',
            msg,
            sender: data.sender
          })
        }, i * 1000)
      })
    } else {
      socket.emit('message', {
        type: 'msg',
        name: 'Ronnie Coleman',
        msg: reply,
        sender: data.sender
      })
    }
  })

  socket.on('disconnect', () => {
    bots.delete(socket.id)
  })
})

const port = process.env.PORT || 8081
server.listen(port, () => {
  const link = `http://localhost:${port}`
  console.log(`Server läuft auf ${link}`)
})
