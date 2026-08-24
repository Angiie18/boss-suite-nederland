// netlify/functions/create-payment-intent.js
// Netlify serverless function
// Maakt een Stripe PaymentIntent aan voor de Boss Suite-betaling.
//
// BELANGRIJK: deze functie draait op de server, niet in de browser.
// Hier mag de GEHEIME sleutel (secret key) gebruikt worden.
//
// Zet in Netlify onder Site settings -> Environment variables:
//   STRIPE_SECRET_KEY = sk_test_... (of sk_live_... zodra je live gaat)
//
// De functie is bereikbaar op: /.netlify/functions/create-payment-intent

const Stripe = require("stripe");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "STRIPE_SECRET_KEY ontbreekt in de Netlify-omgevingsvariabelen." }),
    };
  }

  const stripe = Stripe(secretKey);

  try {
    const data = JSON.parse(event.body || "{}");

    // Bedrag moet in centen (integer) aan Stripe doorgegeven worden.
    // Bijvoorbeeld: €49,00 -> 4900
    const amount = data.amount;
    const currency = data.currency || "eur";

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Ongeldig of ontbrekend bedrag ('amount')." }),
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata: data.metadata || {},
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Er is iets misgegaan bij het aanmaken van de betaling." }),
    };
  }
};
