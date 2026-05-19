import http from "http";
import https from "https";
import net from "net";
import tls from "tls";
import { URL } from "url";

const PORT = process.env.PORT || 8080;
const TARGET = process.env.TARGET_DOMAIN;

if (!TARGET) {
  console.log("TARGET_DOMAIN não definida");
  process.exit(1);
}

const target = new URL(TARGET);

const server = http.createServer((req, res) => {
  const options = {
    hostname: target.hostname,
    port: target.port || (target.protocol === "https:" ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.hostname,
    },
    rejectUnauthorized: false,
  };

  const proxy = (target.protocol === "https:" ? https : http).request(
    options,
    (prs) => {
      res.writeHead(prs.statusCode, prs.headers);
      prs.pipe(res);
    }
  );

  req.pipe(proxy);

  proxy.on("error", (err) => {
    console.log("HTTP ERROR:", err.message);
    res.writeHead(500);
    res.end("proxy error");
  });
});

server.on("upgrade", (req, socket, head) => {
  console.log("WebSocket upgrade recebido");

  const upstream =
    target.protocol === "https:"
      ? tls.connect(
          target.port || 443,
          target.hostname,
          { rejectUnauthorized: false },
          () => {
            upstream.write(buildRequest(req));
            if (head?.length) upstream.write(head);

            socket.pipe(upstream);
            upstream.pipe(socket);
          }
        )
      : net.connect(target.port || 80, target.hostname, () => {
          upstream.write(buildRequest(req));
          if (head?.length) upstream.write(head);

          socket.pipe(upstream);
          upstream.pipe(socket);
        });

  upstream.on("error", (err) => {
    console.log("WS ERROR:", err.message);
    socket.destroy();
  });
});

function buildRequest(req) {
  let headers = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;

  for (const [k, v] of Object.entries(req.headers)) {
    headers += `${k}: ${v}\r\n`;
  }

  headers += "\r\n";

  return headers;
}

server.listen(PORT, () => {
  console.log(`Proxy online porta ${PORT}`);
});
