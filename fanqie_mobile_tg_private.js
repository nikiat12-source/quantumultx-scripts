/**
 * Quantumult X live stream capture - Mobile network Telegram relay edition
 * Private-use build with embedded Telegram Bot parameters.
 *
 * Warning:
 * - This file contains a real Bot Token and Chat ID.
 * - If you publish this file in a public repository, anyone can see them.
 */

const BOT_TOKEN = "8371441808:AAE2xMxBvRIZ4c_hnOWbz7yt1BEZdb_OqYI";
const CHAT_ID = "1277218326";
const MESSAGE_PREFIX = "QX_STREAM";

const url = $request.url || "";

if (url.includes("hwcloudlive.com") && url.includes("log_report")) {
  const body = $request.body;
  const foundUrls = [];
  if (body) {
    try {
      const logData = JSON.parse(body);
      if (logData && Array.isArray(logData.logs)) {
        logData.logs.forEach((log) => {
          if (log && log.domain && log.streamName && String(log.streamName).includes("txSecret")) {
            foundUrls.push(`rtmp://${log.domain}/live/${log.streamName}`);
          }
        });
      }
    } catch (e) {}
  }
  if (foundUrls.length > 0) {
    sendToTelegram(foundUrls.join("\n"));
  }
} else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
  let extracted = url.replace(/^https?:\/\//, "rtmp://");
  if (url.includes("sourcelandchina.com")) {
    extracted = extracted.replace(/livefpad/g, "live");
  }
  sendToTelegram(extracted);
}

$done({});

function sendToTelegram(msg) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("[TG] Missing BOT_TOKEN or CHAT_ID");
    return;
  }

  const api = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body =
    `chat_id=${encodeURIComponent(CHAT_ID)}` +
    `&text=${encodeURIComponent(`${MESSAGE_PREFIX}\n${msg}`)}` +
    `&disable_notification=true`;

  $task.fetch({
    url: api,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }).then(
    () => console.log("[TG] Stream link sent"),
    (err) => console.log(`[TG] Send failed: ${err}`)
  );
}
