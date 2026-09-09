import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import Stripe from "stripe";

const db = getFirestore();

export const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
export const STRIPE_PRICE_STARTER = defineSecret("STRIPE_PRICE_STARTER");
export const STRIPE_PRICE_POWER = defineSecret("STRIPE_PRICE_POWER");

const APP_ORIGIN = defineString("APP_ORIGIN", {
  default: "https://kairos-ai-13e53.web.app",
});

/** Free credits granted on new account signup. */
export const FREE_SIGNUP_CREDITS = 15;
/** Credits consumed per live AI coach message (Gemini call). */
export const CREDITS_PER_COACH_MESSAGE = 1;

export type CreditPackId = "starter" | "power";

export const CREDIT_PACKS: Record<
  CreditPackId,
  { credits: number; label: string; priceLabel: string }
> = {
  starter: { credits: 50, label: "Starter pack", priceLabel: "$4.99" },
  power: { credits: 200, label: "Power pack", priceLabel: "$14.99" },
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function resolveSession(token: string) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const snap = await db.collection("sessions").doc(tokenHash).get();
  if (!snap.exists) return null;
  const data = snap.data() as {
    uid?: string;
    expiresAt?: Date | { toDate: () => Date };
  };
  if (!data.uid) return null;
  const expires =
    data.expiresAt instanceof Date
      ? data.expiresAt
      : data.expiresAt && typeof data.expiresAt.toDate === "function"
        ? data.expiresAt.toDate()
        : null;
  if (expires && expires.getTime() < Date.now()) {
    await snap.ref.delete();
    return null;
  }
  return { uid: data.uid, tokenHash };
}

function billingRef(uid: string) {
  return db.doc(`users/${uid}/billing/account`);
}

function readSecret(secret: ReturnType<typeof defineSecret>) {
  try {
    return secret.value() || "";
  } catch {
    return "";
  }
}

function packPriceId(packId: CreditPackId) {
  if (packId === "starter") return readSecret(STRIPE_PRICE_STARTER);
  if (packId === "power") return readSecret(STRIPE_PRICE_POWER);
  return "";
}

export type BillingAccountDoc = {
  creditsBalance: number;
  lifetimeCreditsUsed: number;
  stripeCustomerId?: string;
};

/** Create billing account with signup bonus if missing. */
export async function ensureBillingAccount(uid: string, grantSignup = false) {
  const ref = billingRef(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      return snap.data() as BillingAccountDoc;
    }
    const initial = grantSignup ? FREE_SIGNUP_CREDITS : 0;
    const doc: BillingAccountDoc = {
      creditsBalance: initial,
      lifetimeCreditsUsed: 0,
    };
    tx.set(ref, {
      ...doc,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return doc;
  });
}

export async function readBillingAccount(uid: string): Promise<BillingAccountDoc> {
  const snap = await billingRef(uid).get();
  if (!snap.exists) {
    return ensureBillingAccount(uid, false);
  }
  const data = snap.data() as BillingAccountDoc;
  return {
    creditsBalance: data.creditsBalance ?? 0,
    lifetimeCreditsUsed: data.lifetimeCreditsUsed ?? 0,
    stripeCustomerId: data.stripeCustomerId,
  };
}

/** Atomically deduct one coach credit before calling Gemini. */
export async function deductCoachCredit(uid: string, messagePreview: string) {
  const ref = billingRef(uid);
  const usageRef = db.collection(`users/${uid}/billing/usage`).doc();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.data() as BillingAccountDoc | undefined) ?? {
      creditsBalance: 0,
      lifetimeCreditsUsed: 0,
    };
    const balance = data.creditsBalance ?? 0;
    if (balance < CREDITS_PER_COACH_MESSAGE) {
      const err = new Error("Insufficient coach credits.");
      (err as Error & { code: string }).code = "NO_CREDITS";
      throw err;
    }
    const nextBalance = balance - CREDITS_PER_COACH_MESSAGE;
    tx.set(
      ref,
      {
        creditsBalance: nextBalance,
        lifetimeCreditsUsed:
          (data.lifetimeCreditsUsed ?? 0) + CREDITS_PER_COACH_MESSAGE,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    tx.set(usageRef, {
      type: "coach_chat",
      creditsUsed: CREDITS_PER_COACH_MESSAGE,
      messagePreview: messagePreview.slice(0, 120),
      createdAt: FieldValue.serverTimestamp(),
    });
    return { creditsRemaining: nextBalance };
  });
}

