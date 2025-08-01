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
// const RECURLY_API_KEY = 'c3fdabc62b2e49f5bc95996fe53e31b7';
const BASE_URL = 'https://v3.eu.recurly.com';
const Webhook_URL = 'https://hooks.moneytribe21.com/webhook/f75c292c-92e1-4bd1-84ec-d884428a815d';

const headers = {
  Authorization: 'Basic ' + Buffer.from(RECURLY_API_KEY + ':').toString('base64'),
  Accept: 'application/vnd.recurly.v2021-02-25+json',
  'Content-Type': 'application/json',
};

async function getAccount(accountCode) {
  try {
    const response = await axios.get(`${BASE_URL}/accounts/${accountCode}`, { headers });
    return response.data;
  } catch (err) {
    console.error('Recurly API Error Details:', err.response?.data);
    throw err;
  }
}

async function getAllAccounts() {
  const allAccounts = [];
  let nextUrl = `${BASE_URL}/accounts`;

  try {
    while (nextUrl) {
      const response = await axios.get(nextUrl, { headers });

      if (response.data?.data) {
        allAccounts.push(...response.data.data);
      }
      nextUrl = response.data?.next ? `${BASE_URL}${response.data.next}` : null;
    }

    console.log(`✅ Retrieved ${allAccounts.length} accounts.`);
    return allAccounts;
  } catch (err) {
    console.error('❌ Failed to retrieve accounts:', err.message);
    throw err;
  }
}

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

async function setAccountBillingInfo(accountId, billingInfo) {
  try {
    const response = await axios.put(`${BASE_URL}/accounts/${accountId}/billing_info`, billingInfo, { headers: HEADERS });
    return response.data;
  } catch (err) {
    return err.response;
  }
}

async function getHostedLoginToken(accountCode) {
  const account = await getAccount(accountCode);
  const token = account.hostedLoginToken;
  const url = `${BASE_URL}/account/${token}`;
  return url;
}

async function sendWebhookPayload(webhookData) {
  try {
    const res = await axios.post(Webhook_URL, webhookData, { headers });
    console.log(`✅ Sent Webhook for ${webhookData.data.email}`);
    return res.data;
  } catch (err) {
    console.error(`❌ Failed to send Webhook for ${webhookData.data.email}:`, err.response?.data || err.message);
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
    password,
    recurlyToken
  } = req.body;

  if (!email || !recurlyToken || !first_name || !last_name || !country || !plan || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const accountCode = crypto.randomUUID();;
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

    const webhookPayload = {
      event: "new_account_created",
      data: {
        accountCode,
        first_name,
        last_name,
        email,
        whatsapp,
        password,
        recurlyToken
      },
      timestamp: new Date().toISOString()
    }

    try {
      const accountResp = await createAccounts(accountPayload);
      console.log(`✅ Created account ${accountCode}`);
    } catch (err) {
      console.error(`❌ Failed to create account ${accountCode}:`, err.response?.data || err.message);
    }


    const planCode = plan === 'monthly' ? 'c9a88f3e-323e-495b-8f14-3451d4402bcf' : '1f91cb79-b55f-4482-945f-cf655a135a36';
    const subscriptionPayload = {
      plan_code: planCode,
      currency: 'USD',
      account: {
        code: accountCode
      }
    };

    try {
      const subscriptionResp = await createSubscriptions(subscriptionPayload);
      const billingInfoData = {
        token_id: recurlyToken
      }
      await setAccountBillingInfo(accountCode, billingInfoData);
      
      console.log(`✅ Created subscription ${accountCode}`);
      console.log('✅ Subscription created:', subscriptionResp);
      res.status(200).json({ success: true, message: 'Subscription successful!', subscriptionResp });

    } catch (err) {
      console.error(`❌ Failed to create subscription ${accountCode}:`, err.response?.data || err.message);
    }
    


    const webhookResp = await sendWebhookPayload(webhookPayload);
    console.log('✅ Webhook sent:', webhookResp);

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