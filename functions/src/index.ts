import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

initializeApp();
const db = getFirestore();

const GOOGLE_CLIENT_ID = defineSecret("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_CLIENT_SECRET");

const APP_REDIRECT_WEB = defineString("APP_REDIRECT_WEB", {
  default: "http://localhost:8081/calendar-sync",
});

/** Full public URL of the googleOAuthCallback Cloud Run service */
const GOOGLE_OAUTH_CALLBACK_URL = defineString("GOOGLE_OAUTH_CALLBACK_URL", {
  default: "https://googleoauthcallback-terdg5ahya-uc.a.run.app",
});

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signState(payload: object) {
  return base64Url(JSON.stringify(payload));
}

function readState(state: string): { uid: string } | null {
  try {
    const json = Buffer.from(
      state.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const parsed = JSON.parse(json) as { uid?: string };
    if (!parsed?.uid || typeof parsed.uid !== "string") return null;
    return { uid: parsed.uid };
  } catch {
    return null;
  }
}

function pad2(n: number) {
  return `${n}`.padStart(2, "0");
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTime(d: Date) {
  return `${d.getHours()}:${pad2(d.getMinutes())}`;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID.value(),
      client_secret: GOOGLE_CLIENT_SECRET.value(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!tokenRes.ok || !json.access_token) {
    throw new Error(json.error || "Could not refresh Google access token.");
  }
  return json;
}

/**
 * Start Google Calendar OAuth.
 * GET /googleOAuthStart?uid=...
 */
export const googleOAuthStart = onRequest(
  { secrets: [GOOGLE_CLIENT_ID], cors: true, invoker: "public" },
  async (req, res) => {
    const uid = String(req.query.uid || "");
    if (!uid) {
      res.status(400).send("Missing uid.");
      return;
    }

    const redirectUri = GOOGLE_OAUTH_CALLBACK_URL.value();
    const state = signState({
      uid,
      nonce: crypto.randomBytes(8).toString("hex"),
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID.value(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });

    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );
  }
);

/**
 * Google OAuth callback — saves tokens, redirects into Kairos.
 */
export const googleOAuthCallback = onRequest(
  {
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET],
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    try {
      const code = String(req.query.code || "");
      const state = readState(String(req.query.state || ""));
      if (!code || !state?.uid) {
        res.status(400).send("Missing code/state from Google.");
        return;
      }

      const redirectUri = GOOGLE_OAUTH_CALLBACK_URL.value();
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID.value(),
          client_secret: GOOGLE_CLIENT_SECRET.value(),
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (!tokenRes.ok || !tokenJson.access_token) {
        res
          .status(400)
          .send(
            `Token exchange failed: ${tokenJson.error || ""} ${
              tokenJson.error_description || ""
            }`
          );
        return;
      }

      let accountEmail = "";
      try {
        const meRes = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
        );
        const me = (await meRes.json()) as { email?: string };
        accountEmail = me.email || "";
      } catch {
        // optional
      }

      const expiresAt = tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

      const existing = await db
        .collection("users")
        .doc(state.uid)
        .collection("calendarConnections")
        .doc("google")
        .get();
      const prev = existing.data() || {};

      await db.collection("users").doc(state.uid).set(
        { updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      await db
        .collection("users")
        .doc(state.uid)
        .collection("calendarConnections")
        .doc("google")
        .set(
          {
            provider: "google",
            accountEmail,
            accessToken: tokenJson.access_token,
            refreshToken: tokenJson.refresh_token || prev.refreshToken || null,
            expiresAt,
            calendarId: prev.calendarId || "primary",
            calendarTitle: prev.calendarTitle || "Primary",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      res.redirect(
        `${APP_REDIRECT_WEB.value()}?google=connected&uid=${encodeURIComponent(
          state.uid
        )}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).send(`googleOAuthCallback failed: ${message}`);
    }
  }
);

/**
 * Lightweight connection check for the Expo app.
 * GET /googleStatus?uid=...
 */
export const googleStatus = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
    try {
      const uid = String(req.query.uid || "");
      if (!uid) {
        res.status(400).json({ error: "Missing uid." });
        return;
      }
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("calendarConnections")
        .doc("google")
        .get();
      if (!snap.exists) {
        res.json({ connected: false });
        return;
      }
      const data = snap.data() || {};
      const lastImportedAt = data.lastImportedAt?.toDate
        ? data.lastImportedAt.toDate().toISOString()
        : data.lastImportedAt || null;
      res.json({
        connected: Boolean(data.refreshToken || data.accessToken),
        accountEmail: data.accountEmail || "",
        calendarId: data.calendarId || "primary",
        calendarTitle: data.calendarTitle || "Primary",
        lastImportedAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);

/**
 * Import Google Calendar events into Kairos-shaped JSON.
 * GET /importGoogle?uid=...&days=14
 */
export const importGoogle = onRequest(
  {
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET],
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    try {
      const uid = String(req.query.uid || "");
      const days = Math.min(
        60,
        Math.max(1, parseInt(String(req.query.days || "14"), 10) || 14)
      );
      if (!uid) {
        res.status(400).json({ error: "Missing uid." });
        return;
      }

      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("calendarConnections")
        .doc("google")
        .get();
      if (!snap.exists) {
        res.status(404).json({
          error: "Google is not connected for this device yet. Tap Connect first.",
        });
        return;
      }

      const data = snap.data() || {};
      let accessToken = data.accessToken as string | undefined;
      const refreshToken = data.refreshToken as string | undefined;
      const calendarId = (data.calendarId as string) || "primary";

      const expiresAt = data.expiresAt?.toDate
        ? data.expiresAt.toDate()
        : data.expiresAt
          ? new Date(data.expiresAt)
          : null;
      const needsRefresh =
        !accessToken ||
        (expiresAt && expiresAt.getTime() < Date.now() + 60_000);

      if (needsRefresh) {
        if (!refreshToken) {
          res.status(401).json({
            error: "Google connection expired. Connect Google again.",
          });
          return;
        }
        const refreshed = await refreshGoogleAccessToken(refreshToken);
        accessToken = refreshed.access_token!;
        await snap.ref.set(
          {
            accessToken,
            expiresAt: refreshed.expires_in
              ? new Date(Date.now() + refreshed.expires_in * 1000)
              : null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      const timeMin = new Date();
      timeMin.setHours(0, 0, 0, 0);
      const timeMax = new Date(timeMin);
      timeMax.setDate(timeMax.getDate() + days);

      const eventsUrl = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events`
      );
      eventsUrl.searchParams.set("singleEvents", "true");
      eventsUrl.searchParams.set("orderBy", "startTime");
      eventsUrl.searchParams.set("timeMin", timeMin.toISOString());
      eventsUrl.searchParams.set("timeMax", timeMax.toISOString());
      eventsUrl.searchParams.set("maxResults", "250");

      const eventsRes = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const eventsJson = (await eventsRes.json()) as {
        items?: Array<{
          id?: string;
          summary?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
        }>;
        error?: { message?: string };
      };

      if (!eventsRes.ok) {
        res.status(400).json({
          error: eventsJson.error?.message || "Google Calendar API error.",
        });
        return;
      }

      const events = (eventsJson.items || [])
        .filter((item) => item.id && (item.start?.dateTime || item.start?.date))
        .map((item) => {
          const allDay = Boolean(item.start?.date && !item.start?.dateTime);
          const start = item.start?.dateTime
            ? new Date(item.start.dateTime)
            : new Date(`${item.start!.date}T09:00:00`);
          const end = item.end?.dateTime
            ? new Date(item.end.dateTime)
            : new Date(`${item.end?.date || item.start!.date}T10:00:00`);
          const durationMinutes = Math.max(
            15,
            Math.round((end.getTime() - start.getTime()) / 60000)
          );
          return {
            id: item.id!,
            calendarId,
            title: item.summary || "Untitled event",
            date: toDateKey(start),
            start: allDay ? "9:00" : toTime(start),
            end: allDay ? "10:00" : toTime(end),
            durationMinutes: allDay ? 60 : durationMinutes,
            allDay,
          };
        });

      await snap.ref.set(
        {
          lastImportedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({
        imported: events.length,
        accountEmail: data.accountEmail || "",
        calendarId,
        calendarTitle: data.calendarTitle || "Primary",
        events,
        message: `Imported ${events.length} event${
          events.length === 1 ? "" : "s"
        } from Google.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);
