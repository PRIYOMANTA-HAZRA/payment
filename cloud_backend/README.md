# Samarth Auto Uploader - Cloud Payment & License API (Vercel Ready)

This is a free, serverless cloud backend for Razorpay Payment Gateway integration and automatic 16-character license key generation.

## 🚀 How to Deploy to Vercel (100% Free - Takes 2 Minutes):

### Method 1: Using GitHub (Easiest)
1. Upload the `cloud_backend` folder to a new GitHub repository (e.g. `samarth-cloud-api`).
2. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
3. Click **"Add New Project"** -> Select your repository -> Click **"Deploy"**.
4. Once deployed, Vercel gives you a free HTTPS domain, for example:
   `https://samarth-license-api.vercel.app`
5. Copy that URL and paste it into `pricing.html` inside `const CLOUD_PAYMENT_API = "https://your-domain.vercel.app";`!

---

### Method 2: Using Vercel CLI (Instant from Terminal)
1. In this directory (`auto uploder v2/cloud_backend`), run:
   ```bash
   npx vercel
   ```
2. Follow the 3 prompts (hit Enter to accept defaults).
3. Vercel will output your live URL:
   ```
   ✅ Production: https://samarth-license-api.vercel.app
   ```
4. Copy the URL and add to `pricing.html`.

---

## 🔒 Environment Variables (Optional):
You can set these in Vercel Project Settings -> Environment Variables, or use the default embedded values:
- `RAZORPAY_KEY_ID` = `rzp_test_TqUwwiowWajZ4h`
- `RAZORPAY_KEY_SECRET` = `M2ZYCZkMlpufGDFcdLQxnG63`

---

## ⚡ How It Automates Everything:
1. Client selects plan on their PC.
2. Vercel creates Razorpay order.
3. Client pays via UPI / Cards.
4. Vercel verifies HMAC signature.
5. Vercel generates 16-character digital license key (30 days, 90 days, or Lifetime).
6. Vercel logs payment & client to Firebase.
7. Local client `.license` file is saved automatically and app unlocks instantly!
