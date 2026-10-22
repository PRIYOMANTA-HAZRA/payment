const crypto = require('crypto');
const https = require('https');

const FIREBASE_DB_URL = "https://samarth-auto-uploader-default-rtdb.firebaseio.com";
const secretSalt = 'samarth_auto_uploader_pro_2026';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_TqUwwiowWajZ4h";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "M2ZYCZkMlpufGDFcdLQxnG63";

const PLAN_CONFIG = {
  '1_month': { name: '1 Month Pro License', days: 30, price: 299 },
  '3_months': { name: '3 Months Pro License', days: 90, price: 699 },
  'lifetime': { name: 'Lifetime Pro License', days: 99999, price: 2999 }
};

function enableCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

// Generate authentic 16-character license key
function generateLicenseKey(hwid, days) {
  let finalExpDays;
  let isPerm = false;
  if (days >= 9999) {
    finalExpDays = 99999;
    isPerm = true;
  } else {
    const currentDays = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    finalExpDays = currentDays + days;
  }
  let expHex = finalExpDays.toString(16).toUpperCase().padStart(5, '0').substring(0, 5);
  const hashInput = hwid + expHex + secretSalt;
  const sig = crypto.createHash('md5').update(hashInput).digest('hex').toUpperCase().substring(0, 11);
  return { key: sig + expHex, isPermanent: isPerm, expDays: finalExpDays };
}

// Fetch coupon details from Firebase
function getCouponData(code) {
  if (!code || typeof code !== 'string') return Promise.resolve(null);
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return Promise.resolve(null);

  return new Promise((resolve) => {
    const url = `${FIREBASE_DB_URL.replace(/\/$/, '')}/clients/_coupons/${cleanCode}.json`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const coupon = JSON.parse(data);
          if (coupon && coupon.active !== false) {
            if (coupon.expires_at && Date.now() > coupon.expires_at) {
              return resolve({ valid: false, reason: 'EXPIRED' });
            }
            return resolve({
              valid: true,
              discount: Number(coupon.discount) || 0,
              code: cleanCode,
              expires_at: coupon.expires_at || null
            });
          }
          resolve({ valid: false, reason: 'INVALID' });
        } catch(e) { resolve({ valid: false, reason: 'ERROR' }); }
      });
    });
    req.on('error', () => resolve({ valid: false, reason: 'NETWORK_ERROR' }));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve({ valid: false, reason: 'TIMEOUT' });
    });
  });
}

// Record payment and update client in Firebase
function logPaymentToFirebase(paymentRecord) {
  const id = paymentRecord.payment_id || `FREE_${Date.now()}`;
  const payload = JSON.stringify(paymentRecord);

  try {
    const req1 = https.request(`${FIREBASE_DB_URL.replace(/\/$/, '')}/clients/_payments/${id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    });
    req1.on('error', () => {});
    req1.write(payload);
    req1.end();
  } catch(e) {}

  try {
    const clientUpdate = JSON.stringify({
      key_type: paymentRecord.is_permanent ? 'permanent' : 'temporary',
      valid_until: paymentRecord.valid_until_ms,
      license_key: paymentRecord.license_key,
      status: 'active',
      last_payment: Date.now(),
      last_plan: paymentRecord.plan
    });
    const req2 = https.request(`${FIREBASE_DB_URL.replace(/\/$/, '')}/clients/${paymentRecord.hwid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(clientUpdate) }
    });
    req2.on('error', () => {});
    req2.write(clientUpdate);
    req2.end();
  } catch(e) {}
}

module.exports = {
  FIREBASE_DB_URL,
  secretSalt,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  PLAN_CONFIG,
  enableCors,
  generateLicenseKey,
  getCouponData,
  logPaymentToFirebase
};
