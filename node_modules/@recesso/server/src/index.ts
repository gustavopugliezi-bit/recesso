import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { GameRoom } from "./GameRoom.js";

const PORT = 3000;
const CLIENT_ORIGIN = "http://localhost:5173";
const SERVER_TICK_RATE = 30;
const TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE;

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const gameRoom = new GameRoom(io);

io.on("connection", (socket) => {
  gameRoom.handleConnection(socket);
});

setInterval(() => {
  gameRoom.emitWorldUpdate();
}, TICK_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`Servidor Socket.io a escutar na porta ${PORT}`);
  console.log(`Broadcast WORLD_UPDATE ativo a ${SERVER_TICK_RATE}Hz`);
});
