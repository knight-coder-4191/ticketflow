const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

/**
 * Lightweight zero-dependency HTTP router mimicking Express
 * Supports both live HTTP TCP networking AND in-memory direct dispatch (socket-free for sandbox).
 */
class MiniExpress {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  use(pathOrMiddleware, ...handlers) {
    if (typeof pathOrMiddleware === 'function') {
      this.middlewares.push({ prefix: '/', handler: pathOrMiddleware });
    } else if (typeof pathOrMiddleware === 'string') {
      for (const h of handlers) {
        if (h && h.isRouter) {
          // Mount sub-router
          for (const subRoute of h.routes) {
            this.routes.push({
              method: subRoute.method,
              path: (pathOrMiddleware + subRoute.path).replace(/\/+/g, '/'),
              middlewares: [...subRoute.middlewares],
              handler: subRoute.handler
            });
          }
        } else if (typeof h === 'function') {
          this.middlewares.push({ prefix: pathOrMiddleware, handler: h });
        }
      }
    }
  }

  route(method, routePath, ...handlers) {
    const handler = handlers.pop();
    this.routes.push({
      method: method.toUpperCase(),
      path: routePath,
      middlewares: handlers,
      handler
    });
  }

  get(path, ...handlers) { this.route('GET', path, ...handlers); }
  post(path, ...handlers) { this.route('POST', path, ...handlers); }
  put(path, ...handlers) { this.route('PUT', path, ...handlers); }
  delete(path, ...handlers) { this.route('DELETE', path, ...handlers); }

  static Router() {
    const router = {
      isRouter: true,
      routes: [],
      route(method, p, ...handlers) {
        const handler = handlers.pop();
        router.routes.push({ method: method.toUpperCase(), path: p, middlewares: handlers, handler });
      },
      get(p, ...handlers) { router.route('GET', p, ...handlers); },
      post(p, ...handlers) { router.route('POST', p, ...handlers); },
      put(p, ...handlers) { router.route('PUT', p, ...handlers); },
      delete(p, ...handlers) { router.route('DELETE', p, ...handlers); },
      use(p, ...handlers) {
        const mw = typeof p === 'function' ? p : handlers[0];
        router.routes.forEach(r => r.middlewares.unshift(mw));
      }
    };
    return router;
  }

  listen(port, callback) {
    try {
      const server = http.createServer((req, res) => {
        this._handleRequest(req, res);
      });
      return server.listen(port, callback);
    } catch (e) {
      console.warn('Network socket bind skipped (running in sandboxed mode):', e.message);
      if (callback) callback();
      return null;
    }
  }

  /**
   * Direct in-memory dispatch method - works 100% reliably in sandboxes with NO TCP sockets!
   */
  async dispatch({ method = 'GET', path: reqPath = '/', headers = {}, body = null }) {
    return new Promise(async (resolve) => {
      const parsedUrl = url.parse(reqPath, true);
      const req = {
        method: method.toUpperCase(),
        url: reqPath,
        path: parsedUrl.pathname,
        query: parsedUrl.query || {},
        params: {},
        headers: { ...headers },
        body: body || {}
      };

      const normalizedHeaders = {};
      for (const [k, v] of Object.entries(headers)) {
        normalizedHeaders[k.toLowerCase()] = v;
      }
      req.headers = normalizedHeaders;

      let statusCode = 200;
      const resHeaders = {};
      let responseBody = null;

      const res = {
        statusCode: 200,
        status(code) {
          statusCode = code;
          this.statusCode = code;
          return this;
        },
        setHeader(k, v) {
          resHeaders[k] = v;
        },
        json(data) {
          statusCode = this.statusCode || statusCode;
          responseBody = data;
          resolve({ statusCode, headers: resHeaders, data });
          return this;
        },
        send(data) {
          statusCode = this.statusCode || statusCode;
          responseBody = data;
          resolve({ statusCode, headers: resHeaders, data });
          return this;
        },
        end(data) {
          statusCode = this.statusCode || statusCode;
          resolve({ statusCode, headers: resHeaders, data: data || responseBody });
        }
      };

      await this._routeRequest(req, res);
    });
  }

  async _handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    req.path = parsedUrl.pathname;
    req.query = parsedUrl.query || {};
    req.params = {};

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };

    res.send = (body) => {
      if (typeof body === 'object') return res.json(body);
      res.end(body);
      return res;
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', async () => {
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch (e) {
        req.body = {};
      }
      await this._routeRequest(req, res);
    });
  }

  async _routeRequest(req, res) {
    for (const r of this.routes) {
      if (r.method !== req.method && r.method !== 'ALL') continue;

      const paramKeys = [];
      const pattern = r.path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
        paramKeys.push(key);
        return '([^/]+)';
      });
      const regex = new RegExp(`^${pattern}$`);
      const match = req.path.match(regex);

      if (match) {
        req.params = {};
        paramKeys.forEach((key, idx) => {
          req.params[key] = match[idx + 1];
        });

        let middlewareIndex = 0;
        const next = async (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }
          if (middlewareIndex < r.middlewares.length) {
            const currentMw = r.middlewares[middlewareIndex++];
            try {
              await currentMw(req, res, next);
            } catch (mwErr) {
              next(mwErr);
            }
          } else {
            try {
              await r.handler(req, res);
            } catch (hErr) {
              res.status(500).json({ success: false, error: hErr.message });
            }
          }
        };

        return await next();
      }
    }

    const staticDir = path.join(__dirname, '../../../client/public');
    let filePath = path.join(staticDir, req.path === '/' ? 'index.html' : req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml'
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
      return res.end(fs.readFileSync(filePath));
    }

    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
    }

    const indexFile = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.setHeader('Content-Type', 'text/html');
      return res.end(fs.readFileSync(indexFile));
    }

    return res.status(404).send('Not Found');
  }
}

module.exports = { MiniExpress };
