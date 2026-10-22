const { PLAN_CONFIG, generateLicenseKey, getCouponData, logPaymentToFirebase, enableCors } = require('./_utils');

module.exports = async (req, res) => {
  enableCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { plan, couponCode, targetHwid } = req.body || {};
    const planInfo = PLAN_CONFIG[plan];
    if (!planInfo) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }

    if (!couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon code required.' });
    }

    const coupon = await getCouponData(couponCode);
    if (!coupon || !coupon.valid || coupon.discount < 100) {
      return res.status(400).json({ success: false, message: 'Invalid or ineligible coupon for free activation.' });
    }

    const clientHwid = (targetHwid || '').trim();
    if (!clientHwid) {
      return res.status(400).json({ success: false, message: 'Hardware ID missing.' });
    }

    const { key: finalKey, isPermanent: isPerm } = generateLicenseKey(clientHwid, planInfo.days);

    const validUntilMs = isPerm ? (Date.now() + 90 * 24 * 60 * 60 * 1000) : (Date.now() + planInfo.days * 24 * 60 * 60 * 1000);
    logPaymentToFirebase({
      payment_id: `COUPON_${coupon.code}_${Date.now()}`,
      order_id: `FREE_${Date.now()}`,
      hwid: clientHwid,
      plan: plan,
      plan_name: planInfo.name,
      amount: 0,
      coupon: coupon.code,
      license_key: finalKey,
      is_permanent: isPerm,
      valid_until_ms: validUntilMs,
      timestamp: Date.now(),
      status: 'FREE_COUPON_100'
    });

    return res.status(200).json({
      success: true,
      key: finalKey,
      plan: plan,
      planName: planInfo.name,
      days: isPerm ? 'Lifetime' : planInfo.days,
      message: '100% Free coupon redeemed! License activated successfully.'
    });
  } catch (e) {
    console.error('Free coupon claim error:', e);
    return res.status(500).json({ success: false, message: 'Error claiming free coupon.' });
  }
};
