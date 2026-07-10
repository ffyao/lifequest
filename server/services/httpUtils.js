export async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('请求体不是合法 JSON');
    error.statusCode = 400;
    error.code = 'INVALID_JSON';
    throw error;
  }
}

export function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-User-Id'
  });
  response.end(JSON.stringify(payload));
}

export function requireNumber(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    const error = new Error(`${name} 必须是正整数`);
    error.statusCode = 400;
    error.code = 'INVALID_ID';
    throw error;
  }
  return number;
}

export function getUserId(request) {
  const userId = Number(request.headers['x-user-id'] || 1);
  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error('缺少有效用户身份');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  return userId;
}
