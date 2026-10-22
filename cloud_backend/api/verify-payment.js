const crypto = require('crypto');
const { RAZORPAY_KEY_SECRET, PLAN_CONFIG, generateLicenseKey, logPaymentToFirebase, enableCors } = require('./_utils');

module.exports = async (req, res) => {
  enableCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, couponCode, targetHwid } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ success: false, message: 'Missing payment verification parameters.' });
    }

    const planInfo = PLAN_CONFIG[plan];
    if (!planInfo) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    // Verify HMAC-SHA256 signature
    const generatedSig = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed: Signature mismatch!' });
    }

    // Generate accurate 16-character license key for this client and plan
    const clientHwid = (targetHwid || '').trim();
    if (!clientHwid) {
      return res.status(400).json({ success: false, message: 'Hardware ID missing.' });
    }

    const { key: finalKey, isPermanent: isPerm } = generateLicenseKey(clientHwid, planInfo.days);

    // Record in Firebase Realtime Database
    const validUntilMs = isPerm ? (Date.now() + 90 * 24 * 60 * 60 * 1000) : (Date.now() + planInfo.days * 24 * 60 * 60 * 1000);
    logPaymentToFirebase({
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      hwid: clientHwid,
      plan: plan,
      plan_name: planInfo.name,
      amount: planInfo.price,
      coupon: couponCode || 'NONE',
      license_key: finalKey,
      is_permanent: isPerm,
      valid_until_ms: validUntilMs,
      timestamp: Date.now(),
      status: 'PAID'
    });

    return res.status(200).json({
      success: true,
      key: finalKey,
      plan: plan,
      planName: planInfo.name,
      days: isPerm ? 'Lifetime' : planInfo.days,
      message: 'Payment verified! Software license generated and activated successfully.'
    });
  } catch (e) {
    console.error('Payment verification error:', e);
    return res.status(500).json({ success: false, message: 'Error verifying payment.' });
  }
};
