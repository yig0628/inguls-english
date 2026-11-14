import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const password = process.env.APP_ACCESS_PASSWORD;
const secret = process.env.APP_SESSION_SECRET;
if (!password || password.length < 12 || !secret || secret.length < 32) {
  throw Error("Set APP_ACCESS_PASSWORD (12+ characters) and APP_SESSION_SECRET (32+ characters).");
}

const root = resolve("dist");
const secure = process.env.RENDER === "true" || process.env.APP_SECURE_COOKIES === "true";
const cookie = "ingul_session";
const maxAge = 30 * 86400;
const mime = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".webmanifest":"application/manifest+json", ".svg":"image/svg+xml", ".png":"image/png", ".webp":"image/webp",
};
const coverPath = "/share-cover.png";
const publicAssets = new Set(["/manifest.webmanifest","/icon-192.png","/icon-512.png","/favicon.svg",coverPath]);
const origin = process.env.RENDER_EXTERNAL_URL ? new URL(process.env.RENDER_EXTERNAL_URL).origin : "";
const shareMetadata = `
<meta property="og:type" content="website">
<meta property="og:title" content="INGUL'S English">
<meta property="og:description" content="뉴질랜드 비즈니스 영어 · 하루 10문장과 실전 역할극">
<meta property="og:image" content="${origin + coverPath}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1734">
<meta property="og:image:height" content="907">
<meta property="og:image:alt" content="버건디 배경의 INGUL’S English 앱 커버">
${origin ? `<meta property="og:url" content="${origin}/">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="INGUL'S English">
<meta name="twitter:description" content="뉴질랜드 비즈니스 영어 · 하루 10문장과 실전 역할극">
<meta name="twitter:image" content="${origin + coverPath}">
`;
const appHtml = (await readFile(resolve(root, "index.html"), "utf8")).replace(/<!--\s*share-metadata\s*-->/, shareMetadata);
const failed = new Map();
const digest = value => createHash("sha256").update(value).digest();
const signature = value => createHmac("sha256",secret).update(value).digest("base64url");
const cookieValue = (value, age) => `${cookie}=${value}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;

function signedIn(req) {
  const token = req.headers.cookie?.split("; ").find(x=>x.startsWith(cookie+"="))?.slice(cookie.length+1) ?? "";
  const [expires, hash] = token.split(".");
  return /^\d{13}$/.test(expires) && Number(expires)>Date.now() && Number(expires)<=Date.now()+maxAge*1000 &&
    Boolean(hash) && timingSafeEqual(digest(hash),digest(signature(expires)));
}
function reply(res,status,type,body) {
  res.writeHead(status,{"Content-Type":type});
  res.end(body);
}
function loginPage(res,status=200,message="") {
  reply(res,status,"text/html; charset=utf-8",`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/favicon.svg">
<meta name="theme-color" content="#0a4433"><title>INGUL'S English</title>
${shareMetadata}
<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#edf5f0;color:#19362e;font:16px system-ui}
main{width:min(420px,90vw);padding:2rem;border:1px solid #ddeae1;background:white;border-radius:18px}
img{width:44px;height:44px;border-radius:10px}h1{font-size:25px}p{line-height:1.55}label{display:block;font-weight:600;font-size:14px}
input,button{font:inherit;width:100%;padding:12px;margin-top:8px;border-radius:9px;border:1px solid #bdcfc6}
button{background:#167d58;border-color:#167d58;color:#fff;font-weight:700;cursor:pointer}.warning{color:#a23a21}</style></head><body>
<main><img src="/icon-192.png" alt=""><h1>INGUL’S English</h1><p>비즈니스 영어 연습을 시작하려면 앱 비밀번호를 입력하세요.</p>
<form method="post" action="/login"><label>앱 비밀번호<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label>
<button>앱 열기</button></form>${message ? '<p class="warning" role="alert">'+message+'</p>' : ''}</main></body></html>`);
}
async function login(req,res) {
  if (req.headers["sec-fetch-site"]==="cross-site") return reply(res,403,"text/plain","Forbidden");
  const key = req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  for (const [ip,entry] of failed) if(entry.until<=now)failed.delete(ip);
  const entry = failed.get(key) ?? { count:0, until:now+15*60_000 };
  if (entry.count>=20) {
    res.setHeader("Retry-After",String(Math.ceil((entry.until-now)/1000)));
    return loginPage(res,429,"잠시 후 다시 시도해 주세요.");
  }
  let body = "";
  for await (const chunk of req) {
    body+=chunk.toString();
    if(body.length>4096)return reply(res,413,"text/plain","Request too large");
  }
  const entered = new URLSearchParams(body).get("password") ?? "";
  if (!timingSafeEqual(digest(entered),digest(password))) {
    entry.count++;
    failed.set(key,entry);
    return loginPage(res,401,"비밀번호를 다시 확인해 주세요.");
  }
  failed.delete(key);
  const expires = String(now + maxAge*1000);
  res.writeHead(303,{"Location":"/","Set-Cookie":cookieValue(expires+"."+signature(expires),maxAge)});
  res.end();
}
createServer(async (req,res)=>{
  res.setHeader("Cache-Control","private, no-store");
  res.setHeader("Permissions-Policy","microphone=(self), camera=()");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  try {
    const path = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(path==="/healthz")return reply(res,200,"text/plain","ok");
    if(path==="/login" && req.method==="POST")return await login(req,res);
    if(!["GET","HEAD"].includes(req.method))return reply(res,405,"text/plain","Method not allowed");
    if(!publicAssets.has(path) && !signedIn(req))return path==="/"?loginPage(res):reply(res,401,"text/plain","Sign in required");
    if(path==="/" || path==="/index.html")return reply(res,200,"text/html; charset=utf-8",req.method==="HEAD" ? "" : appHtml);
    const file = resolve(root, "."+(path==="/"?"/index.html":path));
    if(!file.startsWith(root+sep))return reply(res,404,"text/plain","Not found");
    const item = await stat(file).catch(()=>null);
    if(!item?.isFile())return reply(res,404,"text/plain","Not found");
    if(path===coverPath)res.setHeader("Cache-Control","public, max-age=3600");
    res.writeHead(200,{"Content-Type":mime[extname(file)]??"application/octet-stream","Content-Length":item.size});
    if(req.method==="HEAD")return res.end();
    const stream=createReadStream(file);
    stream.on("error",()=>res.destroy());
    stream.pipe(res);
  } catch {
    if(!res.headersSent)reply(res,400,"text/plain","Bad request");
    else res.destroy();
  }
}).listen(Number(process.env.PORT??4174),"0.0.0.0");
