/*
  91直播 Quantumult X 抓正常链接版
  目标：
  1. 从请求 URL / 响应体中抓 flv/m3u8
  2. 通过 ntfy 发回电脑端
  3. 只处理正常链接，不碰 _one_
*/

const NTFY_SERVER = "https://ntfy.sh";
const NTFY_TOPIC = "fanqie-relay-91live-normal";
const MESSAGE_PREFIX = "QX_STREAM";
const DEDUPE_KEY = "qx_91live_last_url";
const DEDUPE_TIME_KEY = "qx_91live_last_time";
const DEDUPE_SECONDS = 20;

const STREAM_RE = /https?:\/\/[^\s"'<>]+?\.(?:flv|m3u8)(?:\?[^\s"'<>]*)?/ig;
const ROOM_RE = /\/h001\/(\d+)(?:_[^/?]+)?\.(?:flv|m3u8)/i;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function unique(list) {
  const seen = {};
  const out = [];
  for (const item of list) {
    const key = String(item || "").trim();
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(key);
  }
  return out;
}

function shouldSkip(url) {
  const lastUrl = $prefs.valueForKey(DEDUPE_KEY) || "";
  const lastTime = parseInt($prefs.valueForKey(DEDUPE_TIME_KEY) || "0", 10);
  return lastUrl === url && nowSeconds() - lastTime < DEDUPE_SECONDS;
}

function remember(url) {
  $prefs.setValueForKey(url, DEDUPE_KEY);
  $prefs.setValueForKey(String(nowSeconds()), DEDUPE_TIME_KEY);
}

function extractRoomId(url, requestUrl) {
  const merged = `${url || ""} ${requestUrl || ""}`;
  const match = merged.match(ROOM_RE);
  return match ? match[1] : "";
}

function collectCandidates() {
  const hits = [];
  const requestUrl = ($request && $request.url) || "";
  const body = (typeof $response !== "undefined" && $response && $response.body) ? String($response.body) : "";

  if (requestUrl) {
    const reqMatches = requestUrl.match(STREAM_RE);
    if (reqMatches) hits.push(...reqMatches);
    if (/\.(flv|m3u8)(\?|$)/i.test(requestUrl)) hits.push(requestUrl);
  }
  if (body) {
    const bodyMatches = body.match(STREAM_RE);
    if (bodyMatches) hits.push(...bodyMatches);
  }
  return unique(hits)
    .filter(url => !/_one_/i.test(url))
    .filter(url => /^https?:\/\//i.test(url));
}

function pushToNtfy(url) {
  const requestUrl = ($request && $request.url) || "";
  const payload = {
    source: "QuantumultX",
    kind: "normal_live_url",
    room_id: extractRoomId(url, requestUrl),
    url: url,
    request_url: requestUrl,
    captured_at: new Date().toISOString(),
  };

  return $task.fetch({
    url: `${NTFY_SERVER}/${NTFY_TOPIC}`,
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "91直播正常链接",
      "Priority": "3",
      "Tags": "signal_strength",
    },
    body: `${MESSAGE_PREFIX} ${JSON.stringify(payload)}`,
  });
}

async function main() {
  const candidates = collectCandidates();
  for (const url of candidates) {
    if (shouldSkip(url)) continue;
    remember(url);
    try {
      await pushToNtfy(url);
    } catch (e) {}
  }
  $done({});
}

main();
