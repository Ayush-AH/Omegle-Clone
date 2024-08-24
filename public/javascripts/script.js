const socket = io()
var room;
var messageContainer = document.querySelector("#message-container")
//webRTC 
var localStream;
var remoteStream;
var peerConnection;
var stunServer = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
}


socket.emit("join-room")

socket.on("joined", function (roomId) {
    room = roomId
    document.querySelector("#connecting").classList.add("hidden")
    document.querySelector("#message-container").classList.remove("hidden")
})

//messages
document.querySelector("form").addEventListener("submit", function (e) {
    e.preventDefault()
    var message = document.querySelector("#message-input").value
    messageContainer.innerHTML += `
      <div class="flex items-center justify-end py-1">
                    <div class="p-2 rounded-tr-none rounded bg-blue-600 text-white">
                        <p>${message}</p>
                    </div>
                </div>`
    document.querySelector("#message-input").value = ""

    socket.emit("message", { room, message })

})

socket.on("reseved-message", function (data) {
    messageContainer.innerHTML += `
     <div class="flex items-center justify-start py-1">
                    <div class="p-2 rounded-tl-none rounded bg-zinc-100 text-black">
                        <p>${data.message}</p>
                    </div>
                </div>`
})


//video call start
document.querySelector("#start-call").addEventListener("click", function () {
    socket.emit("start-call", room)
})

socket.on("incoming-call", function () {
    document.querySelector("#call-panel").classList.remove("hidden")
})

socket.on("signalingMessage", async function (data) {
    var { type, offer, answer, candidate } = data

    if (type === "candidate" && peerConnection) {
        await peerConnection.addIceCandidate(candidate)
    }

    if (type === "offer") {
        await peerConnection.setRemoteDescription(offer)
        var answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        socket.emit("signalingMessage", { type: "answer", room, answer })
    }
    if (type === "answer") {
        if (!peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(answer)
        }
    }
    if (type === "endcall") {
        handleEndCall()
    }
})

async function initialize(isCaller) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        })
    }
    catch (err) {
        console.error("Error accessing media devices:", err)
    }

    await createPeerConnection()
    if (isCaller) {
        var offer = await peerConnection.createOffer()
        peerConnection.setLocalDescription(offer)
        socket.emit("signalingMessage", { type: "offer", room, offer })
    }
}

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(stunServer)
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log("sending candidate");

            socket.emit("signalingMessage", { type: "candidate", room, candidate: event.candidate })
        }
    }

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream))
    document.querySelector("#localVideo").srcObject = localStream

    remoteStream = new MediaStream()
    document.querySelector("#remoteVideo").srcObject = remoteStream
    peerConnection.ontrack = event => event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track))
}
//accept call
document.querySelector("#accept-call").addEventListener("click", function () {
    document.querySelector("#call-panel").classList.add("hidden")
    document.querySelector("#video-panel").classList.remove("hidden")
    socket.emit("accepted", room)
    initialize(false)
})

socket.on("accepted", function () {
    initialize(true)
    document.querySelector("#video-panel").classList.remove("hidden")
})

//reject call
document.querySelector("#reject-call").addEventListener("click", function () {
    document.querySelector("#call-panel").classList.add("hidden")
})

//end call
document.querySelector("#callbtn").addEventListener("click", function () {
    handleEndCall()
    socket.emit("signalingMessage", { type: "endcall", room })
})
//mute
document.querySelector("#mutebtn").addEventListener("click", function () {
    var mutedbtn = document.querySelector("#mutebtn")
    handleControlles(0, "ri-mic-fill", "ri-mic-off-fill", mutedbtn)
})
//camera
document.querySelector("#camerabtn").addEventListener("click", function () {
    var camerabtn = document.querySelector("#camerabtn")
    handleControlles(1, "ri-video-on-fill", "ri-video-off-fill", camerabtn)
})

function handleControlles(index, onIcon, offIcon, controllbtn) {
    localStream.getTracks()[index].enabled = !localStream.getTracks()[index].enabled
    if (!localStream.getTracks()[index].enabled) {
        controllbtn.classList.add("not-active")
        controllbtn.querySelector("i").classList.remove(onIcon)
        controllbtn.querySelector("i").classList.add(offIcon)
    }
    else if (localStream.getTracks()[index].enabled) {
        controllbtn.classList.remove("not-active")
        controllbtn.querySelector("i").classList.add(onIcon)
        controllbtn.querySelector("i").classList.remove(offIcon)
    }

}

//disconnect
window.addEventListener("beforeunload", function () {
    socket.emit("user-disconnect", room)
})

socket.on("user-disconnect", function () {
    room = ""
    messageContainer.classList.add("hidden")
    document.querySelector("#connecting").classList.remove("hidden")
    handleEndCall()
    socket.emit("join-room")
})

function handleEndCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
        remoteStream = null;
    }
    document.querySelector("#video-panel").classList.add("hidden");
}
