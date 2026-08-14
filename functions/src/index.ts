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

/**
 * Convert a Google event start/end into Kairos wall-clock date + time.
 * Cloud Functions run in UTC — never use Date#getHours() on the server.
 */
function wallClockFromGoogle(opts: {
  dateTime?: string;
  date?: string;
  timeZone?: string;
  fallbackTimeZone: string;
  allDayDefaultTime: string;
}): { date: string; time: string; allDay: boolean; instant: Date } {
  const { dateTime, date, timeZone, fallbackTimeZone, allDayDefaultTime } = opts;

  if (date && !dateTime) {
    const instant = new Date(`${date}T12:00:00Z`);
    return { date, time: allDayDefaultTime, allDay: true, instant };
  }

  if (!dateTime) {
    const instant = new Date();
    return {
      date: instant.toISOString().slice(0, 10),
      time: allDayDefaultTime,
      allDay: false,
      instant,
    };
  }

  const instant = new Date(dateTime);
  const zone = timeZone || fallbackTimeZone;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant);

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || "00";
    const y = get("year");
    const m = get("month");
    const d = get("day");
    const hour = parseInt(get("hour"), 10);
    const minute = get("minute");
    return {
      date: `${y}-${m}-${d}`,
      time: `${hour}:${minute}`,
      allDay: false,
      instant,
    };
  } catch {
    // Fallback: use the clock digits embedded in the RFC3339 string
    const match = dateTime.match(
      /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/
    );
    if (match) {
      return {
        date: match[1],
        time: `${parseInt(match[2], 10)}:${match[3]}`,
        allDay: false,
        instant,
      };
    }
    return {
      date: instant.toISOString().slice(0, 10),
      time: `${instant.getUTCHours()}:${pad2(instant.getUTCMinutes())}`,
      allDay: false,
      instant,
    };
  }
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
      const fallbackTimeZone = String(
        req.query.tz || "America/Los_Angeles"
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
          start?: { dateTime?: string; date?: string; timeZone?: string };
          end?: { dateTime?: string; date?: string; timeZone?: string };
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
          // Return raw Google timestamps — the Expo app converts to the
          // user's local wall clock (Cloud Functions run in UTC).
          if (allDay) {
            const date = item.start!.date!;
            return {
              id: item.id!,
              calendarId,
              title: item.summary || "Untitled event",
              allDay: true,
              startDate: date,
              endDate: item.end?.date || date,
              date,
              start: "9:00",
              end: "10:00",
              durationMinutes: 60,
            };
          }

          const startDateTime = item.start!.dateTime!;
          const endDateTime =
            item.end?.dateTime ||
            new Date(
              new Date(startDateTime).getTime() + 60 * 60 * 1000
            ).toISOString();
          const startMs = new Date(startDateTime).getTime();
          const endMs = new Date(endDateTime).getTime();
          const durationMinutes = Math.max(
            15,
            Math.round((endMs - startMs) / 60000)
          );

          // Also include a best-effort wall clock using the caller's tz
          // (client will recompute locally and win).
          const startWall = wallClockFromGoogle({
            dateTime: startDateTime,
            timeZone: item.start?.timeZone || item.end?.timeZone,
            fallbackTimeZone,
            allDayDefaultTime: "9:00",
          });
          const endWall = wallClockFromGoogle({
            dateTime: endDateTime,
            timeZone: item.end?.timeZone || item.start?.timeZone,
            fallbackTimeZone,
            allDayDefaultTime: "10:00",
          });

          return {
            id: item.id!,
            calendarId,
            title: item.summary || "Untitled event",
            allDay: false,
            startDateTime,
            endDateTime,
            timeZone: item.start?.timeZone || item.end?.timeZone || fallbackTimeZone,
            date: startWall.date,
            start: startWall.time,
            end: endWall.time,
            durationMinutes,
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

/**
 * Export Kairos tasks to Google Calendar.
 * POST JSON { uid, tasks: [{ id, title, startDateTime, endDateTime, externalId?, category?, priority? }] }
 */
export const exportGoogle = onRequest(
  {
    secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET],
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }
      if (req.method !== "POST") {
        res.status(405).json({ error: "Use POST." });
        return;
      }

      const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
        uid?: string;
        tasks?: Array<{
          id: string;
          title: string;
          startDateTime: string;
          endDateTime: string;
          externalId?: string;
          category?: string;
          priority?: string;
        }>;
      };

      const uid = String(body.uid || "");
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];
      if (!uid) {
        res.status(400).json({ error: "Missing uid." });
        return;
      }
      if (!tasks.length) {
        res.json({
          created: 0,
          updated: 0,
          failed: 0,
          links: [],
          message: "No tasks to export.",
        });
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

      let created = 0;
      let updated = 0;
      let failed = 0;
      const links: Array<{
        taskId: string;
        externalId: string;
        calendarId: string;
      }> = [];
      const errors: string[] = [];

      for (const task of tasks) {
        try {
          const eventBody = {
            summary: task.title,
            description: `Synced from Kairos AI${
              task.category ? ` · ${task.category}` : ""
            }${task.priority ? ` · ${task.priority}` : ""}`,
            start: { dateTime: task.startDateTime },
            end: { dateTime: task.endDateTime },
          };

          if (task.externalId) {
            const patchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
              calendarId
            )}/events/${encodeURIComponent(task.externalId)}`;
            const patchRes = await fetch(patchUrl, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(eventBody),
            });
            if (!patchRes.ok) {
              const errText = await patchRes.text();
              throw new Error(errText || "Google update failed");
            }
            updated += 1;
            links.push({
              taskId: task.id,
              externalId: task.externalId,
              calendarId,
            });
          } else {
            const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
              calendarId
            )}/events`;
            const createRes = await fetch(createUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(eventBody),
            });
            const createdJson = (await createRes.json()) as {
              id?: string;
              error?: { message?: string };
            };
            if (!createRes.ok || !createdJson.id) {
              throw new Error(
                createdJson.error?.message || "Google create failed"
              );
            }
            created += 1;
            links.push({
              taskId: task.id,
              externalId: createdJson.id,
              calendarId,
            });
          }
        } catch (err) {
          failed += 1;
          errors.push(
            `${task.title}: ${err instanceof Error ? err.message : "failed"}`
          );
        }
      }

      await snap.ref.set(
        {
          lastExportedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({
        created,
        updated,
        failed,
        links,
        errors,
        message: `Exported to Google: ${created} created, ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);
