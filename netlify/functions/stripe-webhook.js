// netlify/functions/stripe-webhook.js
// Netlify serverless function
// Luistert naar Stripe-webhookgebeurtenissen (bijv. een geslaagde betaling).
//
// BELANGRIJK: deze functie draait op de server, niet in de browser.
//
// Zet in Netlify onder Site settings -> Environment variables:
//   STRIPE_SECRET_KEY = sk_test_... (al ingesteld)
//   STRIPE_WEBHOOK_SECRET = whsec_... (net ingesteld)
//
// De functie is bereikbaar op: /.netlify/functions/stripe-webhook
// Deze URL heb je ingevuld in Stripe onder Developers -> Webhooks.

const Stripe = require("stripe");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "STRIPE_SECRET_KEY of STRIPE_WEBHOOK_SECRET ontbreekt in de Netlify-omgevingsvariabelen." }),
    };
  }

  const stripe = Stripe(secretKey);

  // Stripe stuurt een handtekening mee om te bewijzen dat het bericht echt van Stripe komt.
  const signature = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret
    );
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook-handtekening ongeldig: ${error.message}` }),
    };
  }

  // Reageer op het type gebeurtenis dat binnenkomt.
  switch (stripeEvent.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = stripeEvent.data.object;

      // Hier kan je later logica toevoegen, bijvoorbeeld:
      // - toegang tot de Boss Suite vrijgeven
      // - een bevestigingsmail versturen
      // - de betaling wegschrijven naar een database
      console.log(`Betaling geslaagd: ${paymentIntent.id}, bedrag: ${paymentIntent.amount} ${paymentIntent.currency}`);

      break;
    }

    default: {
      console.log(`Onbehandeld event type: ${stripeEvent.type}`);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
