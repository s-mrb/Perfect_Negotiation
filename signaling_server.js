const express = require('express')
const app = express()
const dotenv = require('dotenv')
const Set_CORS = require('./Set_CORS')
dotenv.config()

var server = require('http').createServer(app)
var socket_io = require('socket.io')
const { symlinkSync } = require('fs')
const { exit } = require('process')
var users = {}
// io is the object which give access to different methods.
var io = socket_io(server)
var count = 0
io.on('connection', (socket) => {
  console.log('new connection!!')

  socket.on('register', ({ peerA_id }, callback) => {
    users[peerA_id] = [count++, socket]

    console.log('USER_ID ', peerA_id)
  })


  socket.on("signal",({signal_object,self_id, peerB_id}, callback)=>{

  if (peerB_id){

    if ((users[self_id][0]) < (users[peerB_id][0])){
      signal_object.polite = true
    }
    else{
    signal_object.polite = false

    }
      users[peerB_id][1].emit("signal", signal_object, ()=>{})
  }
  })
})

var PORT = process.env.PORT || 55555
app.use(Set_CORS)

server.listen(PORT, () => {
  console.log(`Listening on\nhttp://localhost:${PORT}`)
})
