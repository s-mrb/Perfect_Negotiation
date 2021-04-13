// make sure this PORT is same as the one use in line 2 of peer_connection
var PORT = 55555

const express = require('express')
const app = express()
const Set_CORS = require('./Set_CORS')

var server = require('http').createServer(app)
var socket_io = require('socket.io')

// store users, users = {user_id:[count, socket]}
// count tells the number of users that connected with signaling server before this user
var users = {}
var count = 0

// io is the object which give access to different methods.
var io = socket_io(server)

// on receiving new connection add its socket and 
// count of users already connected with signaling server in users array against this user id 
io.on('connection', (socket) => {
  console.log('new connection!!')

  socket.on('register', ({ peerA_id }, callback) => {

    // add peer socket against its id
    // count is stored to know which peer connected first with the signaling server
    // the peer connected first with the server is assumed to be polite peer
    users[peerA_id] = [count++, socket]

    console.log('USER_ID ', peerA_id)
  })


  // when a peer (recognized by self_id) sends signal to another peer (recognized by peerB_id)
  // then assign one of these two as polite peer (peer which in case of collision will drop its offer)
  // users[self_id][0] tells the number of peers connected with signaling server before this peer, hence
  // if this number for caller (self_id) is smaller then make peerB as polite,
  // we make peerB polite by adding Polite attribute in the signal object sent by peerA to peerB 
  socket.on("signal",({signal_object, self_id, peerB_id}, callback)=>{


    // count is stored to know which peer connected first with the signaling server
    // the peer connected first with the server is assumed to be polite peer
    if ((users[self_id][0]) < (users[peerB_id][0])){
      signal_object.polite = true
    }
    else{
    signal_object.polite = false

    }
      users[peerB_id][1].emit("signal", signal_object, ()=>{})
  })
})

app.use(Set_CORS)

server.listen(PORT, () => {
  console.log(`Listening on\nhttp://localhost:${PORT}`)
})
