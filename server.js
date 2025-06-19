// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('recurly');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const recurly = new Client(process.env.RECURLY_PRIVATE_KEY);
const PLAN_CODE = 'moneytribe-monthly';

app.use(cors());
app.use(bodyParser.json());

app.post('/subscribe', async (req, res) => {
  const { firstName, lastName, email, recurlyToken } = req.body;

  if (!firstName || !lastName || !email || !recurlyToken) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const account = await recurly.createAccount({
      code: email,
      firstName,
      lastName,
      email,
      billingInfo: {
        tokenId: recurlyToken
      }
    });

    const subscription = await recurly.createSubscription({
      planCode: PLAN_CODE,
      account: { code: account.code }
    });

    return res.json({
      success: true,
      subscriptionId: subscription.uuid,
      message: 'Subscription created successfully!'
    });

  } catch (error) {
    console.error('❌ Recurly error:', error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error?.response?.data?.error || error.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('✅ MoneyTribe21 Recurly backend is live!');
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
