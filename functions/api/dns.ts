interface Env {
  CF_TOKEN: string,
  CF_ZONE_ID: string,
  VERIFY_TOKEN: string
}

enum DNS_TYPE {
  A = "A",
  AAAA = "AAAA",
  CNAME = "CNAME"
}

enum HTTP_METHOD {
  GET = "GET",
  PUT = "PUT"
}

const validateIsIPv4Address = (ip: string) => {
  return /^(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]{1,2})(\.(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}$/.test(ip);
}

const validateIsIpv6Address = (ip: string) => {
  return /^([0-9a-f]|:){1,4}(:([0-9a-f]{0,4})*){1,7}$/i.test(ip);
}

const validateIsDomain = (domain: string) => {
  return /^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/.test(domain);
}

const validateIsString = (str: string) => typeof str === "string";

const validator = {
  [DNS_TYPE.A]: validateIsIPv4Address,
  [DNS_TYPE.AAAA]: validateIsIpv6Address,
  [DNS_TYPE.CNAME]: validateIsString
}

const ALLOW_SEND_BODY_METHOD = [HTTP_METHOD.PUT];

const generateRequest = (env: Env) => {
  const baseUrl = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records`;
  const request = async <T>(method: HTTP_METHOD, path: string = "", query: Record<string, string> | null = null, body: Record<string, any> | null = null) => {
    const reqHeaders = {
      "Authorization": `Bearer ${env.CF_TOKEN}`,
      "Content-Type": "application/json"
    };

    let fullUrl = baseUrl + path;

    if (query) {
      fullUrl += "?" + new URLSearchParams(query);
    }

    const fetchOptions: RequestInit<RequestInitCfProperties> = {
      method: method,
      headers: reqHeaders
    };

    if (ALLOW_SEND_BODY_METHOD.includes(method) && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const result = await fetch(fullUrl, fetchOptions);
    return await result.json() as T;
  }

  return request;
}

const createResponse = (statusCode: number, body: string | Record<string, any> | null = null) => {
  if (body && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  return new Response(body, {
    status: statusCode
  });
}

interface QueryResult {
  id: string,
  name: string,
  content: string,
  type: DNS_TYPE
}

interface QueryDomainResult {
  success: boolean,
  result: QueryResult[]
}

interface UpdateDomainDnsResult {
  success: boolean
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {

  const { searchParams } = new URL(request.url);

  // 鉴权 TOKEN
  const VERIFY_TOKEN = request.headers.get("X-Verify-Token");
  if (VERIFY_TOKEN !== env.VERIFY_TOKEN) return createResponse(401);

  let domain = searchParams.get("domain")?.trim();
  let content = searchParams.get("content")?.trim();
  let dnsType = searchParams.get("type")?.trim().toUpperCase();

  // 没有传递域名信息就拜拜~
  if (!domain || !validateIsDomain(domain)) return createResponse(400);

  type DNS_TYPE_KEY = keyof typeof DNS_TYPE;


  // 没有传递 DNS 类型就拜拜~
  if (!dnsType || (dnsType && !DNS_TYPE[dnsType as DNS_TYPE_KEY])) return createResponse(400);

  // 没有传递 DNS 信息就拜拜~
  if (!content || !validator[dnsType as DNS_TYPE_KEY]) return createResponse(400);


  const _fetch = generateRequest(env);

  // 域名信息查询结果
  const queryDomainResult = await _fetch<QueryDomainResult>(HTTP_METHOD.GET, "", {
    name: domain,
    type: dnsType
  });

  // 查不到信息则拜拜
  if (!queryDomainResult.success) return createResponse(400);
  if (queryDomainResult.result.length < 1) return createResponse(404);

  const { id: dnsRecordId, name: originDomain, content: originContent, type: originDnsType } = queryDomainResult.result[0];

  // 查不到域名直接拜拜
  if (domain !== originDomain) return createResponse(404);
  if (dnsType !== originDnsType) return createResponse(400);
  // 无需更新则直接拜拜
  if (content === originContent) return createResponse(204);

  const reqBody = {
    type: dnsType,
    name: domain,
    content,
    proxied: false
  }

  const updateResult = await _fetch<UpdateDomainDnsResult>(HTTP_METHOD.PUT, `/${dnsRecordId}`, null, reqBody);

  return createResponse(updateResult.success ? 204 : 400);
}
