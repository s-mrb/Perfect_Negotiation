// make sure this PORT is same as the one on which server is running
var PORT = 55555
var socket = io(`http://localhost:${PORT}/`, {
  transports: ['websocket', 'polling', 'flashsocket'],
})





// Better then above commented one
const config = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
}


const pc = new RTCPeerConnection(config)

  // Video Stream Elements setup
  const constraints = { audio: true, video: true }
  const selfVideo = document.querySelector('video.selfview')
  const remoteVideo = document.querySelector('video.remoteview')
  
  // Connecting to the remote peer
  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
  
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream)
      }
      selfVideo.srcObject = stream
    } catch (err) {
      console.error(err)
    }
  }
  
  // Handling incoming tracks
  pc.ontrack = ({ track, streams }) => {
    track.onunmute = () => {
      if (remoteVideo.srcObject) {
        return
      }
      remoteVideo.srcObject = streams[0]
    }
  }
  



var peerB_id
var peerA_id

socket.on('connect', () => {
  peerA_id = uuid.v4()
  socket.emit('register', { peerA_id }, () => {})
})

let ignoreOffer = false
let makingOffer = false

socket.on("signal",async ({  description, candidate, polite  })=>{
  console.log(description)
  console.log(candidate)
  try {
    if (description) {

      const offerCollision =
        description.type == 'offer' &&
        (makingOffer || pc.signalingState != 'stable')

      ignoreOffer = !polite && offerCollision
      if (ignoreOffer) {
        return
      }

      await pc.setRemoteDescription(description)
      if (description.type == 'offer') {
        await pc.setLocalDescription()
        signaler.send({ description: pc.localDescription })
      }
    } else if (candidate) {
      try {
        await pc.addIceCandidate(candidate)
      } catch (err) {
        if (!ignoreOffer) {
          throw err
        }
      }
    }
  } catch (err) {
    console.error(err)
  }

})

class SignalingChannel {
  send(signal_object) {
    console.log(peerB_id)
    socket.emit('signal', {self_id:peerA_id, peerB_id, signal_object }, () => {})
  }
}

const signaler = new SignalingChannel()



function Call() {
  peerB_id = document.getElementById('peer_id').value
  console.log("peerB_id = ",peerB_id)


  start()


// Handling the negotiating needed
pc.onnegotiationneeded = async () => {
  try {
    makingOffer = true
    await pc.setLocalDescription()
    signaler.send({ description: pc.localDescription })
  } catch (err) {
    console.error(err)
  } finally {
    makingOffer = false
  }
}

// Handling incoming ICE candidate
pc.onicecandidate = ({ candidate }) => {
  signaler.send({ candidate })
}


}




// SOME NOTES
// connections can be established more quickly by allowing the ICE agent to start fetching ICE candidates
// before you start trying to connect, so that they're already available for
// inspection when RTCPeerConnection.setLocalDescription() is called.





// signaling state is stable if either local and remote description is null and
// connection has not initiated or when the negotiation is complete and a connection has been established.

// offer collision when either is true
//  - connection is established previosuly but
//                -- localdescription and remote description have inconsistency in terms of the type of the offer
//  -

// onnegotiationneed is asyn and while signaler is sending the localdescription the makingoffer is true else it is false
// lets suppose while sending the local description we receive an offer from remote peer
// so now this is a collision
//
// lets suppose we already sent the local description when we receive an offer from remote peer
// now making offer is false (see 'finally' of 'negotiationneeded')
// Now signalling state is not stable but makingoffer is false, hence a collision

// When in the lifetime of connection the signaling state is not stable, it is either of the following
//        a - "have-local-offer"
//        b - "have-remote-offer"
//        c - "have-local-pranswer"
//        d - "have-remote-pranswer"

// In case of a we have a collision because both peers have offer and both are acting as caller
// In case of b we don't know for sure whether we are acting as caller or as callee,
//            this case is technically not a collision but for the sake of simplicity we will be using this varibale for two purposes,
//            one when we have collision and two when we have an offer from remote peer but connection is not established yet
// In case of c it is not possible to have local peer answer in response to remote peer offer if signaling is working properly,
//            since we received offer from remote peer it means signalling is working properly hence the only scenario in which
//            we can have this c condition is when this connection setup is for renegotiation and answer we have is the one from previous successful connection,
//            and we must discard it and make new answer
// In case of d it is not possible to have remote peer answer when we know that in current connection establishment remote peer is acting as caller,
//            so this means that this answer is from previous connection and must be discarded and signaling state must be updated.
