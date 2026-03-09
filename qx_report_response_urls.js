/*
Quantumult X response reporter

扫描响应体里的直播链接并上报到电脑接收器，然后原响应继续返回。
建议把这个文件放到：
On My iPhone/Quantumult X/Scripts/
或 iCloud Drive/Quantumult X/Scripts/
*/

const RECEIVER_URL = "http://192.168.6.101:8310/submit";
const SOURCE = "QuantumultX";
const DEVICE = "iPhone";
const KIND = "response-body";
const URL_PATTERN = /(rtmp:\/\/[^\s"'<>]+|https?:\/\/[^\s"'<>]+(?:\.m3u8|\.flv)[^\s"'<>]*)/ig;

function finish(body) {
  $done({ body });
}

function unique(items) {
  const seen = {};
  const out = [];
  for (const item of items) {
    if (!seen[item]) {
      seen[item] = true;
      out.push(item);
    }
  }
  return out;
}

function report(matches, body) {
  if (!matches.length) {
    finish(body);
    return;
  }

  const payload = {
    source: SOURCE,
    device: DEVICE,
    kind: KIND,
    text: matches.join("\n"),
  };

  $task.fetch({
    url: RECEIVER_URL,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(() => {
    finish(body);
  }, () => {
    finish(body);
  });
}

try {
  const body = ($response && $response.body) || "";
  const matches = unique(body.match(URL_PATTERN) || []);
  report(matches, body);
} catch (e) {
  finish(($response && $response.body) || "");
}
