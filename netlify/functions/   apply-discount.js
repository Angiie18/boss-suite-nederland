// netlify/functions/apply-discount.js
//
// Draait server-side (niet in de browser). Zoekt de kortingscode op via
// Stripe, berekent het nieuwe bedrag, en past dat toe op de bestaande
// PaymentIntent (dezelfde die de klant al op het scherm heeft staan).
//
// Vereist dezelfde STRIPE_SECRET_KEY environment variable als
// create-payment-intent.js.

const Stripe = require("stripe");

const BASE_AMOUNT = 52000; // €520,00 in centen, moet gelijk zijn aan create-payment-intent.js

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ valid: false, error: "STRIPE_SECRET_KEY is niet ingesteld." }),
    };
  }

  const stripe = Stripe(secretKey);

  try {
    const { paymentIntentId, code } = JSON.parse(event.body || "{}");
    if (!paymentIntentId || !code) {
      return { statusCode: 400, body: JSON.stringify({ valid: false, error: "paymentIntentId en code zijn verplicht." }) };
    }

    // Zoek de promotiecode op zoals die in Stripe (Product catalog -> Coupons -> Promotion codes) staat
    const promoList = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    const promo = promoList.data[0];

    if (!promo || !promo.coupon || !promo.coupon.valid) {
      return { statusCode: 200, body: JSON.stringify({ valid: false }) };
    }

    // Bereken het nieuwe bedrag op basis van percentage- of vast-bedrag-korting
    let newAmount = BASE_AMOUNT;
    if (promo.coupon.percent_off) {
      newAmount = Math.round(BASE_AMOUNT * (1 - promo.coupon.percent_off / 100));
    } else if (promo.coupon.amount_off) {
      newAmount = Math.max(0, BASE_AMOUNT - promo.coupon.amount_off);
    }

    // Pas het bedrag aan op de bestaande PaymentIntent (nog niet bevestigd door de klant)
    await stripe.paymentIntents.update(paymentIntentId, { amount: newAmount });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valid: true, newAmount }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({ valid: false, error: err.message }),
    };
  }
};
