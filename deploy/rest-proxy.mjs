import { createServer } from "http";
import { request as httpRequest } from "http";

const PGRST_PORT = Number(process.env.PGRST_PORT ?? 3001);
const LISTEN = Number(process.env.REST_PROXY_PORT ?? 8080);

createServer((req, res) => {
  const url = req.url ?? "/";
  if (!url.startsWith("/rest/v1")) {
    res.writeHead(404);
    res.end();
    return;
  }
  const path = url.slice("/rest/v1".length) || "/";
  const headers = { ...req.headers, host: `127.0.0.1:${PGRST_PORT}` };
  const p = httpRequest(
    {
      hostname: "127.0.0.1",
      port: PGRST_PORT,
      path,
      method: req.method,
      headers,
    },
    (pr) => {
      res.writeHead(pr.statusCode ?? 502, pr.headers);
      pr.pipe(res);
    },
  );
  p.on("error", () => {
    res.writeHead(502);
    res.end("postgrest down");
  });
  req.pipe(p);
}).listen(LISTEN, "127.0.0.1", () => {
  console.log(`rest proxy http://127.0.0.1:${LISTEN}/rest/v1 -> :${PGRST_PORT}`);
});
