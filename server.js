// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const API_KEY = 'c0de0391e84842b08e044ff4e8d69690';
const PLAN_CODE = 'premium-monthly';
const BASE_URL = 'https://v3.eu.recurly.com';

const headers = {
  Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64'),
  Accept: 'application/vnd.recurly.v2021-02-25+json',
  'Content-Type': 'application/json',
};

async function createAccounts(accountData) {
  try {
    const response = await axios.post(`${BASE_URL}/accounts`, accountData, { headers });
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function createSubscriptions(subscriptionData) {
  try {
    const res = await axios.post(`${BASE_URL}/subscriptions`, subscriptionData, { headers });
    console.log(`✅ Created subscription for ${subscriptionData.account.code} on plan ${subscriptionData.plan_code}`);
  } catch (err) {
    console.error(`❌ Failed to create subscription for ${subscriptionData.account.code}:`, err.response?.data || err.message);
  }
}

app.post('/subscribe', async (req, res) => {
  const { firstName, lastName, email, token } = req.body;

  try {
    const account = await createAccounts(JSON.stringify({
        code: email,
        email,
        first_name: firstName,
        last_name: lastName,
        billing_info: { token_id: token }
      })
    ).then(res => res.json());

    if (!account.id) throw new Error(account.error || 'Account creation failed.');

    const subscription = await createSubscriptions(JSON.stringify({
        plan_code: PLAN_CODE,
        currency: `USD`,
        account: { code: email }
      })
    ).then(res => res.json());

    if (!subscription.id) throw new Error(subscription.error || 'Subscription failed.');

    res.json({ success: true, message: '🎉 Subscription created!' });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('✅ MoneyTribe21 Recurly backend is live!');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Backend running on port 3000');
});