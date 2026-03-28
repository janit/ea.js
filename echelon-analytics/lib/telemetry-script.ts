// Echelon Analytics — Client-Anonymized Telemetry Script
//
// Self-contained inline script for admin self-tracking. Anonymizes everything
// client-side so admins can inspect exactly what leaves their browser:
//
// SENT: anonymized page name, bucketed screen width, random session ID,
//       PoW token, scroll depth %, web vital metrics, bounce/session timing.
//
// NOT SENT: cookies, referrer, UTM params, real URLs, query strings,
//           click/hover/outbound/download/form events, visitor IDs.
//
// CANNOT be anonymized client-side (noted for transparency):
//   - IP address (inherent to HTTP)
//   - User-Agent header (browser-controlled, forbidden to override)
//   These are handled by backend ANONYMIZE_SITES on the telemetry server.

import { TELEMETRY_ENDPOINT, TELEMETRY_SITE_ID } from "./config.ts";

export function getTelemetryScript(): string {
  return `(function(){
"use strict";

// ── Guard + constants ────────────────────────────────────────────────────────
if(window.__eat)return;
window.__eat=1;
var EP="${TELEMETRY_ENDPOINT}";
var SITE="${TELEMETRY_SITE_ID}";

// ── Session ID (tab-scoped, sessionStorage, random) ──────────────────────────
var sid;
try{
sid=sessionStorage.getItem("_eat_sid");
if(!sid){sid=crypto.randomUUID();sessionStorage.setItem("_eat_sid",sid)}
}catch(x){sid=Math.random().toString(36).slice(2)}

// ── Path anonymization (whitelist only) ──────────────────────────────────────
// Only known admin page names pass through. Dynamic IDs are stripped.
var known={dashboard:1,realtime:1,visitors:1,events:1,bots:1,excluded:1,
experiments:1,campaigns:1,perf:1,settings:1,login:1,logout:1};
function anonPath(){
var parts=location.pathname.replace(/^\\/admin\\/?/,"").split("/")
.filter(function(p){return known[p]});
return"/"+(parts.join("/")||"dashboard");
}

// ── Screen bucketing (prevents fingerprinting) ───────────────────────────────
var buckets=[360,768,1024,1280,1440,1920];
function bucket(v){
var best=buckets[0];
for(var i=1;i<buckets.length;i++){
if(Math.abs(buckets[i]-v)<Math.abs(best-v))best=buckets[i];
}
return best;
}

// ── PoW resolution (fetch challenge from telemetry server) ───────────────────
var tok="";
var tokReady=null;
try{
var cached=sessionStorage.getItem("_eat_tok");
if(cached){
var cp=cached.split(":");
if(cp[1]&&/^[0-9a-f]{32}$/.test(cp[1])&&Math.random()>0.1){
tok=cp[1];
}
}
}catch(x){}

if(!tok){
tokReady=fetch(EP+"/ea.js?s="+SITE).then(function(r){return r.text()}).then(function(js){
var cm=js.match(/_c="([0-9a-f]+)"/);
var wm=js.match(/_w="([A-Za-z0-9+\\/=]+)"/);
if(!cm||!wm)return;
var challenge=cm[1],wasmB64=wm[1];
var bin=atob(wasmB64);
var bytes=new Uint8Array(bin.length);
for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
return WebAssembly.instantiate(bytes).then(function(r){
var mem=new Uint8Array(r.instance.exports.memory.buffer);
var inp=challenge+":"+sid+":"+SITE;
var enc=new TextEncoder().encode(inp);
mem.set(enc,0);
r.instance.exports.solve(0,enc.length,2048);
var out=mem.slice(2048,2064);
tok="";
for(var i=0;i<16;i++)tok+=(out[i]<16?"0":"")+out[i].toString(16);
try{sessionStorage.setItem("_eat_tok",challenge+":"+tok)}catch(x){}
});
}).catch(function(){});
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sendEvents(events){
if(!events.length)return;
try{
var j=JSON.stringify({events:events,siteId:SITE,tok:tok});
if(navigator.sendBeacon){
navigator.sendBeacon(EP+"/e",new Blob([j],{type:"application/json"}));
}else{
var xhr=new XMLHttpRequest();
xhr.open("POST",EP+"/e",true);
xhr.setRequestHeader("Content-Type","application/json");
xhr.send(j);
}
}catch(x){}
}

// ── 1. Pageview beacon (anonymized, interaction-gated) ───────────────────────
var t0=Date.now(),fired=0;
var p=anonPath();
var sw=bucket(screen.width);
var sh=bucket(screen.height);

function sendBeaconImg(){
// No cookies (ck), no referrer (ref), no UTM, no real URL
var url=EP+"/b.gif?s="+SITE+"&p="+btoa(p)+"&sid="+sid+"&sw="+sw+"&sh="+sh+
"&_v="+(Date.now()-t0)+(tok?"&tok="+tok:"");
new Image().src=url;
}

function fireBeacon(){
if(fired)return;
fired=1;
if(!tok&&tokReady){
Promise.race([tokReady,new Promise(function(r){setTimeout(r,150)})]).then(sendBeaconImg);
}else{
sendBeaconImg();
}
}

var interactionEvents=["pointerdown","scroll","click","keydown"];
function onInteraction(a){
if(!a.isTrusted)return;
var d=Date.now()-t0;
d<800?setTimeout(fireBeacon,800-d):fireBeacon();
}
function onVisChange(){
if(document.hidden&&Date.now()-t0>=4000)fireBeacon();
}
interactionEvents.forEach(function(n){addEventListener(n,onInteraction,{passive:true})});
document.addEventListener("visibilitychange",onVisChange);

// ── 2. Bounce detection (120s timeout or tab hide) ───────────────────────────
var bounced=0;
function cancelBounce(){
if(bounced)return;
bounced=1;
interactionEvents.forEach(function(n){removeEventListener(n,onBounceInt)});
clearTimeout(bounceTimer);
document.removeEventListener("visibilitychange",onBounceVis);
}
function sendBounce(trigger){
if(bounced)return;
cancelBounce();
sendEvents([{type:"bounce",data:{dwell:Math.round((Date.now()-t0)/1000),trigger:trigger||"timeout",path:p},sessionId:sid}]);
}
function onBounceInt(a){if(a.isTrusted)cancelBounce()}
var bounceTimer=setTimeout(function(){sendBounce("timeout")},120000);
function onBounceVis(){if(document.visibilityState==="hidden")sendBounce("unload")}
interactionEvents.forEach(function(n){addEventListener(n,onBounceInt,{passive:true})});
document.addEventListener("visibilitychange",onBounceVis);

// ── 3. Session end / resume ──────────────────────────────────────────────────
var sessionEnded=0,lastEndTime=0;
function sendSessionEnd(){
if(sessionEnded)return;
sessionEnded=1;
lastEndTime=Date.now();
sendEvents([{type:"session_end",data:{dwell_s:Math.round((lastEndTime-t0)/1000),path:p},sessionId:sid}]);
}
document.addEventListener("visibilitychange",function(){
if(document.visibilityState==="hidden"){
sendSessionEnd();
}else if(sessionEnded){
sessionEnded=0;
sendEvents([{type:"session_resume",data:{away_s:Math.round((Date.now()-lastEndTime)/1000),path:p},sessionId:sid}]);
}
});
addEventListener("pagehide",sendSessionEnd);
addEventListener("pageshow",function(e){
if(e.persisted&&sessionEnded){
sessionEnded=0;
sendEvents([{type:"session_resume",data:{away_s:Math.round((Date.now()-lastEndTime)/1000),path:p,bfcache:true},sessionId:sid}]);
}
});

// ── 4. Scroll depth (milestones at 25/50/75/90/100%) ─────────────────────────
var maxScroll=0,milestones=[25,50,75,90,100],reached={};
function checkScroll(){
var h=document.documentElement.scrollHeight-window.innerHeight;
if(h<=0)return;
var pct=Math.round(window.scrollY/h*100);
if(pct<=maxScroll)return;
maxScroll=pct;
for(var i=0;i<milestones.length;i++){
var m=milestones[i];
if(pct>=m&&!reached[m]){
reached[m]=1;
sendEvents([{type:"scroll_depth",data:{depth:m,path:p},sessionId:sid}]);
}
}
}
var scrollTicking=0;
addEventListener("scroll",function(){
if(scrollTicking)return;
scrollTicking=1;
requestAnimationFrame(function(){checkScroll();scrollTicking=0});
},{passive:true});

// ── 5. Web vitals (LCP, CLS, INP) ───────────────────────────────────────────
if(typeof PerformanceObserver!=="undefined"){
var vitalsSent={};
function sendVital(name,value,rating){
if(vitalsSent[name])return;
vitalsSent[name]=1;
sendEvents([{type:"web_vital",data:{metric:name,value:Math.round(name==="CLS"?value*1000:value),rating:rating,path:p},sessionId:sid}]);
}
function rateMetric(name,val){
if(name==="LCP")return val<=2500?"good":val<=4000?"needs-improvement":"poor";
if(name==="CLS")return val<=0.1?"good":val<=0.25?"needs-improvement":"poor";
if(name==="INP")return val<=200?"good":val<=500?"needs-improvement":"poor";
return"unknown";
}

// LCP
try{
var lcpVal=0;
var lcpObs=new PerformanceObserver(function(list){
var entries=list.getEntries();
if(entries.length)lcpVal=entries[entries.length-1].startTime;
});
lcpObs.observe({type:"largest-contentful-paint",buffered:true});
var reportLCP=function(){
if(lcpVal>0){lcpObs.disconnect();sendVital("LCP",lcpVal,rateMetric("LCP",lcpVal))}
};
addEventListener("pointerdown",reportLCP,{once:true,passive:true});
addEventListener("keydown",reportLCP,{once:true,passive:true});
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")reportLCP()});
}catch(x){}

// CLS
try{
var clsVal=0,clsSession=0,clsMax=0,clsLast=0;
new PerformanceObserver(function(list){
for(var i=0;i<list.getEntries().length;i++){
var e=list.getEntries()[i];
if(e.hadRecentInput)continue;
if(e.startTime-clsLast<1000&&e.startTime-clsSession<5000){clsVal+=e.value}
else{clsSession=e.startTime;clsVal=e.value}
clsLast=e.startTime;
if(clsVal>clsMax)clsMax=clsVal;
}
}).observe({type:"layout-shift",buffered:true});
document.addEventListener("visibilitychange",function(){
if(document.visibilityState==="hidden"&&clsMax>0)sendVital("CLS",clsMax,rateMetric("CLS",clsMax));
});
}catch(x){}

// INP
try{
var inpVal=0;
new PerformanceObserver(function(list){
for(var i=0;i<list.getEntries().length;i++){
var e=list.getEntries()[i];
if(e.duration>inpVal)inpVal=e.duration;
}
}).observe({type:"event",buffered:true,durationThreshold:16});
document.addEventListener("visibilitychange",function(){
if(document.visibilityState==="hidden"&&inpVal>0)sendVital("INP",inpVal,rateMetric("INP",inpVal));
});
}catch(x){}
}

})();`;
}
