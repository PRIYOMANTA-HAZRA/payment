const { getCouponData, enableCors } = require('./_utils');

module.exports = async (req, res) => {
  enableCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Please enter a coupon code.' });
    }

    const coupon = await getCouponData(code);
    if (!coupon || !coupon.valid) {
      if (coupon && coupon.reason === 'EXPIRED') {
        return res.json({ valid: false, message: 'This coupon code has expired.' });
      }
      return res.json({ valid: false, message: 'Invalid coupon code.' });
    }

    return res.status(200).json({
      valid: true,
      code: coupon.code,
      discount: coupon.discount,
      message: `${coupon.discount}% Discount Applied Successfully!`
    });
  } catch (e) {
    return res.status(500).json({ valid: false, message: 'Error verifying coupon.' });
  }
};
