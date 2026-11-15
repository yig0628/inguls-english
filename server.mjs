import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { handlePush } from "./push.mjs";

const root = resolve("dist");
const mime = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".webmanifest":"application/manifest+json", ".svg":"image/svg+xml", ".png":"image/png", ".webp":"image/webp",
};
const coverPath = "/share-cover.png";
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
function reply(res,status,type,body) {
  res.writeHead(status,{"Content-Type":type});
  res.end(body);
}
createServer(async (req,res)=>{
  res.setHeader("Cache-Control","private, no-store");
  res.setHeader("Permissions-Policy","microphone=(self), camera=()");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  try {
    const path = decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(path==="/healthz")return reply(res,200,"text/plain","ok");
    if(path.startsWith("/api/push/"))return await handlePush(req,path,(status,body)=>reply(res,status,"application/json; charset=utf-8",JSON.stringify(body)));
    if(!["GET","HEAD"].includes(req.method))return reply(res,405,"text/plain","Method not allowed");
    if(path==="/" || path==="/index.html")return reply(res,200,"text/html; charset=utf-8",req.method==="HEAD" ? "" : appHtml);
    const file = resolve(root, "."+path);
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
