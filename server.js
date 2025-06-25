// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      console.error('Invalid JSON received');
      throw new Error('Invalid JSON');
    }
  }
}));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Bad JSON');
    return res.status(400).send({ success: false, message: 'Invalid JSON format' });
  }
  next();
});

const RECURLY_API_KEY = 'c0de0391e84842b08e044ff4e8d69690';
const BASE_URL = 'https://v3.eu.recurly.com';

const headers = {
  Authorization: 'Basic ' + Buffer.from(RECURLY_API_KEY + ':').toString('base64'),
  Accept: 'application/vnd.recurly.v2021-02-25+json',
  'Content-Type': 'application/json',
};

async function createAccounts(accountData) {
  try {
    const response = await axios.post(`${BASE_URL}/accounts`, accountData, { headers });
    return response.data;
  } catch (err) {
    console.error('Recurly API Error Details:', err.response?.data);
    throw err;
  }
}

async function createSubscriptions(subscriptionData) {
  try {
    const res = await axios.post(`${BASE_URL}/subscriptions`, subscriptionData, { headers });
    console.log(`✅ Created subscription for ${subscriptionData.account.code} on plan ${subscriptionData.plan_code}`);
    return res.data;
  } catch (err) {
    console.error(`❌ Failed to create subscription for ${subscriptionData.account.code}:`, err.response?.data || err.message);
    throw err;
  }
}

app.post('/subscribe', async (req, res) => {

  console.log('Raw headers:', req.headers);
  console.log('Raw body:', req.body);

  const {
    first_name,
    last_name,
    email,
    country,
    plan,
    whatsapp,
    recurlyToken
  } = req.body;

  if (!email || !recurlyToken || !first_name || !last_name || !country || !plan) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const accountCode = email;
    const accountPayload = {
      code: accountCode,
      first_name,
      last_name,
      email,
      billing_info: {
        token_id: recurlyToken
      },
      company: 'MoneyTribe21',
      address: {
        country: country.toUpperCase()
      }
    };

    const accountResp = await createAccounts(accountPayload);

    const planCode = plan === 'monthly' ? 'c9a88f3e-323e-495b-8f14-3451d4402bcf' : '1f91cb79-b55f-4482-945f-cf655a135a36';
    const subscriptionPayload = {
      plan_code: planCode,
      currency: 'USD',
      account: {
        code: accountCode
      }
    };
    const subscriptionResp = await createSubscriptions(subscriptionPayload);
    console.log('✅ Subscription created:', subscriptionResp);
    res.status(200).json({ success: true, message: 'Subscription successful!', subscriptionResp });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('✅ MoneyTribe21 Recurly backend is live!');
});

app.listen(3000, () => {
  console.log('✅ Backend running on port 3000');
});