const { PLAN_CONFIG, RAZORPAY_KEY_ID, enableCors } = require('./_utils');

module.exports = async (req, res) => {
  enableCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    plans: PLAN_CONFIG,
    razorpayKeyId: RAZORPAY_KEY_ID
  });
};
