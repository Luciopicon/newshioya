import http from "http";
import https from "https";
import { pipeline } from "stream";

const TARGET =
  process.env.TARGET_DOMAIN ||
  "https://newshioya.fun";

const PORT =
  process.env.PORT || 8080;

const server = http.createServer(
  async (req, res) => {
    try {
      const targetUrl =
        new URL(req.url, TARGET);

      // clone headers
      const headers = {
        ...req.headers,
      };

      // spoof headers
      headers["host"] =
        new URL(TARGET).host;

      headers["origin"] =
        "https://www.google.com";

      headers["referer"] =
        "https://www.google.com/";

      headers["x-forwarded-proto"] =
        "https";

      headers["x-real-ip"] =
        req.socket.remoteAddress ||
        "1.1.1.1";

      headers["user-agent"] =
        headers["user-agent"] ||
        "Mozilla/5.0";

      // remove problematic headers
      delete headers["content-length"];
      delete headers["x-vercel-id"];
      delete headers["x-forwarded-host"];
      delete headers["connection"];

      const client =
        targetUrl.protocol === "https:"
          ? https
          : http;

      const proxyReq =
        client.request(
          targetUrl,
          {
            method: req.method,
            headers,
          },
          (proxyRes) => {
            res.writeHead(
              proxyRes.statusCode,
              proxyRes.headers
            );

            pipeline(
              proxyRes,
              res,
              () => {}
            );
          }
        );

      proxyReq.on(
        "error",
        (err) => {
          console.error(
            "[PROXY ERROR]",
            err
          );

          if (!res.headersSent) {
            res.writeHead(502);
          }

          res.end(
            "Bad Gateway"
          );
        }
      );

      // websocket upgrade passthrough
      if (
        req.headers.upgrade &&
        req.headers.upgrade.toLowerCase() ===
          "websocket"
      ) {
        req.pipe(proxyReq);
        return;
      }

      pipeline(
        req,
        proxyReq,
        () => {}
      );
    } catch (err) {
      console.error(err);

      res.writeHead(500);

      res.end(
        "Internal Server Error"
      );
    }
  }
);

// websocket support
server.on(
  "upgrade",
  (
    req,
    socket,
    head
  ) => {
    try {
      const target =
        new URL(TARGET);

      const wsReq =
        (
          target.protocol ===
          "https:"
            ? https
            : http
        ).request({
          hostname:
            target.hostname,
          port:
            target.port ||
            (
              target.protocol ===
              "https:"
            )
              ? 443
              : 80,
          path: req.url,
          headers: req.headers,
        });

      wsReq.on(
        "upgrade",
        (
          res,
          wsSocket
        ) => {
          socket.write(
            "HTTP/1.1 101 Switching Protocols\r\n" +
              Object.entries(
                res.headers
              )
                .map(
                  ([k, v]) =>
                    `${k}: ${v}`
                )
                .join("\r\n") +
              "\r\n\r\n"
          );

          wsSocket.pipe(socket);
          socket.pipe(wsSocket);
        }
      );

      wsReq.end();
    } catch (err) {
      console.error(
        "[WS ERROR]",
        err
      );

      socket.destroy();
    }
  }
);

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `[INFO] Proxy online on port ${PORT}`
    );
  }
);
