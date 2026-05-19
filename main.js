import http from "http";
import { WebSocketServer } from "ws";
import net from "net";

const PORT = process.env.PORT || 8080;

const SSH_HOST = "185.194.204.52";
const SSH_PORT = 22;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("WebSocket SSH Proxy Online");
});

const wss = new WebSocketServer({
  server,
  perMessageDeflate: false
});

wss.on("connection", (ws, req) => {
  console.log("[WS] Cliente conectado");

  ws.on("error", (err) => {
    console.log("[WS ERROR]", err.message);
  });

  const socket = net.connect(SSH_PORT, SSH_HOST, () => {
    console.log("[SSH] Conectado ao servidor SSH");
  });

  socket.on("data", (data) => {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    } catch (e) {
      console.log("[SEND ERROR]", e.message);
    }
  });

  ws.on("message", (msg) => {
    try {
      socket.write(msg);
    } catch (e) {
      console.log("[WRITE ERROR]", e.message);
    }
  });

  socket.on("close", () => {
    console.log("[SSH] Conexão fechada");
    ws.close();
  });

  ws.on("close", () => {
    console.log("[WS] Cliente desconectado");
    socket.destroy();
  });

  socket.on("error", (err) => {
    console.log("[SSH ERROR]", err.message);
    ws.close();
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`WS Proxy rodando na porta ${PORT}`);
});
