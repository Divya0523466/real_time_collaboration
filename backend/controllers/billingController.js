import stripe from "../config/stripe.js";
import User from "../models/User.js";
import { isUserPro } from "../utils/subscriptionUtils.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        message:
          "Stripe secret key is not configured on the server. Please add STRIPE_SECRET_KEY to backend/.env",
      });
    }

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user._id.toString(),
          },
        });
        customerId = customer.id;
        user.subscription = {
          ...(user.subscription || {}),
          stripeCustomerId: customerId,
        };
        await user.save();
      } catch (custErr) {
        console.error("Failed to create Stripe customer:", custErr);
      }
    }

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "WorkNest Pro",
              description:
                "Unlimited workspaces, channels, spaces, 50GB file storage, and priority features.",
            },
            unit_amount: 1200,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing/cancel`,
      metadata: {
        userId: user._id.toString(),
        plan: "PRO",
      },
    });

    return res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("Error creating Stripe checkout session:", err);
    return res.status(500).json({
      message: err.message || "Failed to initiate payment session with Stripe",
    });
  }
};

export const verifySession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        message: "Stripe secret key is not configured on the server.",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const isPaid =
      session.payment_status === "paid" || session.status === "complete";
    if (!isPaid) {
      return res.status(400).json({
        message: "Payment has not been completed for this session.",
        status: session.payment_status,
      });
    }

    const targetUserId = session.metadata?.userId || req.userId;
    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    user.subscription = {
      plan: "PRO",
      status: "active",
      stripeCustomerId: session.customer || user.subscription?.stripeCustomerId,
      stripeSubscriptionId:
        session.subscription || user.subscription?.stripeSubscriptionId,
      currentPeriodEnd: periodEnd,
    };

    await user.save();

    return res.json({
      success: true,
      message: "Subscription successfully upgraded to WorkNest Pro!",
      subscription: user.subscription,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        subscription: user.subscription,
      },
    });
  } catch (err) {
    console.error("Error verifying checkout session:", err);
    return res.status(500).json({
      message: err.message || "Failed to verify payment session",
    });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    isUserPro(user);

    return res.json({
      subscription: user.subscription || { plan: "FREE", status: "active" },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to fetch subscription status" });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subId = user.subscription?.stripeSubscriptionId;
    if (subId && process.env.STRIPE_SECRET_KEY) {
      try {
        await stripe.subscriptions.update(subId, {
          cancel_at_period_end: true,
        });
      } catch (stripeErr) {
        console.warn(
          "Notice when updating Stripe subscription to cancel at period end:",
          stripeErr.message,
        );
      }
    }

    let periodEnd = user.subscription?.currentPeriodEnd;
    if (!periodEnd) {
      periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    user.subscription = {
      ...(user.subscription || {}),
      plan: "PRO", // Pro plan remains active until expiry date!
      status: "canceling",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEnd,
    };
    await user.save();

    const formattedDate = new Date(periodEnd).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return res.json({
      success: true,
      message: `Auto-renewal cancelled. You will continue to have full Pro plan access until ${formattedDate}, after which your account will switch to the Free plan.`,
      subscription: user.subscription,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        subscription: user.subscription,
      },
    });
  } catch (err) {
    console.error("Error cancelling subscription:", err);
    return res.status(500).json({
      message: err.message || "Failed to cancel subscription",
    });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret && sig) {
      const payload = req.rawBody || req.body;
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error("Stripe Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            const periodEnd = new Date();
            periodEnd.setDate(periodEnd.getDate() + 30);
            user.subscription = {
              plan: "PRO",
              status: "active",
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              currentPeriodEnd: periodEnd,
            };
            await user.save();
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const user = await User.findOne({
          "subscription.stripeCustomerId": customerId,
        });
        if (user) {
          user.subscription.plan = "FREE";
          user.subscription.status = "canceled";
          await user.save();
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const user = await User.findOne({
          "subscription.stripeCustomerId": customerId,
        });
        if (user) {
          user.subscription.status = "active";
          const newPeriodEnd = new Date();
          newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);
          user.subscription.currentPeriodEnd = newPeriodEnd;
          await user.save();
        }
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Error processing Stripe webhook event:", err);
    return res.status(500).json({ message: "Webhook handler failed" });
  }
};
