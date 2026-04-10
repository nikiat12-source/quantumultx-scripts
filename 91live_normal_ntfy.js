/*
  91直播 Quantumult X 抓正常链接调试版
  目标：
  1. 直接抓 pl.ycscts.com 的 flv/m3u8
  2. 记录 iwl.mwnvfk.com 请求，便于继续反推业务层
  3. 当前只处理正常链接，不碰 _one_
*/

const NTFY_SERVER = "https://ntfy.sh";
const NTFY_TOPIC = "fanqie-relay-91live-normal";
const MESSAGE_PREFIX = "QX_STREAM";
const DEDUPE_KEY = "qx_91live_last_url";
const DEDUPE_TIME_KEY = "qx_91live_last_time";
const DEBUG_KEY = "qx_91live_last_debug";
const DEBUG_TIME_KEY = "qx_91live_last_debug_time";
const DEDUPE_SECONDS = 20;
const DEBUG_DEDUPE_SECONDS = 8;

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

function shouldSkipDebug(marker) {
  const last = $prefs.valueForKey(DEBUG_KEY) || "";
  const lastTime = parseInt($prefs.valueForKey(DEBUG_TIME_KEY) || "0", 10);
  return last === marker && nowSeconds() - lastTime < DEBUG_DEDUPE_SECONDS;
}

function rememberDebug(marker) {
  $prefs.setValueForKey(marker, DEBUG_KEY);
  $prefs.setValueForKey(String(nowSeconds()), DEBUG_TIME_KEY);
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
    try {
      const obj = JSON.parse(body);
      const queue = [obj];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        if (typeof current === "string") {
          const strMatches = current.match(STREAM_RE);
          if (strMatches) hits.push(...strMatches);
          continue;
        }
        if (Array.isArray(current)) {
          queue.push(...current);
          continue;
        }
        if (typeof current === "object") {
          for (const key of Object.keys(current)) {
            const value = current[key];
            if (
              typeof value === "string" &&
              /^(url|playurl|play_url|flv|m3u8|pullstreamaddr360|pullstreamaddr540|pullstreamaddr720|request_url|raw_url)$/i.test(key)
            ) {
              hits.push(value);
            } else if (value && (typeof value === "object" || Array.isArray(value))) {
              queue.push(value);
            }
          }
        }
      }
    } catch (e) {}
  }

  return unique(hits)
    .filter(url => !/_one_/i.test(url))
    .filter(url => /^https?:\/\//i.test(url));
}

function pushToNtfy(url, kind, extra) {
  const requestUrl = ($request && $request.url) || "";
  const payload = {
    source: "QuantumultX",
    kind: kind || "normal_live_url",
    room_id: extractRoomId(url, requestUrl),
    url: url,
    request_url: requestUrl,
    captured_at: new Date().toISOString(),
    extra: extra || {},
  };

  return $task.fetch({
    url: `${NTFY_SERVER}/${NTFY_TOPIC}`,
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "91直播链路调试",
      "Priority": "3",
      "Tags": "signal_strength",
    },
    body: `${MESSAGE_PREFIX} ${JSON.stringify(payload)}`,
  });
}

async function main() {
  const requestUrl = ($request && $request.url) || "";
  const body = (typeof $response !== "undefined" && $response && $response.body) ? String($response.body) : "";
  const candidates = collectCandidates();

  if (requestUrl) {
    const marker = `req:${requestUrl}`;
    if (!shouldSkipDebug(marker)) {
      rememberDebug(marker);
      try {
        await pushToNtfy(requestUrl, "debug_request", {
          has_body: !!body,
          body_length: body.length || 0,
          candidate_count: candidates.length,
        });
      } catch (e) {}
    }
  }

  for (const url of candidates) {
    if (shouldSkip(url)) continue;
    remember(url);
    try {
      await pushToNtfy(url, "normal_live_url", { candidate_count: candidates.length });
    } catch (e) {}
  }

  $done({});
}

main();
