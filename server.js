// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const API_KEY = process.env.RECURLY_PRIVATE_KEY;
const PLAN_CODE = 'premium-monthly';
const BASE_URL = 'https://v3.eu.recurly.com';

const headers = {
  Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64'),
  Accept: 'application/vnd.recurly.v2021-02-25+json',
  'Content-Type': 'application/json',
};

app.post('/subscribe', async (req, res) => {
  const { firstName, lastName, email, recurlyToken } = req.body;

  try {
    const account = await fetch(`${BASE_URL}/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: email,
        email,
        first_name: firstName,
        last_name: lastName,
        billing_info: { token_id: recurlyToken }
      })
    }).then(res => res.json());

    if (!account.id) throw new Error(account.error || 'Account creation failed.');

    const subscription = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plan_code: PLAN_CODE,
        account: { code: email }
      })
    }).then(res => res.json());

    if (!subscription.id) throw new Error(subscription.error || 'Subscription failed.');

    res.json({ success: true, message: '🎉 Subscription created!' });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Backend running on port 3000');
});
