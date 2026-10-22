const http = require('http');
const url = require('url');

const plansHandler = require('./api/plans');
const verifyCouponHandler = require('./api/verify-coupon');
const createOrderHandler = require('./api/create-order');
const verifyPaymentHandler = require('./api/verify-payment');
const claimFreeCouponHandler = require('./api/claim-free-coupon');

const PORT = process.env.PORT || 4000;

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch(e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Polyfill Express-like helper methods for Vercel functions
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  req.query = parsedUrl.query;
  if (req.method === 'POST') {
    req.body = await parseBody(req);
  }

  if (pathname === '/api/plans') return plansHandler(req, res);
  if (pathname === '/api/verify-coupon') return verifyCouponHandler(req, res);
  if (pathname === '/api/create-order') return createOrderHandler(req, res);
  if (pathname === '/api/verify-payment') return verifyPaymentHandler(req, res);
  if (pathname === '/api/claim-free-coupon') return claimFreeCouponHandler(req, res);

  res.status(404).json({ error: 'Endpoint not found' });
});

server.listen(PORT, () => {
  console.log(`Cloud Backend Server running on http://localhost:${PORT}`);
});