/** Grant credits after Stripe checkout (idempotent via session id). */
export async function grantCreditsFromPurchase(input: {
  uid: string;
  packId: CreditPackId;
  credits: number;
  stripeSessionId: string;
}) {
  const purchaseRef = db
    .collection(`users/${input.uid}/billing/purchases`)
    .doc(input.stripeSessionId);

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(purchaseRef);
    if (existing.exists) {
      const account = await tx.get(billingRef(input.uid));
      return {
        creditsGranted: 0,
        creditsBalance: (account.data()?.creditsBalance as number) ?? 0,
        duplicate: true,
      };
    }

    const accountRef = billingRef(input.uid);
    const accountSnap = await tx.get(accountRef);
    const current = (accountSnap.data()?.creditsBalance as number) ?? 0;
    const next = current + input.credits;

    tx.set(
      accountRef,
      {
        creditsBalance: next,
        updatedAt: FieldValue.serverTimestamp(),
        ...(accountSnap.exists
          ? {}
          : {
              lifetimeCreditsUsed: 0,
              createdAt: FieldValue.serverTimestamp(),
            }),
      },
      { merge: true }
    );

    tx.set(purchaseRef, {
      packId: input.packId,
      creditsGranted: input.credits,
      stripeSessionId: input.stripeSessionId,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { creditsGranted: input.credits, creditsBalance: next, duplicate: false };
  });
}

function publicBillingPayload(account: BillingAccountDoc) {
  return {
    creditsBalance: account.creditsBalance ?? 0,
    lifetimeCreditsUsed: account.lifetimeCreditsUsed ?? 0,
    creditsPerMessage: CREDITS_PER_COACH_MESSAGE,
    freeSignupCredits: FREE_SIGNUP_CREDITS,
    packs: Object.entries(CREDIT_PACKS).map(([id, pack]) => ({
      id,
      ...pack,
    })),
  };
}

function stripeClient() {
  const key = readSecret(STRIPE_SECRET_KEY);
  if (!key) throw new Error("Stripe is not configured.");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

function resolveReturnUrl(path: string) {
  const origin = APP_ORIGIN.value().replace(/\/$/, "");
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${safePath}`;
}

/**
 * GET ?token=...
 * Returns credit balance and available packs.
 */
export const getBillingAccount = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      if (req.method !== "GET") {
        res.status(405).json({ error: "GET only" });
        return;
      }
      const token = String(req.query.token || "");
      const session = await resolveSession(token);
      if (!session) {
        res.status(401).json({ error: "Sign in to view coach credits." });
        return;
      }

      const account = await readBillingAccount(session.uid);
      res.json(publicBillingPayload(account));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST { token, packId, returnPath? }
 * Creates a Stripe Checkout session for a credit pack.
 */
export const createCheckoutSession = onRequest(
  {
    cors: true,
    invoker: "public",
    secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_POWER],
  },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
      }

      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const token = String(body.token || "");
      const packId = String(body.packId || "") as CreditPackId;
      const returnPath =
        typeof body.returnPath === "string" ? body.returnPath : "/coach-billing";

      const session = await resolveSession(token);
      if (!session) {
        res.status(401).json({ error: "Sign in to purchase coach credits." });
        return;
      }

      const pack = CREDIT_PACKS[packId];
      if (!pack) {
        res.status(400).json({ error: "Unknown credit pack." });
        return;
      }

      const priceId = packPriceId(packId);
      if (!priceId) {
        res.status(503).json({
          error:
            "Stripe prices are not configured. Set STRIPE_PRICE_STARTER and STRIPE_PRICE_POWER secrets, then redeploy.",
        });
        return;
      }

      const stripe = stripeClient();
      const account = await readBillingAccount(session.uid);
      let customerId = account.stripeCustomerId;

      if (!customerId) {
        const userSnap = await db.collection("users").doc(session.uid).get();
        const email = String(userSnap.data()?.email || "");
        const customer = await stripe.customers.create({
          email: email || undefined,
          metadata: { kairosUid: session.uid },
        });
        customerId = customer.id;
        await billingRef(session.uid).set(
          { stripeCustomerId: customerId, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }

      const successUrl = `${resolveReturnUrl(returnPath)}?billing=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${resolveReturnUrl(returnPath)}?billing=cancel`;

      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          kairosUid: session.uid,
          packId,
          credits: String(pack.credits),
        },
      });

      if (!checkout.url) {
        res.status(500).json({ error: "Could not start checkout." });
        return;
      }

      res.json({ url: checkout.url, sessionId: checkout.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);

/**
 * Stripe webhook — grants credits when checkout completes.
 */
export const stripeWebhook = onRequest(
  {
    cors: false,
    invoker: "public",
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("POST only");
      return;
    }

    const webhookSecret = readSecret(STRIPE_WEBHOOK_SECRET);
    const stripeKey = readSecret(STRIPE_SECRET_KEY);
    if (!webhookSecret || !stripeKey) {
      res.status(503).send("Stripe webhook not configured");
      return;
    }

    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) {
      res.status(400).send("Missing Stripe signature");
      return;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
    let event: Stripe.Event;

    try {
      const rawBody =
        (req as { rawBody?: Buffer }).rawBody ??
        (typeof req.body === "string"
          ? Buffer.from(req.body)
          : Buffer.from(JSON.stringify(req.body ?? {})));
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid payload";
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const uid = checkoutSession.metadata?.kairosUid;
        const packId = checkoutSession.metadata?.packId as CreditPackId | undefined;
        const credits = Number(checkoutSession.metadata?.credits || 0);
        const sessionId = checkoutSession.id;

        if (uid && packId && credits > 0 && sessionId) {
          await grantCreditsFromPurchase({
            uid,
            packId,
            credits,
            stripeSessionId: sessionId,
          });
        }
      }

      res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);
