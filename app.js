const express = require("express")
const app = express()
const path = require("path")
const server = require("http").createServer(app)
const io = require("socket.io")(server)
const { v4: uuidv4 } = require("uuid")


app.set("view engine", "ejs")
app.use(express.static(path.join(__dirname, "public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const waitingUser = []


io.on("connection", function (socket) {
    socket.on("join-room", function () {
        if (waitingUser.length > 0) {
            var roomId = uuidv4()
            socket.join(roomId)
            waitingUser[0].join(roomId)
            waitingUser.pop()
            io.to(roomId).emit("joined",roomId)
        }
        else {
            waitingUser.push(socket)
        }
    })

    socket.on("message",function(data){
        socket.broadcast.to(data.room).emit("reseved-message", data)
    })

    socket.on("start-call",function(room){
        socket.broadcast.to(room).emit("incoming-call")
    })
    socket.on("accepted",function(room){
        socket.broadcast.to(room).emit("accepted")
    })
    socket.on("signalingMessage",function(data){
        socket.broadcast.to(data.room).emit("signalingMessage", data)
    })

    socket.on("user-disconnect",function(room){
        if(waitingUser.indexOf(socket) !== -1){
            waitingUser.pop()
        }
        socket.broadcast.to(room).emit("user-disconnect")
    })
})

app.get("/", function (req, res) {
    res.render("index")
})

app.get("/chat", function (req, res) {
    res.render("chat")
})

server.listen(3000)