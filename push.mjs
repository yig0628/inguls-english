import { createHash, timingSafeEqual } from "node:crypto";
import pg from "pg";
import { sendNotification } from "web-push";

const databaseUrl = process.env.PUSH_DATABASE_URL;
const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
const subject = process.env.VAPID_SUBJECT?.trim() ?? "";
const token = process.env.PUSH_SCHEDULE_TOKEN?.trim() ?? "";
const configured = Boolean(databaseUrl && token.length >= 32 &&
  /^[\w-]{87}$/.test(publicKey) && /^[\w-]{43}$/.test(privateKey) && /^(mailto:|https:\/\/)/.test(subject));
const pool = configured ? new pg.Pool({
  connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 12000, idleTimeoutMillis: 10000,
}) : null;
pool?.on("error", () => console.error("Reminder database connection closed."));
let schemaReady;

async function query(statement, values) {
  schemaReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS inguls_push_subscriptions (
      endpoint text PRIMARY KEY,
      p256dh text NOT NULL,
      auth text NOT NULL,
      last_test timestamptz,
      last_day date,
      claim_day date,
      claim_until timestamptz
    )
  `).catch(error => {
    schemaReady = undefined;
    throw error;
  });
  await schemaReady;
  return pool.query(statement, values);
}

const seoulDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  weekday: "short", hour: "2-digit", hourCycle: "h23",
});
const digest = value => createHash("sha256").update(value).digest();
const hosts = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "notify.windows.com"]);

function validSubscription(data) {
  if (typeof data?.endpoint !== "string" || data.endpoint.length > 1750 ||
      typeof data.keys?.p256dh !== "string" || !/^[\w-]{87}$/.test(data.keys.p256dh) ||
      typeof data.keys?.auth !== "string" || !/^[\w-]{22}$/.test(data.keys.auth)) return false;
  try {
    const url = new URL(data.endpoint);
    const allowed = hosts.has(url.hostname) || url.hostname.endsWith(".push.apple.com") ||
      url.hostname.endsWith(".notify.windows.com");
    return allowed && url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash;
  } catch {
    return false;
  }
}

async function notify(device, day, message, test = false) {
  try {
    await sendNotification({
      endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth },
    }, JSON.stringify({
      title: "INGUL’S English", body: message, tag: test ? "ingul-test" : "ingul-" + day,
    }), {
      vapidDetails: { subject, publicKey, privateKey }, TTL: test ? 120 : 1800, timeout: 8000,
    });
    return "sent";
  } catch (error) {
    if (error.statusCode !== 404 && error.statusCode !== 410) return "failed";
    await query("DELETE FROM inguls_push_subscriptions WHERE endpoint=$1 AND auth=$2", [device.endpoint, device.auth]);
    return "expired";
  }
}

async function sendMorning(now = new Date()) {
  const parts = Object.fromEntries(seoulDate.formatToParts(now).map(({type, value}) => [type, value]));
  if (parts.weekday === "Sun" || parts.hour !== "09") return { sent: 0, failed: 0, skipped: true };
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const { rows: devices } = await query(`SELECT endpoint, auth FROM inguls_push_subscriptions
    WHERE last_day IS DISTINCT FROM $1 AND (claim_day IS DISTINCT FROM $1 OR claim_until<=now())`, [day]);
  const message = parts.weekday === "Sat"
    ? "토요일 복습이 열렸어요. 이번 주 표현을 다시 말해 보세요."
    : "오늘의 영어 10문장이 열렸어요.";
  const result = { sent: 0, failed: 0 };
  for (let start = 0; start < devices.length; start += 10) {
    await Promise.all(devices.slice(start, start + 10).map(async ({endpoint, auth}) => {
      const args = [day, endpoint, auth];
      const { rows: [device] } = await query(`UPDATE inguls_push_subscriptions
        SET claim_day=$1, claim_until=now()+interval '2 minutes'
        WHERE endpoint=$2 AND auth=$3 AND last_day IS DISTINCT FROM $1
        AND (claim_day IS DISTINCT FROM $1 OR claim_until<=now()) RETURNING *`, args);
      if (!device) return;
      const status = await notify(device, day, message);
      if (status === "expired") return;
      if (status === "sent") result.sent++;
      else result.failed++;
      await query(`UPDATE inguls_push_subscriptions SET last_day=CASE WHEN $4 THEN $1 ELSE last_day END,
        claim_day=NULL, claim_until=NULL WHERE endpoint=$2 AND auth=$3 AND claim_day=$1`, [...args, status === "sent"]);
    }));
  }
  return result;
}

async function readSubscription(req) {
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") return;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) {
      // Drain the request so the caller receives a JSON error instead of a closed socket.
      req.resume();
      return;
    }
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (validSubscription(data)) return data;
  } catch {
    return;
  }
}

export async function handlePush(req, path, respond) {
  const error = (status, message) => respond(status, { message });
  try {
    if (path === "/api/push/config" && req.method === "GET") {
      return respond(200, { publicKey: configured ? publicKey : "" });
    }
    if (req.method !== "POST") return error(405, "지원하지 않는 요청이에요.");
    if (path === "/api/push/send") {
      const header = req.headers.authorization;
      if (!token || typeof header !== "string" || !timingSafeEqual(digest(header), digest("Bearer " + token))) {
        return error(401, "발송 권한이 없어요.");
      }
      if (!configured) return error(503, "예약 알림이 연결되지 않았어요.");
      await query("SELECT 1");
      return respond(200, await sendMorning());
    }
    if (!configured) return error(503, "예약 알림이 연결되지 않았어요.");
    if (req.headers["sec-fetch-site"] === "cross-site") return error(403, "이 앱에서 다시 시도해 주세요.");
    const data = await readSubscription(req);
    if (!data) return error(400, "기기 알림 정보가 올바르지 않아요.");
    const { endpoint, keys: { auth, p256dh } } = data;
    if (path === "/api/push/subscribe") {
      const { rowCount } = await query(`INSERT INTO inguls_push_subscriptions(endpoint, auth, p256dh)
        SELECT $1,$2,$3 WHERE (SELECT count(*) FROM inguls_push_subscriptions) < 250
          OR EXISTS (SELECT 1 FROM inguls_push_subscriptions WHERE endpoint=$1 AND auth=$2)
        ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh
        WHERE inguls_push_subscriptions.auth=excluded.auth`, [endpoint, auth, p256dh]);
      return rowCount ? respond(200, { enabled: true }) : error(409, "기기 알림을 등록하지 못했어요.");
    }
    if (path === "/api/push/status") {
      const { rowCount } = await query("SELECT 1 FROM inguls_push_subscriptions WHERE endpoint=$1 AND auth=$2", [endpoint, auth]);
      return respond(200, { enabled: rowCount > 0 });
    }
    if (path === "/api/push/remove") {
      await query("DELETE FROM inguls_push_subscriptions WHERE endpoint=$1 AND auth=$2", [endpoint, auth]);
      return respond(200, { enabled: false });
    }
    if (path === "/api/push/test") {
      const { rows: [device] } = await query(`UPDATE inguls_push_subscriptions SET last_test=now()
        WHERE endpoint=$1 AND auth=$2 AND (last_test IS NULL OR last_test<=now()-interval '1 minute')
        RETURNING *`, [endpoint, auth]);
      if (!device) return error(429, "이 기기의 알림을 켠 뒤 1분 간격으로 테스트해 주세요.");
      const status = await notify(device, "", "이 기기에서 학습 알림을 받을 수 있어요.", true);
      if (status !== "sent") return error(502, "테스트 알림을 보내지 못했어요. 알림을 다시 켜고 시도해 주세요.");
      return respond(200, { sent: true });
    }
    return error(404, "알림 기능을 찾을 수 없어요.");
  } catch {
    console.error("Reminder request failed.");
    return error(503, "알림을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}
