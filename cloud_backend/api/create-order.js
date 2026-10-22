const https = require('https');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PLAN_CONFIG, getCouponData, enableCors } = require('./_utils');

module.exports = async (req, res) => {
  enableCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { plan, couponCode, hwid } = req.body || {};
    const planInfo = PLAN_CONFIG[plan];
    if (!planInfo) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
    }

    let finalPrice = planInfo.price;
    let discountPercent = 0;

    if (couponCode) {
      const coupon = await getCouponData(couponCode);
      if (coupon && coupon.valid) {
        discountPercent = coupon.discount;
        if (discountPercent >= 100) {
          return res.status(200).json({
            success: true,
            isFree: true,
            plan: plan,
            message: 'Coupon provides 100% discount. Activate directly!'
          });
        }
        finalPrice = Math.max(1, Math.round(planInfo.price * (1 - discountPercent / 100)));
      }
    }

    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const orderPayload = JSON.stringify({
      amount: Math.round(finalPrice * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now().toString(36)}`,
      notes: {
        plan: plan,
        hwid: hwid || 'UNKNOWN',
        coupon: couponCode || 'NONE',
        finalPrice: finalPrice.toString()
      }
    });

    const rzpReq = https.request('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Content-Length': Buffer.byteLength(orderPayload)
      }
    }, (rzpRes) => {
      let rzpBody = '';
      rzpRes.on('data', chunk => rzpBody += chunk);
      rzpRes.on('end', () => {
        try {
          const parsed = JSON.parse(rzpBody);
          if (rzpRes.statusCode >= 200 && rzpRes.statusCode < 300) {
            return res.status(200).json({
              success: true,
              orderId: parsed.id,
              amount: parsed.amount,
              currency: parsed.currency,
              keyId: RAZORPAY_KEY_ID,
              plan: plan,
              planName: planInfo.name,
              finalPrice: finalPrice,
              discount: discountPercent
            });
          } else {
            console.error('Razorpay order creation error:', parsed);
            return res.status(500).json({ success: false, message: parsed.error ? parsed.error.description : 'Failed to create payment order.' });
          }
        } catch(e) {
          return res.status(500).json({ success: false, message: 'Invalid response from payment gateway.' });
        }
      });
    });

    rzpReq.on('error', (e) => {
      console.error('Razorpay request error:', e);
      return res.status(500).json({ success: false, message: 'Connection to payment gateway failed.' });
    });
    rzpReq.write(orderPayload);
    rzpReq.end();
  } catch (e) {
    console.error('Order creation error:', e);
    return res.status(500).json({ success: false, message: 'Server error while creating order.' });
  }
};
