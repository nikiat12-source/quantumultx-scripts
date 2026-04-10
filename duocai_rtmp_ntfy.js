/*
  多彩 Quantumult X 抓 RTMP - Ntfy relay 版
  用法：给 sdkdc.tlivesdk.com/liteav 配 script-request-body
  说明：QX 端不做 raw-deflate 解压，只把 request body 原样转 hex 后推到 ntfy，
  由电脑端 Python 接收器负责解压并提取 str_stream_url。
*/

const NTFY_SERVER = "https://ntfy.sh";
const NTFY_TOPIC = "duocai-relay-mobile-ntfy";
const MESSAGE_PREFIX = "QX_STREAM";
const DEDUPE_KEY = "duocai_liteav_last_marker";
const DEDUPE_TIME_KEY = "duocai_liteav_last_marker_time";
const DEDUPE_SECONDS = 8;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function shouldSkip(marker) {
  const last = $prefs.valueForKey(DEDUPE_KEY) || "";
  const lastTime = parseInt($prefs.valueForKey(DEDUPE_TIME_KEY) || "0", 10);
  return last === marker && nowSeconds() - lastTime < DEDUPE_SECONDS;
}

function remember(marker) {
  $prefs.setValueForKey(marker, DEDUPE_KEY);
  $prefs.setValueForKey(String(nowSeconds()), DEDUPE_TIME_KEY);
}

function toHex(str) {
  const text = String(str || "");
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) & 0xff;
    out += v.toString(16).padStart(2, "0");
  }
  return out;
}

function sendToNtfy(payload) {
  return $task.fetch({
    url: `${NTFY_SERVER}/${NTFY_TOPIC}`,
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "多彩 RTMP relay",
      "Tags": "satellite_dish",
    },
    body: `${MESSAGE_PREFIX} ${JSON.stringify(payload)}`,
  });
}

async function main() {
  const requestUrl = ($request && $request.url) || "";
  const body = ($request && typeof $request.body === "string") ? $request.body : "";
  if (!/sdkdc\.tlivesdk\.com\/liteav/i.test(requestUrl) || !body) {
    $done({});
    return;
  }

  const bodyHex = toHex(body);
  const marker = `${requestUrl}|${bodyHex.slice(0, 96)}|${bodyHex.length}`;
  if (shouldSkip(marker)) {
    $done({});
    return;
  }
  remember(marker);

  const payload = {
    source: "QuantumultX",
    kind: "liteav_request_raw",
    request_url: requestUrl,
    body_hex: bodyHex,
    body_length: Math.floor(bodyHex.length / 2),
    headers: $request.headers || {},
    captured_at: new Date().toISOString(),
  };

  try {
    await sendToNtfy(payload);
    console.log("[duocai] liteav request pushed");
  } catch (e) {
    console.log(`[duocai] ntfy send failed: ${e}`);
  }

  $done({});
}

main();
