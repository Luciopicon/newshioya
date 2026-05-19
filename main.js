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
