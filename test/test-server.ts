import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startTestServer(port: number = 8899): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url || '/', `http://localhost:${port}`);
      let filePath = path.join(__dirname, 'fixtures', parsedUrl.pathname);

      if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
        filePath = path.join(__dirname, 'fixtures', 'interaction.html');
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}
