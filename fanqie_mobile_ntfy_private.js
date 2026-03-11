/**
 * Quantumult X live stream capture - Mobile network ntfy relay edition
 * Private-use build with embedded ntfy topic.
 */

const NTFY_SERVER = "https://ntfy.sh";
const NTFY_TOPIC = "fanqie-relay-7f29c6b4-9d4f-4d91-9e7f-31d8b6cc0d2a";
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
    sendToNtfy(foundUrls.join("\n"));
  }
} else if (url.includes("szier2.com/live") || url.includes("sourcelandchina.com/live")) {
  let extracted = url.replace(/^https?:\/\//, "rtmp://");
  if (url.includes("sourcelandchina.com")) {
    extracted = extracted.replace(/livefpad/g, "live");
  }
  sendToNtfy(extracted);
}

$done({});

function sendToNtfy(msg) {
  const endpoint = `${NTFY_SERVER}/${NTFY_TOPIC}`;
  $task.fetch({
    url: endpoint,
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "QX stream relay",
      "Tags": "satellite_dish",
    },
    body: `${MESSAGE_PREFIX}\n${msg}`,
  }).then(
    () => console.log("[ntfy] Stream link sent"),
    (err) => console.log(`[ntfy] Send failed: ${err}`)
  );
}
