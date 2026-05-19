import http from "http";
import { WebSocketServer } from "ws";
import net from "net";

const PORT = process.env.PORT || 8080;

const SSH_HOST = "185.194.204.52";
const SSH_PORT = 22;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket Proxy Online");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const socket = net.connect(SSH_PORT, SSH_HOST);

  socket.on("data", (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });

  ws.on("message", (msg) => {
    socket.write(msg);
  });

  socket.on("close", () => {
    ws.close();
  });

  ws.on("close", () => {
    socket.destroy();
  });

  socket.on("error", (err) => {
    console.log("Socket Error:", err.message);
    ws.close();
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`WS Proxy rodando na porta ${PORT}`);
});
