/*
  Duocai Quantumult X normal live URL capture - ntfy relay edition
  Goal:
  1. Capture already-formed rtmp/webrtc/flv/m3u8 links from request/response
  2. Forward them to ntfy for the desktop receiver
  3. Avoid touching binary liteav request bodies
*/

const NTFY_SERVER = "https://ntfy.sh";
const NTFY_TOPIC = "duocai-relay-mobile-ntfy";
const MESSAGE_PREFIX = "QX_STREAM";
const DEDUPE_KEY = "qx_duocai_last_url";
const DEDUPE_TIME_KEY = "qx_duocai_last_time";
const DEDUPE_SECONDS = 20;

const STREAM_RE = /(webrtc:\/\/[^\s"'<>]+|rtmp:\/\/[^\s"'<>]+|https?:\/\/[^\s"'<>]+?\.(?:flv|m3u8)(?:\?[^\s"'<>]*)?)/ig;

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

function collectCandidates() {
  const hits = [];
  const requestUrl = ($request && $request.url) || "";
  const requestBody = ($request && typeof $request.body !== "undefined") ? String($request.body || "") : "";
  const responseBody = (typeof $response !== "undefined" && $response && typeof $response.body !== "undefined")
    ? String($response.body || "")
    : "";

  if (requestUrl) {
    const reqUrlMatches = requestUrl.match(STREAM_RE);
    if (reqUrlMatches) hits.push(...reqUrlMatches);
    if (/^(?:webrtc|rtmp):\/\//i.test(requestUrl) || /\.(?:flv|m3u8)(?:\?|$)/i.test(requestUrl)) {
      hits.push(requestUrl);
    }
  }

  if (requestBody) {
    const reqBodyMatches = requestBody.match(STREAM_RE);
    if (reqBodyMatches) hits.push(...reqBodyMatches);
  }

  if (responseBody) {
    const respBodyMatches = responseBody.match(STREAM_RE);
    if (respBodyMatches) hits.push(...respBodyMatches);
  }

  return unique(hits);
}

function pushToNtfy(url) {
  const requestUrl = ($request && $request.url) || "";
  const payload = {
    source: "QuantumultX",
    kind: "normal_live_url",
    url: url,
    request_url: requestUrl,
    captured_at: new Date().toISOString(),
    extra: {
      has_request_body: !!(($request && $request.body) || ""),
      has_response_body: !!((typeof $response !== "undefined" && $response && $response.body) || ""),
    },
  };

  return $task.fetch({
    url: `${NTFY_SERVER}/${NTFY_TOPIC}`,
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "duocai normal live url",
      "Priority": "3",
      "Tags": "satellite",
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
