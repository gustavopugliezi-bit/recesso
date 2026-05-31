import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const PORT = 3000;
const CLIENT_ORIGIN = "http://localhost:5173";
const SERVER_TICK_RATE = 30;
const TICK_INTERVAL_MS = 1000 / SERVER_TICK_RATE;

const players: Record<string, { x: number; y: number; z: number }> = {};

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);

  players[socket.id] = {
    x: Math.random() * 4 - 2,
    y: 0.9,
    z: -4
  };

  socket.on("disconnect", () => {
    delete players[socket.id];
    console.log(`Jogador desconectado: ${socket.id}`);
  });
});

setInterval(() => {
  io.emit("WORLD_UPDATE", players);
}, TICK_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`Servidor Socket.io a escutar na porta ${PORT}`);
  console.log(`Broadcast WORLD_UPDATE ativo a ${SERVER_TICK_RATE}Hz`);
});
