import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!stripeSecretKey) {
  console.warn(
    "⚠️ STRIPE_SECRET_KEY is not configured in backend/.env. Add your sk_test_... key to enable Stripe payments.",
  );
}

const stripe = new Stripe(
  stripeSecretKey || "sk_test_dummy_key_worknest_unconfigured",
);

export default stripe;
