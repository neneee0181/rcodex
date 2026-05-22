export function getHTML(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>rcodex Gateway</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.css"/>
<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5/lib/xterm.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10/lib/addon-fit.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d0d12;--s1:#15151f;--s2:#1c1c28;--s3:#21212e;
  --b1:#252535;--b2:#383850;--b3:#5a5a80;
  --tx:#e0e0f0;--mu:#606080;--di:#9090b0;
  --gr:#22c55e;--bl:#6366f1;--bl2:#818cf8;
  --rd:#ef4444;--yw:#f59e0b;
}
html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--tx);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  text-rendering:geometricPrecision;-webkit-text-size-adjust:100%}

/* Header */
.hdr{height:46px;display:flex;align-items:center;justify-content:space-between;
  padding:0 14px 0 10px;background:rgba(13,13,18,.98);border-bottom:1px solid var(--b1);
  position:relative;z-index:100;flex-shrink:0;gap:8px}
.hdr-l{display:flex;align-items:center;gap:8px}
.icon-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--b1);
  background:transparent;color:var(--di);cursor:pointer;display:flex;
  align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
.icon-btn:hover{background:var(--s2);color:var(--tx);border-color:var(--b2)}
.icon-btn.on{background:var(--s2);color:var(--bl2);border-color:var(--b2)}
.logo{display:flex;align-items:center;gap:7px}
.logo-ic{width:24px;height:24px;border-radius:6px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;font-size:11px}
.logo-txt{font-size:13px;font-weight:600}
.logo-sep{color:var(--b2)}
.logo-port{font-size:11px;color:var(--mu)}
.pill{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--gr)}
.dot{width:5px;height:5px;border-radius:50%;background:var(--gr);
  box-shadow:0 0 5px var(--gr);animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}

/* Layout */
.layout{display:flex;flex:1;overflow:hidden;position:relative}

/* Sidebar shell */
.sb{position:absolute;left:0;top:0;bottom:0;width:280px;
  background:var(--s1);border-right:1px solid var(--b1);
  display:flex;flex-direction:column;z-index:60;
  transform:translateX(-100%);transition:transform .22s cubic-bezier(.4,0,.2,1);
  box-shadow:4px 0 32px rgba(0,0,0,.5)}
.sb.open{transform:translateX(0)}
.sb-hdr{display:flex;align-items:center;padding:12px 14px 10px;border-bottom:1px solid var(--b1);gap:8px;flex-shrink:0}
.sb-back{width:26px;height:26px;border-radius:6px;border:none;background:transparent;
  color:var(--mu);cursor:pointer;font-size:16px;display:flex;align-items:center;
  justify-content:center;transition:all .15s}
.sb-back:hover{background:var(--s2);color:var(--tx)}
.sb-title{font-size:13px;font-weight:600;flex:1}
.sb-x{width:26px;height:26px;border-radius:6px;border:none;background:transparent;
  color:var(--mu);cursor:pointer;font-size:18px;display:flex;align-items:center;
  justify-content:center;transition:all .15s;line-height:1}
.sb-x:hover{background:var(--s2);color:var(--tx)}
.sb-body{flex:1;overflow-y:auto}

/* Scrollbars */
.sb-body::-webkit-scrollbar,.mn-body::-webkit-scrollbar{width:5px}
.sb-body::-webkit-scrollbar-track,.mn-body::-webkit-scrollbar-track{background:transparent}
.sb-body::-webkit-scrollbar-thumb,.mn-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}
.sb-body::-webkit-scrollbar-thumb:hover,.mn-body::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.28)}

/* Home nav items */
.nav-item{display:flex;align-items:center;gap:11px;padding:11px 16px;
  cursor:pointer;transition:background .12s;user-select:none}
.nav-item:hover{background:var(--s2)}
.nav-ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;font-size:15px;flex-shrink:0}
.prov-icon{width:var(--isz);height:var(--isz);display:inline-flex;align-items:center;
  justify-content:center;color:currentColor;line-height:0;flex-shrink:0}
.prov-icon img{width:100%;height:100%;display:block;object-fit:cover;border-radius:5px;
  box-shadow:0 0 0 1px rgba(255,255,255,.08)}
.prov-icon svg{width:100%;height:100%;display:block}
.ptype-ic .prov-icon img{border-radius:6px}
.acc-ic .prov-icon img,.nic .prov-icon img{border-radius:4px}
.nav-info{flex:1}
.nav-name{font-size:13px;font-weight:500}
.nav-sub{font-size:10px;color:var(--mu);margin-top:1px}
.nav-arr{color:var(--mu);font-size:14px}
.nav-badge{font-size:9px;padding:2px 7px;border-radius:10px;
  background:rgba(99,102,241,.15);color:var(--bl2);border:1px solid rgba(99,102,241,.2)}
.sb-sep{height:1px;background:var(--b1);margin:4px 0}

/* Provider type list */
.ptype{display:flex;align-items:center;gap:10px;padding:10px 14px;
  cursor:pointer;transition:background .12s;border-radius:0}
.ptype:hover{background:var(--s2)}
.ptype-ic{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;font-size:16px;flex-shrink:0}
.ptype-info{flex:1;min-width:0}
.ptype-name{font-size:12px;font-weight:600}
.ptype-sub{font-size:10px;color:var(--mu);margin-top:1px}
.add-btn{padding:5px 12px;border-radius:7px;border:1px solid rgba(99,102,241,.3);
  background:rgba(99,102,241,.1);color:var(--bl2);font-size:10px;font-weight:600;
  cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0}
.add-btn:hover{background:rgba(99,102,241,.22);border-color:var(--bl)}

/* Wide sidebar for providers screen */
.sb.wide{width:560px}
/* Provider grid — entry tier (3 cols) */
.pg-entry{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:6px 12px 10px}
.pc-e{border:1px solid var(--b1);border-radius:9px;padding:9px 10px;cursor:pointer;
  transition:all .15s;background:var(--s2);display:flex;flex-direction:column;gap:5px}
.pc-e:hover{border-color:var(--bl);background:rgba(99,102,241,.06)}
.pc-e-hd{display:flex;align-items:center;gap:7px}
.pc-e-ic{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;
  justify-content:center;flex-shrink:0}
.pc-e-nm{font-size:11px;font-weight:600;flex:1;min-width:0;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.pc-e-ft{display:flex;align-items:center;justify-content:space-between}
.pc-e-sb{font-size:9px;color:var(--mu)}
.pc-e-add{padding:3px 9px;border-radius:5px;border:1px solid rgba(99,102,241,.3);
  background:rgba(99,102,241,.1);color:var(--bl2);font-size:9px;font-weight:600;
  cursor:pointer;transition:all .15s;white-space:nowrap}
.pc-e-add:hover{background:rgba(99,102,241,.22)}
/* Provider grid — compact (free tier, auto-fill) */
.pg-sm{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));
  gap:5px;padding:6px 12px 10px}
.pc-sm{border:1px solid var(--b1);border-radius:7px;padding:7px 8px;cursor:pointer;
  transition:all .15s;background:var(--s2);display:flex;align-items:center;gap:6px}
.pc-sm:hover{border-color:var(--bl);background:rgba(99,102,241,.06)}
.pc-sm-ic{width:20px;height:20px;border-radius:5px;display:flex;align-items:center;
  justify-content:center;font-size:10px;flex-shrink:0}
.pc-sm-nm{font-size:10px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Connected accounts grid */
.acc-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px 12px 10px}
.acc-card{border:1px solid var(--b1);border-radius:9px;padding:9px 10px;
  background:var(--s2);display:flex;flex-direction:column;gap:6px}
.acc-card-hd{display:flex;align-items:center;gap:8px}
.acc-card-info{flex:1;min-width:0}
.acc-card-nm{font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acc-card-sb{font-size:9px;color:var(--mu);margin-top:1px}
.acc-card-ft{display:flex;gap:5px;align-items:center}

/* Connected accounts */
.sb-section{font-size:9px;font-weight:700;text-transform:uppercase;
  letter-spacing:.1em;color:var(--mu);padding:12px 16px 6px}
.acc-item{display:flex;align-items:center;gap:10px;padding:9px 14px;
  transition:background .12s}
.acc-item:hover{background:var(--s2)}
.acc-ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;
  justify-content:center;font-size:14px;flex-shrink:0}
.acc-info{flex:1;min-width:0}
.acc-name{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acc-sub{font-size:10px;color:var(--mu);margin-top:1px}
.acc-actions{display:flex;gap:4px;flex-shrink:0}
.canvas-btn{padding:4px 9px;border-radius:6px;border:1px solid rgba(34,197,94,.25);
  background:rgba(34,197,94,.07);color:var(--gr);font-size:9px;font-weight:600;
  cursor:pointer;transition:all .15s;white-space:nowrap}
.canvas-btn:hover{background:rgba(34,197,94,.15)}
.canvas-btn.on-canvas{border-color:rgba(99,102,241,.3);background:rgba(99,102,241,.1);color:var(--bl2)}
.canvas-btn.on-canvas:hover{border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.08);color:var(--rd)}
.del-btn{width:22px;height:22px;border-radius:5px;border:none;background:transparent;
  color:var(--mu);cursor:pointer;font-size:13px;display:flex;align-items:center;
  justify-content:center;transition:all .12s}
.del-btn:hover{background:rgba(239,68,68,.1);color:var(--rd)}

/* Auth method cards */
.auth-cards{display:flex;flex-direction:column;gap:8px;padding:12px 14px}
.auth-card{border:1px solid var(--b1);border-radius:11px;padding:12px 14px;
  cursor:pointer;transition:all .15s;background:var(--s2)}
.auth-card:hover{border-color:var(--bl);background:rgba(99,102,241,.06)}
.auth-card-hdr{display:flex;align-items:center;gap:9px;margin-bottom:4px}
.auth-card-ic{font-size:16px}
.auth-card-name{font-size:12px;font-weight:600}
.auth-card-sub{font-size:10px;color:var(--mu);line-height:1.5}
.auth-warn{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);
  border-radius:8px;padding:8px 11px;font-size:10px;color:#fcd34d;
  margin:0 14px 10px;line-height:1.5}

/* Auth form */
.auth-form{padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.form-label{font-size:10px;color:var(--mu)}
.form-input{width:100%;padding:8px 11px;border-radius:8px;background:var(--bg);
  border:1px solid var(--b1);color:var(--tx);font-size:12px;outline:none;
  font-family:'SF Mono',monospace;transition:border-color .15s}
.form-input:focus{border-color:var(--b2)}
.form-input::placeholder{color:var(--mu)}
.form-actions{display:flex;gap:7px;margin-top:2px}
.form-cancel{flex:1;padding:8px;border-radius:8px;border:1px solid var(--b1);
  background:transparent;color:var(--mu);font-size:11px;cursor:pointer}
.form-submit{flex:2;padding:8px;border-radius:8px;border:none;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  color:#fff;font-size:11px;font-weight:600;cursor:pointer}
.form-submit:hover{opacity:.9}

/* ChatGPT panel */
.cgpt-panel{position:relative;flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.cgpt-bar{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--b1);background:var(--s1);flex-shrink:0}
.cgpt-frame{flex:1;border:none;width:100%;height:100%;background:#fff}
.cgpt-blocked{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);z-index:10}

/* Canvas */
.ws{position:relative;flex:1;overflow:hidden;cursor:default;user-select:none;
  background-color:var(--bg);
  background-image:radial-gradient(circle,var(--b1) 1px,transparent 1px);
  background-size:28px 28px;
  image-rendering:crisp-edges;
  image-rendering:pixelated}
#world{position:absolute;top:0;left:0}
#svgl{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.cp{fill:none;stroke-width:2.5;opacity:.75}
.ct{fill:none;stroke:var(--bl2);stroke-width:2;stroke-dasharray:7 4;opacity:.9;
  animation:sdash .5s linear infinite}
@keyframes sdash{to{stroke-dashoffset:-22}}

/* Canvas nodes */
.nd{position:absolute;width:260px;background:var(--s1);border:1px solid var(--b1);
  border-radius:13px;box-shadow:0 6px 24px rgba(0,0,0,.5);
  transition:border-color .2s,box-shadow .2s}
.nd:hover{border-color:var(--b2)}
.nd.live{border-color:rgba(34,197,94,.4);box-shadow:0 0 0 1px rgba(34,197,94,.08),0 6px 24px rgba(0,0,0,.5)}
.nd.sel{border-color:var(--bl);box-shadow:0 0 0 2px rgba(99,102,241,.18),0 6px 24px rgba(0,0,0,.5)}
.nh{display:flex;align-items:center;gap:8px;padding:9px 8px 9px 12px;
  border-bottom:1px solid var(--b1);border-radius:13px 13px 0 0;cursor:grab;min-height:42px}
.nh:active{cursor:grabbing}
.nic{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;
  justify-content:center;font-size:13px;flex-shrink:0}
.nn{font-size:11px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acct-badge{font-size:9px;font-weight:800;color:var(--bl2);background:rgba(99,102,241,.16);
  border:1px solid rgba(99,102,241,.28);border-radius:5px;padding:1px 5px;line-height:1.4;flex-shrink:0}
.bk{font-size:9px;padding:2px 6px;border-radius:5px;font-weight:600;white-space:nowrap;flex-shrink:0}
.bk-on{background:rgba(34,197,94,.12);color:var(--gr);border:1px solid rgba(34,197,94,.2)}
.bk-off{background:rgba(96,96,128,.1);color:var(--mu);border:1px solid var(--b1)}
.nd-rm{width:20px;height:20px;border-radius:5px;border:none;background:transparent;
  color:var(--mu);cursor:pointer;font-size:14px;display:flex;align-items:center;
  justify-content:center;transition:all .12s;flex-shrink:0}
.nd-rm:hover{background:rgba(239,68,68,.1);color:var(--rd)}
.nb{padding:9px 12px;display:flex;flex-direction:column;gap:5px}
.msel{width:100%;padding:5px 8px;background:var(--bg);border:1px solid var(--b1);
  border-radius:7px;color:var(--tx);font-size:11px;cursor:pointer;outline:none}
.msel:focus{border-color:var(--b2)}
.msel option{background:var(--s1)}
.nd-hint{font-size:10px;color:var(--mu);text-align:center;padding:3px 0}
.nd-acct{font-size:9px;color:var(--mu);padding:4px 10px 6px;text-align:center;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.65;
  letter-spacing:.01em}

/* Ports */
.po{position:absolute;right:-11px;top:50%;transform:translateY(-50%);
  width:22px;height:22px;border-radius:50%;background:var(--s1);
  border:2px solid var(--b2);cursor:crosshair;z-index:15;
  display:flex;align-items:center;justify-content:center;transition:all .15s;pointer-events:all}
.po::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--b2);transition:background .15s}
.po:hover{border-color:var(--bl);transform:translateY(-50%) scale(1.2)}
.po:hover::after{background:var(--bl)}
.po.live{border-color:var(--gr)}.po.live::after{background:var(--gr)}
.po.dragging{border-color:var(--bl);background:rgba(99,102,241,.15)}.po.dragging::after{background:var(--bl)}
.pi{position:absolute;left:-11px;top:50%;transform:translateY(-50%);
  width:22px;height:22px;border-radius:50%;background:var(--s1);
  border:2px solid var(--b2);z-index:15;
  display:flex;align-items:center;justify-content:center;transition:all .15s;pointer-events:all}
.pi::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--b2);transition:background .15s}
.pi.live{border-color:var(--gr)}.pi.live::after{background:var(--gr)}
.pi.acc{border-color:var(--bl);box-shadow:0 0 0 4px rgba(99,102,241,.2)}.pi.acc::after{background:var(--bl)}

/* OUT node */
.out-node{width:240px}
.out-ic{width:26px;height:26px;border-radius:7px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);
  display:flex;align-items:center;justify-content:center;font-size:11px}
.oi{display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--b1)}
.oi:last-child{border-bottom:none}
.oi-num{font-size:9px;font-weight:700;color:var(--mu);min-width:12px;text-align:center;flex-shrink:0}
.oi-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.oi-inf{flex:1;min-width:0}
.oi-pr{font-size:9px;color:var(--mu)}
.oi-mo{font-size:10px;color:var(--di);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.oi-ord{display:flex;flex-direction:column;gap:1px;flex-shrink:0}
.oi-arr{width:16px;height:14px;border-radius:3px;border:none;background:transparent;
  color:var(--mu);cursor:pointer;font-size:10px;line-height:1;padding:0;
  display:flex;align-items:center;justify-content:center;transition:all .1s}
.oi-arr:hover{background:var(--s3);color:var(--tx)}
.oi-arr:disabled{opacity:.2;cursor:default}
.oi-x{background:none;border:none;color:var(--mu);cursor:pointer;font-size:15px;
  line-height:1;padding:0;flex-shrink:0}
.oi-x:hover{color:var(--rd)}
.out-empty{font-size:10px;color:var(--mu);text-align:center;padding:12px 0;line-height:1.8}

/* Zoom */
.zbar{position:absolute;bottom:18px;right:18px;display:flex;align-items:center;gap:3px;
  background:var(--s1);border:1px solid var(--b1);border-radius:8px;padding:3px 5px;
  z-index:50;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.zbtn{width:28px;height:28px;border-radius:6px;border:none;background:transparent;
  color:var(--di);cursor:pointer;font-size:16px;display:flex;align-items:center;
  justify-content:center;transition:all .1s}
.zbtn:hover{background:var(--s2);color:var(--tx)}
.zpct{font-size:11px;color:var(--di);min-width:38px;text-align:center}
.hint{position:absolute;bottom:18px;left:18px;font-size:10px;color:var(--mu);
  pointer-events:none;z-index:50;line-height:1.8}

/* Monitor node */
.mn{position:absolute;width:620px;background:var(--s1);border:1px solid var(--b1);
  border-radius:13px;box-shadow:0 8px 40px rgba(0,0,0,.65);z-index:20;min-width:320px;min-height:160px}
.mn-rs-e{position:absolute;right:-4px;top:12px;bottom:12px;width:8px;cursor:ew-resize;z-index:21}
.mn-rs-s{position:absolute;bottom:-4px;left:12px;right:12px;height:8px;cursor:ns-resize;z-index:21}
.mn-rs-se{position:absolute;bottom:-4px;right:-4px;width:14px;height:14px;cursor:se-resize;z-index:22}
.mn-tabbar{display:flex;padding:0 10px;border-bottom:1px solid var(--b1);background:rgba(0,0,0,.12)}
.mn-t{padding:8px 13px;font-size:10px;font-weight:600;color:var(--mu);cursor:pointer;
  border-bottom:2px solid transparent;transition:all .12s;white-space:nowrap;user-select:none}
.mn-t.on{color:var(--tx);border-bottom-color:var(--bl2)}
.mn-t:hover:not(.on){color:var(--di)}
.mn-body{height:320px;overflow-y:auto;overflow-x:hidden;user-select:text;cursor:auto;
  font-family:'SF Mono',Menlo,'Cascadia Code',monospace;font-size:11px;
  background:rgba(0,0,0,.28);border-radius:0 0 0 0}
.mn-body.last{border-radius:0 0 12px 12px}
/* status */
.st-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px}
.st-card{background:rgba(0,0,0,.25);border-radius:9px;padding:10px 12px}
.st-val{font-size:20px;font-weight:700;color:var(--tx);font-family:'SF Mono',monospace}
.st-key{font-size:9px;color:var(--mu);text-transform:uppercase;letter-spacing:.08em;margin-top:2px}
.st-prov{padding:0 12px 10px}
.st-pr{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px}
.st-pr:last-child{border-bottom:none}
/* logs */
.log-wrap{padding:6px 10px}
.log-l{font-size:10px;color:var(--di);line-height:1.6;padding:1px 0;
  white-space:pre-wrap;word-break:break-all;border-bottom:1px solid rgba(255,255,255,.025)}
.log-l:last-child{border-bottom:none}
.log-l.err{color:#f87171}.log-l.warn{color:#fbbf24}.log-l.ok{color:#4ade80}
/* requests */
.req-wrap{padding:4px 0}
.req-row{display:grid;grid-template-columns:52px 80px 1fr 38px 40px 72px 20px;
  gap:4px;align-items:start;padding:5px 8px;font-size:10px;
  border-bottom:1px solid rgba(255,255,255,.035)}
.req-row:last-child{border-bottom:none}
.req-ts{color:var(--mu);font-size:9px;font-family:'SF Mono',monospace;padding-top:2px}
.req-prov{font-weight:600;white-space:nowrap;padding-top:2px}
.req-model{color:var(--di);overflow:hidden;text-overflow:ellipsis}
.req-ms{color:var(--mu);font-size:9px;text-align:right;font-family:'SF Mono',monospace}
.req-ok{color:var(--gr);font-size:9px;font-weight:600;text-align:right}
.req-fb{color:var(--gr);font-size:9px;font-weight:600;text-align:right;opacity:.7}
.req-err{color:var(--rd);font-size:9px;font-weight:600;text-align:right}
.req-expand-btn{background:none;border:none;color:var(--mu);cursor:pointer;font-size:9px;padding:0;line-height:1}
.req-expand-btn:hover{color:var(--fg)}
.req-detail-panel{padding:6px 8px 8px;background:rgba(0,0,0,.2);border-bottom:1px solid var(--b1)}
.req-detail-section{margin-bottom:5px}
.req-detail-label{font-size:9px;color:var(--mu);font-weight:600;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em}
.req-detail-val{font-size:10px;color:var(--fg);line-height:1.5;white-space:pre-wrap;word-break:break-all}
.req-detail-val code{background:rgba(255,255,255,.07);padding:1px 4px;border-radius:3px;font-size:9px}
.usg-card{background:var(--s2);border-radius:8px;padding:8px 10px;text-align:center}
.usg-val{font-size:15px;font-weight:700;letter-spacing:-.3px}
.usg-lbl{font-size:9px;color:var(--mu);margin-top:2px;text-transform:uppercase;letter-spacing:.06em}
.usg-row{display:grid;grid-template-columns:1fr 36px 56px 56px 60px;gap:4px;padding:5px 8px;font-size:10px;align-items:center}
.usg-hdr{font-size:9px;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.06em;padding:6px 8px 4px;border-bottom:1px solid var(--b1)}
.usg-row:not(.usg-hdr):hover{background:rgba(255,255,255,.03)}
.req-hdr{color:var(--mu);font-size:9px;font-weight:700;text-transform:uppercase;
  letter-spacing:.06em;border-bottom:1px solid var(--b2) !important;padding:4px 10px}
.mn-empty{display:flex;align-items:center;justify-content:center;height:100%;
  font-size:11px;color:var(--mu)}

/* Mode switcher */
.mode-sw{display:flex;align-items:center;background:var(--s2);border:1px solid var(--b1);border-radius:7px;padding:2px;gap:1px}
.ms-btn{padding:3px 10px;border-radius:5px;border:none;font-size:10px;font-weight:600;cursor:pointer;
  transition:all .15s;color:var(--mu);background:transparent;white-space:nowrap}
.ms-btn.active{background:var(--bl);color:#fff}
.ms-btn:not(.active):hover{color:var(--tx);background:rgba(255,255,255,.06)}

/* OUT node bypass warning */
.out-bypass{font-size:9px;color:#fcd34d;background:rgba(245,158,11,.1);
  border-top:1px solid rgba(245,158,11,.25);padding:5px 10px;text-align:center;
  border-radius:0 0 12px 12px;letter-spacing:.01em}
.nd.bypassed{border-color:rgba(245,158,11,.5)!important;
  box-shadow:0 0 0 1px rgba(245,158,11,.1),0 6px 24px rgba(0,0,0,.5)!important}

/* Toast */
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);
  background:var(--s1);border:1px solid var(--b1);border-radius:8px;padding:8px 16px;
  font-size:11px;box-shadow:0 8px 32px rgba(0,0,0,.45);z-index:300;
  animation:tIn .2s ease;white-space:nowrap;pointer-events:none}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(6px)}}
/* Pi node (canvas) */
.pi-term-wrap{flex:1;overflow:hidden;padding:4px 0;background:#0d0d0f;border-radius:0 0 12px 12px}
.pi-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0d0d0f;z-index:10;gap:10px;border-radius:0 0 12px 12px}
.pi-spin{width:24px;height:24px;border:2px solid #333;border-top-color:#818cf8;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.pi-nd-port{position:absolute;left:-11px;top:50%;transform:translateY(-50%);
  width:22px;height:22px;border-radius:50%;background:var(--s1);
  border:2px solid var(--b2);z-index:15;
  display:flex;align-items:center;justify-content:center;transition:all .15s;pointer-events:all}
.pi-nd-port::after{content:'';width:8px;height:8px;border-radius:50%;background:var(--b2);transition:background .15s}
.pi-nd-port.live{border-color:#818cf8}.pi-nd-port.live::after{background:#818cf8}
.pi-nd-port.acc{border-color:var(--bl);box-shadow:0 0 0 4px rgba(99,102,241,.2)}.pi-nd-port.acc::after{background:var(--bl)}
</style>
</head>
<body style="display:flex;flex-direction:column;height:100vh">

<div class="hdr">
  <div class="hdr-l">
    <button class="icon-btn" id="sb-btn" onclick="toggleSb()" title="Menu">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="2.5" width="13" height="1.5" rx=".75" fill="currentColor"/>
        <rect x="1" y="6.75" width="13" height="1.5" rx=".75" fill="currentColor"/>
        <rect x="1" y="11" width="9" height="1.5" rx=".75" fill="currentColor"/>
      </svg>
    </button>
    <div class="logo">
      <div class="logo-ic">R</div>
      <span class="logo-txt">rcodex Gateway</span>
      <span class="logo-sep"> / </span>
      <span class="logo-port">:${port}</span>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:5px">
    <button class="icon-btn" id="hb-mon" onclick="toggleMonitor(monitorTab||'status')" title="Monitor">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="7.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
    </button>
    <button class="icon-btn" id="hb-pi" onclick="togglePi()" title="Pi Agent">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 11V3l4 5 4-5v8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="mode-sw">
      <button class="ms-btn" id="ms-rcodex" onclick="switchProvider('rcodex')" title="Route Codex through rcodex Gateway">rcodex</button>
      <button class="ms-btn" id="ms-oai" onclick="switchProvider('openai')" title="Use OpenAI directly (bypass gateway)">OpenAI</button>
    </div>
    <div style="width:1px;height:18px;background:var(--b1);margin:0 2px"></div>
    <div class="pill"><div class="dot"></div>Running</div>
  </div>
</div>

<div class="layout">

  <!-- Sidebar -->
  <div class="sb" id="sb">
    <div class="sb-hdr">
      <button class="sb-back" id="sb-back" onclick="sbGoBack()" style="display:none">&lt;</button>
      <span class="sb-title" id="sb-title">Menu</span>
      <button class="sb-x" onclick="toggleSb()">x</button>
    </div>
    <div class="sb-body" id="sb-body"></div>
  </div>

  <!-- Canvas -->
  <div class="ws" id="ws">
    <svg id="svgl"></svg>
    <div id="world"></div>
    <div class="zbar">
      <button class="zbtn" onclick="zoomStep(-1)" title="Zoom out"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      <div class="zpct" id="zpct">100%</div>
      <button class="zbtn" onclick="zoomStep(1)" title="Zoom in"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      <button class="zbtn" onclick="fitAll()" title="Fit to view"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 9h6v6H9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>
    </div>
    <div class="hint">Scroll to zoom / Drag to pan / Drag ports to connect</div>
  </div>

  <!-- ChatGPT panel -->
  <div class="cgpt-panel" id="cgpt-panel" style="display:none">
    <div class="cgpt-bar">
      <img src="https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32" width="16" height="16" style="border-radius:3px"/>
      <span style="font-size:13px;font-weight:600;color:var(--fg)">ChatGPT</span>
      <div style="flex:1"></div>
      <button class="icon-btn" onclick="document.getElementById('cgpt-frame').src=document.getElementById('cgpt-frame').src" title="Reload" style="opacity:.6">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7A5 5 0 1 0 3.5 3.5L1.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.5 1.5v3h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="icon-btn" onclick="window.open('https://chatgpt.com/','_blank')" title="Open in new tab" style="opacity:.6">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M6 2H2.5A1.5 1.5 0 0 0 1 3.5v8A1.5 1.5 0 0 0 2.5 13h8A1.5 1.5 0 0 0 12 11.5V8M8 1h5v5M13 1l-7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="icon-btn" onclick="toggleCgpt()" title="Close" style="opacity:.6">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
    <iframe id="cgpt-frame" src="" class="cgpt-frame" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"></iframe>
    <div class="cgpt-blocked" id="cgpt-blocked" style="display:none">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--fg2)" stroke-width="1.5"/><path d="M12 7v5.5l3 2" stroke="var(--fg2)" stroke-width="1.5" stroke-linecap="round"/></svg>
      <div style="font-size:14px;font-weight:600;color:var(--fg);margin-top:12px">ChatGPT couldn't load</div>
      <div style="font-size:12px;color:var(--fg2);margin-top:6px;text-align:center;max-width:280px">chatgpt.com blocks embedding. Open in a new tab to use alongside rcodex.</div>
      <button class="btn-primary" style="margin-top:16px" onclick="window.open('https://chatgpt.com/','_blank')">Open ChatGPT in new tab</button>
    </div>
  </div>

</div>

<script>
// Provider definitions
const FREETIER_LIST = [
  {id:'agentrouter',name:'AgentRouter',sub:'Free Tier (Claude format)',noAuth:false,apiKeyUrl:'https://agentrouter.ai'},
  {id:'aimlapi',name:'AIML API',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://aimlapi.com/app/keys'},
  {id:'novita',name:'Novita AI',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://novita.ai/settings/key-management'},
  {id:'sambanova',name:'SambaNova',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://cloud.sambanova.ai/apis'},
  {id:'deepinfra',name:'DeepInfra',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://deepinfra.com/dash/api_keys'},
  {id:'scaleway',name:'Scaleway',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://console.scaleway.com/iam/api-keys'},
  {id:'cerebras',name:'Cerebras',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://cloud.cerebras.ai/platform/api-keys'},
  {id:'kluster',name:'Kluster AI',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://kluster.ai/dashboard'},
  {id:'glhf',name:'GLHF',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://glhf.chat/user/api'},
  {id:'morph',name:'Morph',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://morph.so'},
  {id:'longcat',name:'LongCat',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://longcat.ai'},
  {id:'puter',name:'Puter',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://puter.com'},
  {id:'uncloseai',name:'UncloseAI',sub:'Free Tier (no auth)',noAuth:true,apiKeyUrl:null},
  {id:'nscale',name:'Nscale',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://nscale.com'},
  {id:'baseten',name:'Baseten',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://app.baseten.co/settings/api_keys'},
  {id:'publicai',name:'PublicAI',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://public.ai'},
  {id:'nous-research',name:'Nous Research',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://nousresearch.com'},
  {id:'groq',name:'Groq',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://console.groq.com/keys'},
  {id:'together',name:'Together AI',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://api.together.xyz/settings/api-keys'},
  {id:'fireworks',name:'Fireworks AI',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://fireworks.ai/account/api-keys'},
  {id:'openrouter',name:'OpenRouter',sub:'API Key',noAuth:false,apiKeyUrl:'https://openrouter.ai/keys'},
  {id:'deepseek',name:'DeepSeek',sub:'API Key',noAuth:false,apiKeyUrl:'https://platform.deepseek.com/api_keys'},
  {id:'mistral',name:'Mistral',sub:'API Key',noAuth:false,apiKeyUrl:'https://console.mistral.ai/api-keys/'},
  {id:'xai',name:'xAI',sub:'API Key',noAuth:false,apiKeyUrl:'https://console.x.ai/'},
  {id:'perplexity',name:'Perplexity',sub:'API Key',noAuth:false,apiKeyUrl:'https://www.perplexity.ai/settings/api'},
  {id:'cohere',name:'Cohere',sub:'API Key',noAuth:false,apiKeyUrl:'https://dashboard.cohere.com/api-keys'},
  {id:'nebius',name:'Nebius',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://studio.nebius.ai/settings/api-keys'},
  {id:'siliconflow',name:'SiliconFlow',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://cloud.siliconflow.cn/account/ak'},
  {id:'hyperbolic',name:'Hyperbolic',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://app.hyperbolic.xyz/settings'},
  {id:'nvidia',name:'NVIDIA',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://build.nvidia.com'},
  {id:'enally',name:'Enally',sub:'Free Tier',noAuth:false,apiKeyUrl:'https://enally.ai'},
];
const PDEFS = [
  {id:'anthropic',name:'Claude',sub:'Anthropic',icon:'C',ibg:'rgba(249,115,22,.15)',color:'#f97316',
   apiKeyUrl:'https://console.anthropic.com/settings/keys',
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with Claude Code',desc:'OAuth login uses your Claude Pro/Max subscription',warn:null},
     {id:'apikey',icon:'Key',name:'API Key',desc:'Use Anthropic API key from console.anthropic.com',warn:null},
   ]},
  {id:'openai',name:'ChatGPT / Codex',sub:'OpenAI',icon:'O',ibg:'rgba(16,163,127,.15)',color:'#10a37f',
   apiKeyUrl:'https://platform.openai.com/api-keys',
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with ChatGPT',desc:'OAuth login uses your ChatGPT subscription',warn:null},
     {id:'apikey',icon:'Key',name:'API Key',desc:'Use OpenAI API key from platform.openai.com',warn:null},
     {id:'session',icon:'Cookie',name:'Session Token',desc:'Use chatgpt.com browser cookie (unofficial)',warn:'Unofficial; may break. Against ToS.'},
   ]},
  {id:'google',name:'Gemini',sub:'Google',icon:'G',ibg:'rgba(66,133,244,.15)',color:'#4285f4',
   apiKeyUrl:'https://aistudio.google.com/apikey',
   methods:[
     {id:'apikey',icon:'Key',name:'API Key',desc:'Use Google AI Studio key from aistudio.google.com',warn:null},
   ]},
  {id:'ollama',name:'Ollama',sub:'Local models',icon:'L',ibg:'rgba(168,85,247,.15)',color:'#a855f7',
   apiKeyUrl:null,
   methods:[
     {id:'local',icon:'Local',name:'Connect Local',desc:'Use locally running Ollama (localhost:11434)',warn:null},
   ]},
  {id:'antigravity',name:'Antigravity',sub:'Google Code Assist',icon:'A',ibg:'rgba(52,211,153,.15)',color:'#34d399',
   apiKeyUrl:null,
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with Google',desc:'OAuth login uses your Google Cloud / Gemini Code Assist account',warn:null},
   ]},
  {id:'copilot',name:'Copilot',sub:'GitHub',icon:'P',ibg:'rgba(31,111,235,.15)',color:'#2f81f7',
   apiKeyUrl:null,
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with GitHub',desc:'OAuth device login uses your GitHub Copilot subscription',warn:null},
   ]},
  {id:'kiro',name:'Kiro',sub:'AWS CodeWhisperer',icon:'K',ibg:'rgba(255,153,0,.15)',color:'#ff9900',
   apiKeyUrl:'https://aws.amazon.com/q/kiro/',
   methods:[
     {id:'apikey',icon:'Key',name:'Session Token',desc:'Use AWS Kiro session token for CodeWhisperer models',warn:null},
   ]},
  {id:'vertex',name:'Vertex AI',sub:'Google Cloud',icon:'V',ibg:'rgba(26,115,232,.15)',color:'#1a73e8',
   apiKeyUrl:'https://console.cloud.google.com/iam-admin/serviceaccounts',
   methods:[
     {id:'apikey',icon:'Key',name:'Service Account JSON',desc:'Paste Google Cloud service account JSON key for Vertex AI',warn:null},
   ]},
  {id:'opencode',name:'OpenCode',sub:'Free models',icon:'X',ibg:'rgba(139,92,246,.15)',color:'#8b5cf6',
   apiKeyUrl:null,
   methods:[
     {id:'local',icon:'Local',name:'Connect (No Auth)',desc:'OpenCode.ai free models — no API key needed',warn:null},
   ]},
  ...FREETIER_LIST.map(ft=>({
    id:ft.id, name:ft.name, sub:ft.sub, icon:ft.name[0].toUpperCase(),
    ibg:'rgba(100,116,139,.15)', color:'#64748b',
    apiKeyUrl: ft.apiKeyUrl||null,
    methods: ft.noAuth
      ? [{id:'local',icon:'Local',name:'Connect (No Auth)',desc:'Connect to ' + ft.name + ' — no API key needed',warn:null}]
      : [{id:'apikey',icon:'Key',name:'API Key',desc:'Use ' + ft.name + ' API key',warn:null}],
  })),
];
const COL=(()=>{const c={anthropic:'#f97316',openai:'#10a37f',google:'#4285f4',ollama:'#a855f7',antigravity:'#34d399',copilot:'#2f81f7',kiro:'#ff9900',vertex:'#1a73e8',opencode:'#8b5cf6'};FREETIER_LIST.forEach(f=>c[f.id]='#64748b');return c;})();
const ICONS=(()=>{const i={anthropic:'C',openai:'O',google:'G',ollama:'L',antigravity:'A',copilot:'P',kiro:'K',vertex:'V',opencode:'X'};FREETIER_LIST.forEach(f=>i[f.id]=f.name[0].toUpperCase());return i;})();
const IBGS=(()=>{const b={anthropic:'rgba(249,115,22,.15)',openai:'rgba(16,163,127,.15)',google:'rgba(66,133,244,.15)',ollama:'rgba(168,85,247,.15)',antigravity:'rgba(52,211,153,.15)',copilot:'rgba(31,111,235,.15)',kiro:'rgba(255,153,0,.15)',vertex:'rgba(26,115,232,.15)',opencode:'rgba(139,92,246,.15)'};FREETIER_LIST.forEach(f=>b[f.id]='rgba(100,116,139,.15)');return b;})();const IMG_ICONS={
  anthropic:'data:image/png;base64,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',
  openai:'data:image/png;base64,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',
  google:'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAlAMBEQACEQEDEQH/xAAbAAEAAQUBAAAAAAAAAAAAAAAABgECAwQHBf/EADQQAAICAQIDBAcIAwEAAAAAAAABAgMEBRESITEGIkFRE0JhcYGR0QcUFSMyUrHBYnKhQ//EABoBAQADAQEBAAAAAAAAAAAAAAADBAUBAgb/xAAvEQEAAwACAAQDBwQDAQAAAAAAAQIDBBEFEiExEyJBMlFhgZHB0UJxsfEjofAU/9oADAMBAAIRAxEAPwDuIAAAAAAAADyO1efLTtCyciufBbw8Fcl1UpckyLa/kpMwu+HYRvyaUmO495/tCFdhdXyY65HHycm2yrJi47WTcu/1T59OjKvHvbz9TLf8Y4mf/wA/npWImv3R9HTC++TAAAAAAAAAAAAAAAAAABAftJ1DjsxdOg9+D86fv5qP9lLlW9Yq+l8Bw6i20/2j/M/sh2JdPFyaciv9dM1OPvT3IKekxLa2rGlJpPtPo7Th3wysarIqe9dsFKL9jRqRPcPgr0mlppPvDMHkAAAAAAAAAAAAAAAAYsnIrxaLLrpcNdcXKT8kjkzER3L1Slr2itfeXGtTzZ6lqORmW772z3Sfqx8F8tjMmZvaZl93hlXDKuUfRhiialUel3Qfs/1NWYlmn2y79Per38YN818H/JdrHUPmPEqR8T4kfVLzrNAAAAAAAAAAAAAAAAEH+0LWNorSseXOW072n0XhH+/kVeRf+iG/4LxfWeRb8v3lBkiKlO25pdkii5nmzttW9pebZp2dVlU/qrfOP7l4ov0x80dMjk3i0dOs4eTVl4tWRRLirsjxRZUtWaz1LMZjgAAAAAAAAAAAAAA8ntFrNWj4DuklK6XKqt+tL6LxI9NIpXta4fFtytPLHt9ZcqunZkX2XXyc7bJOUpPq2U6xMz3L67utKxWvpEKKJbzzUtdV6RoZZsvbZU0M82XrqkvY3XVgX/csqe2NbLuyfSuX0Z45fEm9fPX3hUrtHm6l0JPcx1hUAAAAAAAAAAAANLVdSo0zFlkZMu6uUYrrJ+SPF7xSO5TYYX3v5Kf6cv1bPv1XMnk5L5vlGC6QXkih5p0t3L6nHOnGz8lP9tRQ5FrOiHXZXY0cs2ZtsoaOWbL12Wtl2lGfpotk+XMs1qp3um/Y/tNxqGm6hZ+Z0otl63+Lfn5eZj+IcGa/8ucen1j7vxW+NyYn5L+6aLoY6+qAAAAAAAAAAeZrOsY2l08Vz4rX+ipPvS+i9pBtyKYx6+6xx+Lfe3Vfb6y55qmdk6pk+nypb/sgukF5IzZ0trbuz6HKmfHp5Kf7anAW8qodNlGjTxoztd1kuRpZZs3XZjky/SjP01Y3It1qqXusbJYhDNlre566RzKadl+2PouDD1ebcFyryX4eyX1+fmYvO8M770xj+8fw0eNzf6dP1TyElOKlFpxfNNeJgtRcAAAAAACy22FUHOycYRXWUnsjza1aR3aeodiJtPUQjWrdqOFSq02PFLp6aS5L3LxMjkeK1+zj6/i1OP4d382v6Inc7L7ZW3TlOyX6pSfNmbF7XnuZ9Wl560jy19oY3Av4x2p6bLJI1sKs/Xdika+NGdpswzZpZ0Ur6dsM2XKVVbXYmyesIZst3JOkfam51xQdQPa0DtNnaK1XF+mxd+dE30/1fh/BR5fAy5Hr7W+/+Vnj8q+Pp7x9zomi9ocDWIpY1yjb402cpr4ePvR85yOHtx5+ePT7/o18eTnrHyz6vX3KqwAANPI1LEx21bdHiXWMeb+RT28Q42EzF7x3H0+v6Js+Ppp9mHk5naJvdYlPP91n0Rj7+PR7Y1/Of4Xc/D/rpLwsy/IzJcWTbKfkn0XwMjXl67z3pbv/AB+i/SlMo6pHTVlX7DlZctoxThsXMlTTVhmjVwZ+uzBNm3hDO02YJs18YUr6ME2aWcIJuwyZaqime2Nk0PEyoz04oHDc6KMBFuMlKMnGSe6a5NM5MRPpJ7esJHpXbPVMBRhe1mVLlta++l/t9dzN38Kx19a/LP4e36LmXO1p6T6wlmn9uNIyUo3uzFn5Wx3T9zW//djI18K5Gf2fm/t/Er+fPxt7+iQ42TRlUq7Gtruql0nXJST+KM+9bUny3jqVytq2jus9wjeXo+XC2c4wdkXJtOL5s+K5fhPKrpa1Y80T93v+37tnLl5zWImemhKqUJcMouL8mtmZU1tWerR1P4rHxImO4WOB7qjm7HOOxNRBe7XtRfyUdNGpaa2DP10atjNnCWfpdrzZsYyrWswyNHOXiZYpFurz2sJoFrPTih1wAAAKb8gN/A0bUtQaeJhXTi/X4eGPzfIrbcrHL7doTZ4a6fZhOuzfZnMwcCVeVlOqydjnwVS3S5JdfPkYPM5+eundK9xEfVq8Xi3zp1afVLmZS+xXY9V8eG6uM1/kiLXDPWOtK9vVbWr7S8nM0JbOWLPZ/sn0+Zh8jwOvvhPX4T/KevIt/U8PJoson6O2DjLyZj2xvlby6R1Ja/fs0rYljNT0lp3RNPGVDSWlajXwupXa00a+N0FpYpGnlZ4YpF2kiwsRItPYozrgBR8lucEg0TslqGq8Nli+6475qy2POS9kfrsZ3J8Txx9I+afw/lcw4emvrPpCc6V2S0rTeGfofvFy/wDS/vPf2LojD38Q229O+o+6Gplw8s/p3P4vcjHZFFaXAAAADDkY9WTBwugpR/gi1xprXy3jsRnVdHsxU7K97KfPbnH3/UwuTwLYT5q+tf8ACO8S8K6B5yspaQ0roGnjdTvDTsia2N1a0NeSNTK7wxyRoZ2GNot1kW7EsSKHobGDhZGoZMcbDqdtsvVXgvN+SI9dqZU8956h6zztpby1juXRezvY/F0zhvzFHJy1zTa7kPcv7f8Aw+b5niWm/wAtPSv/AHLZ4/Crn629ZSfYzF5UAAAAAAACjW4Eb1zRVFSyMSPd6zrXh7UZPK4fk+fP84/hX1y7juEWugRZWZ94aNsTUxuq2hqTRq43QSxSNLK7naxou0sLeEnrZ1uaTpWRq2XHGxY8+s5vpBebPG/JphTz2S4421t5aup6HouLo2KqcaO8nzsta7035v6Hy3J5OnIv5ry3scK416q9IrpgAAAAAAAAAAARLtLpPoN8vHj+VJ9+K9V+fuMzkcfyT56+0qPJy6+aEVuR6yuzLtK1czTxur2a7NPK6PtQvUu722MHCvz8uvGxocVlj2Xkva/JE1t651m1vaE2dLaWitfeXVND0mjSMNY9C3k+dljXOcvM+d5G9t7+az6DDGuNfLD0SBMAAAAAAAAAAAABZbCNkHCaTjJbNPxRyY7jqXJjv0lzrX9PlpubKrrVLvVyfivL4GfbP4duvoxOVl8O/X0eHb1LeVlC0teRo5XRdqb+ZdpoduldjtFWm4ayL4bZV63lv6kfBfUo8rkTrbyx7Q+i4PG+FTzW95SMqrwAAAAAAAAAAAAAAB5HaXTPxHTbIwjvdX36vf4r4kWtPPVV5ePxc5iPePZy+xkOfo+ZtZgky5SyLt7/AGL0r8S1T0lsN8fG2nLfpKXqr+/gWLazFfRoeHYfG17n2r/6HTktkis+lVAAAAAAAAAAAAAAAAH0A5d2ywPuGs2cC2qvXpYfH9S+f8orXr5bPl/Ecvhbz90+qPtrx6ElbM2bOr9kdO/DdFphKO11v5tu/Xd+HwWyJe+31vAw+DhET7z6y9oLoAAAAAAAAAAAAAAAAARX7Q8L0+jwyorv41ib5eq+T/7s/gRax6dsnxjLzYeeP6ZQfs7hfiOtYmO1vBzUpr/Fc3/G3xPFPdg8LL429afj6/k7ClsWH2ioAAAAAAAAAAAAAAAAAA19Qxq8zDuxr03XbBxlt1OTHcI9s66ZzS3tKI9g9MopiszJTnKyqbpjxNbKO/Xp15EWUessjwrjUpe9/rHomxM2wAAAAAAAAB//2Q==',
  ollama:'data:image/png;base64,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',
  antigravity:'data:image/jpeg;base64,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',
  copilot:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK8AAACUCAMAAADS8YkpAAAAaVBMVEX///8AAAD6+vr19fXv7+/h4eE9PT3Z2dlgYGCYmJjy8vLGxsbq6urc3Nzn5+dsbGy1tbXQ0NB1dXVlZWWenp5CQkKqqqpVVVUvLy8eHh6CgoKSkpKLi4snJydbW1sWFhYMDAw2NjZJSUkxB+ElAAAJhklEQVR4nO1d57qiMBBVighBKVJD5/0fcgVFislkAui9++2en7sphziZlknu4fAffxFsw3ODLKcd8ixwPcP+aUpsKJYX+KekSNP6OKJO0yI5+YGnKT9NcIR1IVFcHWFUcUQu1k9TvZMlgZ8IuA5I/ID8LGWPxgWS7ANFnHs/xFW5BqkU1wFpcP2+NKuuv4rsA76rfpmts4FtB+ebjN2mFjMSoG7c75BVSbOZ7AMN+cIae1slYQrn08pCMbHKFofE/Kiq8OS0LQbF55bYCnZn2yH4kM0zbh+hezzejE/QJfvLwoCC7M5W+YwsDAh23nZK/lG6x2O+K2F1i7OAg7+j7bDebERdp0nTxmFVy1nmuq7CuG2S9L2fs5uasKd06/ZGXWNcDM2LnBhDuo6dyNNe/VTDpbd22tHZKdSzzuOYpeleGR+EcNccl0Hn6prl2OS8j0iMsut7vCWwIjiAqyLer217k/H3oDtohsrXoGYeFGykoNHV/OFj8+10B71binR6BPCNBH1JiWwoBHnuCAoubo+SS7cU9tXoo2W90dJZDf6HIly+GBJPsWu22Y3nXkBtBPvMoXtGKSqZqXhwH5uoZegwBjIO3wzV+9r2jdMNYZ0VSu0Cl63TKiSD54YN19u55yZokXpcPzH5nnRcd/WxwEe6lq52lFrewyFm8o2x3QeNKFZFbDyX94g2k+wAxMF2V4+bFth4hsIndA/2hsNttw5PeWoua+gqw/LibY7L5Ivf8INA0DVK2BjiNXw0yLYYeJNlPHsUawLQ4WMrnPKdzjcHfvLroBBXuBHKoJzO+O16YfLFS6M2WMiTvEB4w3QSwtTzrdKiObVxe2qKtJLj+9oyR/mkzytiMPF9+m+khHiGrumGRwiVnNscJpX2ItRXdkRClvr9NlVfmdx+G33oQjY0GlWThP/hLpfGXzOA7Kw96JqeAZNvgB9g5Ctp4+xyDd/eHt/Gn1J9/AN+gJFvKedEkHQN397fcUZ9ovSbFu3vTPlKpgAnwSOer9Y7hL6iWloHS1V6eWjxSzUx6FImY5ovw/P1egfpRH3nXJbl2fFpb3MSvEKb8JXKp9nNmg/lRfSrRghlslP6ZDb09h6t0wJ4CzlNMiOjkh5TxxD9w+ghh2+InXqWtpXRwNOVirHbhe39ykytTQMqGQ08DRxrrD/JP47BauDrNL2KD2sOh9lsSP/KO/KB1BBzfxRPV5v1w204hR3MPxDidtz8TAevtudxTYjq84o1w7NDaZ5T3z+3r8NbXMw537B4C7dQpIiEi/LyXImqKk+olvr6csyPZM2nxavtxWmQeC5l7DHXfurr332xSCyO+PA++yJP04g0xNXn0Zp8iC8cpZlPi/aThkTWOBVsMshE7pZCN9kKISyQb2d82LTd4bL4UNgb1abG5S3VO0sKQ0l67S09j07zeO81GZXLmeoSzOoP3y2ZO/3/KuBw0Bi5WLRfR1hHPbfo3WFSSTb/KZz3TaXMj+aajFG0Y0cs25hiFRrHLwyd2SJrxG+XJQYsiVMXbYqWktk4rsNxlLAKzWR3f6yPn5lmRm8sa1awf+wLq3DidKPdQH4DzIXNfEB8AcS8/XFh57GFQPFVr8a64oGYHxDY6wj7xhVWaSopk6JIVxXvZdDQKu/oCESdFkVScovqrtn6KsOzSPd4vMM5BO2MaRk9+EeLAX8xjMS+nxUtreZ0AOD/urkZqwGXwt2IbfMqjgqGZmbBjnhTBLZNwGKxd1VsQLJwfqTI1SheWr409GVStZ4fLm1REkcPATUgiakXSXowOshHib9EuROfkrvxTE+xQwMimwhXSEDvI9xZV8l9hDwalaAK1WAtMu5Q0/N8xrvC80ifk157cGrpzxGW6gqSiVmFAD8UP8rk87eCff7xxMSVYjhkI1Ydhq0DWJXXvERY4VeGHHcoUZEAVFNzLIeFg43Pl8rMe4ByOQTZ/DqWX8b3Udxz5aXpfh3fR52LyHv8RXw7D1Nr4CbV/rXEfBCBx9Vowk9CR1G78BXdSHIPvKT4gA/UagN8RTXn9CDYbTKnJdsBGq4O4UHkozdivoqNuCBmYdwNrxGwqQ+CBmK+F3r31moHFBvN7RzyRugoC/ket/JVomGLZPw1vgyubSyoNTEgtxbHN4SnmKgXbk76OvonDbzChmg3IfiC7uQ0ecOrhZ15XXCS9ALHcRi+Lch3pg05aVd9Nh54Fqd/mu9s/JSdkZ77U2Cy/ipMrIj5Qgtiz+WN3XQeV4NZfnEiaBvfRUUqu+ncoToz2zyhCbMqv4uvKryy9rv4KsJ7J7+L7+Hf4xtDx2b/+f57fCEP5V/nu4M++9v4ln8bX+ho4gf4iuJNkO8V45/N+YK1UkK+FecOzYgzFNYqc/+arfrmGRmwkkfIN4ZTriK+88oZzg3i62w8MBwU8o0OukAgYL6zWIeTGZwVjiTQaEK+tS7MT8J8pwEc9/rwNGsjyA4I+HYn4CqcQbvBfMfgt+QfIHuDGhEl4wT+Ou2nAM+9puXobMJuP0cJvohwoc29TUJFuSKY73AOqLhAWlDEt7tBT4gnKNZSLvdGhjDLBvEt3LH7lR/nMUpyPgeA722+ImbDaSfYb/vC4q1b85a24BUogPHQ3uDlo24MwVfZim3rDXEpcI7WTE6ii7nEzvce0np/x6P/hbkmUXEbRnv8fdGtYB20pibkcDFro7K1F4LlYLPsAEtyp1AI41J5kn9eJtSMcdZSuwhtmrMOaaj3Sb1meSynIEVe/WB2Pjq8EtXN0NjPtdzQmkkhTC8+zj+hi3XKDhm4L7QwwdQUd92y8yI/DrpYooC/9fyAanLOajKy1yrrhFMpUom0AhMXXoFcm++wypqb8w5XSukqsYExz92vTs7aMXsoxDnxHhgqtrxMaTv8E+gm0G150oqtBw13zPsGWU+2h0eBM/MTdckFz1m5EJdCR67lDm/5KZcMehsqbbuiQrE8a10pYwvWY4Rkpxe6NNFLtGmRxCbRu0tDy6+9QydmnBSi0pF2045YIrqhnhtMY6d7tzpyXTcKzJw6Me7N3ZO/t5utkvxjDySG0SdedFSuUBy9HvFeYsuAQU/bn9KdoAqzDz94bkW+sKgCi5h+40XduxaloufLEUjz3RwRMWXLO2+inObff0LeMMtwhTCn7S34Zk5jCt0N5KS5pRGR9Wz3haobLsU8mJmcTVd0IehrUGzPdE5N8nxy54Wq+4MHSZxFxndyApK4LzaJgscflMhz04y6Sws/Teo/JPAH0seL5LiArCIAAAAASUVORK5CYII=',
  kiro:'https://www.google.com/s2/favicons?domain=kiro.aws&sz=64',
  vertex:'https://www.google.com/s2/favicons?domain=cloud.google.com&sz=64',
  opencode:'https://www.google.com/s2/favicons?domain=opencode.ai&sz=64',
  agentrouter:'https://www.google.com/s2/favicons?domain=agentrouter.ai&sz=64',
  aimlapi:'https://www.google.com/s2/favicons?domain=aimlapi.com&sz=64',
  novita:'https://www.google.com/s2/favicons?domain=novita.ai&sz=64',
  sambanova:'https://www.google.com/s2/favicons?domain=sambanova.ai&sz=64',
  deepinfra:'https://www.google.com/s2/favicons?domain=deepinfra.com&sz=64',
  scaleway:'https://www.google.com/s2/favicons?domain=scaleway.com&sz=64',
  cerebras:'https://www.google.com/s2/favicons?domain=cerebras.ai&sz=64',
  kluster:'https://www.google.com/s2/favicons?domain=kluster.ai&sz=64',
  glhf:'https://www.google.com/s2/favicons?domain=glhf.chat&sz=64',
  morph:'https://www.google.com/s2/favicons?domain=morph.so&sz=64',
  longcat:'https://www.google.com/s2/favicons?domain=longcat.ai&sz=64',
  puter:'https://www.google.com/s2/favicons?domain=puter.com&sz=64',
  nscale:'https://www.google.com/s2/favicons?domain=nscale.com&sz=64',
  baseten:'https://www.google.com/s2/favicons?domain=baseten.co&sz=64',
  publicai:'https://www.google.com/s2/favicons?domain=public.ai&sz=64',
  'nous-research':'https://www.google.com/s2/favicons?domain=nousresearch.com&sz=64',
  groq:'https://www.google.com/s2/favicons?domain=groq.com&sz=64',
  together:'https://www.google.com/s2/favicons?domain=together.ai&sz=64',
  fireworks:'https://www.google.com/s2/favicons?domain=fireworks.ai&sz=64',
  openrouter:'https://www.google.com/s2/favicons?domain=openrouter.ai&sz=64',
  deepseek:'https://www.google.com/s2/favicons?domain=deepseek.com&sz=64',
  mistral:'https://www.google.com/s2/favicons?domain=mistral.ai&sz=64',
  xai:'https://www.google.com/s2/favicons?domain=x.ai&sz=64',
  perplexity:'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64',
  cohere:'https://www.google.com/s2/favicons?domain=cohere.com&sz=64',
  nebius:'https://www.google.com/s2/favicons?domain=nebius.ai&sz=64',
  siliconflow:'https://www.google.com/s2/favicons?domain=siliconflow.cn&sz=64',
  hyperbolic:'https://www.google.com/s2/favicons?domain=hyperbolic.xyz&sz=64',
  nvidia:'https://www.google.com/s2/favicons?domain=nvidia.com&sz=64',
  enally:'https://www.google.com/s2/favicons?domain=enally.ai&sz=64',
};
const SVG_ICONS={
  providers:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l7.5 4.3v8.5L12 20l-7.5-4.2V7.3L12 3z" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8.2 10.2l7.6 4.4M15.8 10.2l-7.6 4.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  monitor:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 19V5m5 14v-8m5 8V8m5 11V3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  terminal:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 7l5 5-5 5m8 0h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  refresh:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6v5h-5M4 18v-5h5M18.2 9A7 7 0 0 0 6.3 6.8M5.8 15A7 7 0 0 0 17.7 17.2" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fit:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 9h6v6H9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  close:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  login:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M10 17l5-5-5-5M15 12H3M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  key:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="7.5" cy="14.5" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M10 12l8-8m-1 1l3 3m-6 0l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cookie:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 13.5A8 8 0 1 1 10.5 4a3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3.5 3.5z" stroke="currentColor" stroke-width="2"/><path d="M8 10h.01M12 16h.01M9 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
};
const PROVIDER_SVG={
  anthropic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4l7 16h-3l-1.4-3.4H9.4L8 20H5l7-16zm1.6 10L12 9.8 10.4 14h3.2z" fill="currentColor"/></svg>',
  openai:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3.5a4.2 4.2 0 0 1 4 2.9 4.2 4.2 0 0 1 3.2 6.3 4.2 4.2 0 0 1-4 5.9 4.2 4.2 0 0 1-6.4.2 4.2 4.2 0 0 1-3.9-6.1A4.2 4.2 0 0 1 8.8 6.4 4.2 4.2 0 0 1 12 3.5z" stroke="currentColor" stroke-width="1.8"/><path d="M8.8 6.4l6.4 3.7v7.8M19.2 12.7l-6.4 3.7-6.8-3.9M8.8 18.8V11l6.8-3.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  google:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 12.2c0-.7-.1-1.4-.2-2H12v3.7h4.5a3.9 3.9 0 0 1-1.7 2.5v2h2.8c1.6-1.5 2.4-3.6 2.4-6.2z" fill="currentColor"/><path d="M12 20c2.2 0 4.1-.7 5.5-2l-2.8-2a5 5 0 0 1-7.4-2.6H4.4v2.1A8 8 0 0 0 12 20zM7.3 13.4a5 5 0 0 1 0-2.8V8.5H4.4a8 8 0 0 0 0 7l2.9-2.1zM12 7a4.4 4.4 0 0 1 3.1 1.2l2.4-2.4A8 8 0 0 0 4.4 8.5l2.9 2.1A4.8 4.8 0 0 1 12 7z" fill="currentColor"/></svg>',
  ollama:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 12c0-4 2-7 5-7s5 3 5 7v7H7v-7z" stroke="currentColor" stroke-width="2"/><path d="M9 11h.01M15 11h.01M10 16h4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  antigravity:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.4 6.5L21 12l-6.6 2.5L12 21l-2.4-6.5L3 12l6.6-2.5L12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  copilot:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 10V8a5 5 0 0 1 10 0v2M5 11h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-6z" stroke="currentColor" stroke-width="2"/><path d="M9 15h.01M15 15h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  kiro:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="currentColor" stroke-width="2"/><path d="M8 8v8M12 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  vertex:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 18H4L12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  opencode:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4l-4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
function providerImg(provider,size){
  size=size||18;
  const src=IMG_ICONS[provider];
  const fallback=PROVIDER_SVG[provider]||ICONS[provider]||'?';
  return src
    ?\`<span class="prov-icon" style="--isz:\${size}px"><img src="\${src}" alt="" draggable="false"></span>\`
    :\`<span class="prov-icon" style="--isz:\${size}px">\${fallback}</span>\`;
}

// App state
let ST = { accounts:[], ollamaRunning:false, ollamaModels:[], ollamaBaseUrl:'http://localhost:11434' };
let sbOpen = false;
let sbScreen = 'home'; // 'home' | 'providers' | 'add-type' | 'add-method' | 'oauth-device'
let sbAddingDef = null;
let sbAddingMethod = null;
let sbOAuthDevice = null;
let sidebarModelSel = {}; // accountId ??currently selected model in sidebar

// ChatGPT panel state
let cgptOpen = false;

// Monitor state
let monitorOpen = false;
let resizeD = null;
let piResizeD = null;
let monitorTab = 'status';
let monitorRefreshTimer = null;
let usageHtmlCache = '';
let quotaState = {};
let lastReqData = null;
let codexMode = 'rcodex';

// Canvas state (localStorage) ??keyed by slotId (not accountId)
const LS_POS    = 'rcodex-pos-v4';
const LS_CANVAS = 'rcodex-canvas-v4';
const LS_SLOTS  = 'rcodex-slots-v1';
const LS_HIDDEN = 'rcodex-hidden-slots-v1';
function loadPos(){   try{return JSON.parse(localStorage.getItem(LS_POS)||'{}')}catch{return {}} }
function loadCanvas(){ try{return new Set(JSON.parse(localStorage.getItem(LS_CANVAS)||'[]'))}catch{return new Set()} }
function loadSlots(){  try{return JSON.parse(localStorage.getItem(LS_SLOTS)||'{}')}catch{return {}} }
function loadHidden(){ try{return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN)||'[]'))}catch{return new Set()} }
let NP        = loadPos();
let onCanvas  = loadCanvas();  // Set of slotIds (+ 'out', 'monitor')
let nodeSlots = loadSlots();   // {[slotId]: {accountId, model}}
let hiddenSlots = loadHidden();

function saveLS(){
  localStorage.setItem(LS_POS,    JSON.stringify(NP));
  localStorage.setItem(LS_CANVAS, JSON.stringify([...onCanvas]));
  localStorage.setItem(LS_SLOTS,  JSON.stringify(nodeSlots));
  localStorage.setItem(LS_HIDDEN, JSON.stringify([...hiddenSlots]));
}
function accountNo(acc){
  const same=(ST.accounts||[]).filter(a=>a.provider===acc.provider&&a.label===acc.label);
  const idx=same.findIndex(a=>a.id===acc.id);
  return same.length>1&&idx>=0?idx+1:null;
}
function accountName(acc){
  const n=accountNo(acc);
  return (acc.label||acc.provider)+(n?' #'+n:'');
}
function methodIcon(id){
  if(id==='oauth')return SVG_ICONS.login;
  if(id==='apikey')return SVG_ICONS.key;
  if(id==='session')return SVG_ICONS.cookie;
  return PROVIDER_SVG.ollama;
}
if(!NP.out) NP.out={x:520,y:280};

// Viewport
let vp={x:60,y:40,s:1};
let panD=null,nodeD=null,connD=null;

// Sidebar navigation
function toggleSb(){
  sbOpen=!sbOpen;
  document.getElementById('sb').classList.toggle('open',sbOpen);
  document.getElementById('sb-btn').classList.toggle('on',sbOpen);
  if(sbOpen){ sbScreen='home'; renderSb(); }
}

function sbGoBack(){
  if(sbScreen==='oauth-device'){ sbScreen='providers'; renderSb(); }
  else
  if(sbScreen==='add-method'){ sbScreen='add-type'; renderSb(); }
  else if(sbScreen==='add-type'){ sbScreen='providers'; renderSb(); }
  else if(sbScreen==='providers'){ sbScreen='home'; renderSb(); }
  else if(sbScreen==='settings'){ sbScreen='home'; renderSb(); }
}

function renderSb(){
  const back=document.getElementById('sb-back');
  const title=document.getElementById('sb-title');
  const body=document.getElementById('sb-body');
  const showBack=sbScreen!=='home';
  back.style.display=showBack?'flex':'none';
  document.getElementById('sb').classList.toggle('wide',sbScreen==='providers');

  if(sbScreen==='home'){
    title.textContent='Menu';
    body.innerHTML=\`
      <div style="padding:8px 0">
        <div class="nav-item" onclick="sbGoTo('providers')">
          <div class="nav-ic" style="background:rgba(99,102,241,.15)">\${SVG_ICONS.providers}</div>
          <div class="nav-info">
            <div class="nav-name">Providers</div>
            <div class="nav-sub">Manage AI provider accounts</div>
          </div>
          <span class="nav-arr">&gt;</span>
        </div>
        <div class="nav-item" onclick="sbGoTo('settings')">
          <div class="nav-ic" style="background:rgba(99,102,241,.15)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/></svg></div>
          <div class="nav-info">
            <div class="nav-name">Settings</div>
            <div class="nav-sub">Gateway configuration</div>
          </div>
          <span class="nav-arr">&gt;</span>
        </div>
      </div>\`;
  }
  else if(sbScreen==='settings'){
    title.textContent='Settings';
    body.innerHTML=\`
      <div style="padding:14px 14px 6px">
        <div style="font-size:11px;font-weight:600;color:var(--tx);margin-bottom:10px">Request Body Limit</div>
        <div style="font-size:10px;color:var(--mu);line-height:1.6;margin-bottom:12px">
          Maximum size of a single request body proxied through the gateway.<br>
          Takes effect immediately — no restart needed.
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <input id="set-blimit" type="number" min="1" max="1024" step="1"
            class="form-input" style="width:80px;text-align:center"
            placeholder="64" value="..."/>
          <span style="font-size:11px;color:var(--mu)">MiB</span>
          <button class="form-submit" style="flex:none;padding:7px 14px;font-size:11px"
            onclick="saveBodyLimit()">Apply</button>
          <span id="set-blimit-msg" style="font-size:10px;color:var(--gr);display:none">✓ Applied</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          \${[10,32,64,128,256,512].map(v=>\`
            <button onclick="document.getElementById('set-blimit').value=\${v}"
              style="padding:3px 10px;border-radius:6px;border:1px solid var(--b1);
              background:var(--s2);color:var(--di);font-size:10px;cursor:pointer;transition:all .12s"
              onmouseover="this.style.borderColor='var(--bl2)';this.style.color='var(--bl2)'"
              onmouseout="this.style.borderColor='var(--b1)';this.style.color='var(--di)'">\${v} MiB</button>\`).join('')}
        </div>
      </div>\`;
    fetch('/api/settings').then(r=>r.json()).then(d=>{
      const el=document.getElementById('set-blimit');
      if(el) el.value=String(d.bodyLimitMiB||64);
    }).catch(()=>{});
  }
  else if(sbScreen==='providers'){
    title.textContent='Providers';
    const entryIds=['anthropic','openai','google','copilot','antigravity'];
    const cloudIds=['kiro','vertex','ollama','opencode'];
    const entryDefs=PDEFS.filter(p=>entryIds.includes(p.id));
    const cloudDefs=PDEFS.filter(p=>cloudIds.includes(p.id));
    const freeKeyDefs=PDEFS.filter(p=>!entryIds.includes(p.id)&&!cloudIds.includes(p.id)&&p.methods.some(m=>m.id==='apikey'));
    const freeNoAuthDefs=PDEFS.filter(p=>!entryIds.includes(p.id)&&!cloudIds.includes(p.id)&&p.methods.every(m=>m.id==='local'));
    function entryCard(p){
      return \`<div class="pc-e" onclick="sbGoToAdd('\${p.id}')">
        <div class="pc-e-hd">
          <div class="pc-e-ic" style="background:\${p.ibg}">\${providerImg(p.id,16)}</div>
          <span class="pc-e-nm">\${p.name}</span>
        </div>
        <div class="pc-e-ft">
          <span class="pc-e-sb">\${p.sub}</span>
          <button class="pc-e-add" onclick="event.stopPropagation();sbGoToAdd('\${p.id}')">+ Add</button>
        </div>
      </div>\`;
    }
    function smCard(p){
      return \`<div class="pc-sm" onclick="sbGoToAdd('\${p.id}')">
        <div class="pc-sm-ic" style="background:\${p.ibg}">\${providerImg(p.id,14)}</div>
        <span class="pc-sm-nm">\${p.name}</span>
      </div>\`;
    }
    const connectedHtml=renderConnectedAccounts();
    const hasConnected=ST.accounts.length>0||ST.ollamaRunning;
    body.innerHTML=\`
      \${hasConnected?\`<div class="sb-section">Connected</div>\${connectedHtml}<div class="sb-sep"></div>\`:''}
      <div class="sb-section">Entry-Level</div>
      <div class="pg-entry">\${entryDefs.map(entryCard).join('')}</div>
      <div class="sb-section">Cloud / Local</div>
      <div class="pg-entry">\${cloudDefs.map(entryCard).join('')}</div>
      <div class="sb-sep"></div>
      <div class="sb-section">Free Tier — API Key (\${freeKeyDefs.length})</div>
      <div class="pg-sm">\${freeKeyDefs.map(smCard).join('')}</div>
      \${freeNoAuthDefs.length?\`
      <div class="sb-sep"></div>
      <div class="sb-section">Free Tier — No Auth (\${freeNoAuthDefs.length})</div>
      <div class="pg-sm">\${freeNoAuthDefs.map(smCard).join('')}</div>\`:''}
      \${!hasConnected?\`<div class="sb-sep"></div><div class="sb-section">Connected</div>\${connectedHtml}\`:''}
      \`;
  }
  else if(sbScreen==='add-type'){
    title.textContent='Add '+sbAddingDef.name;
    const methods=sbAddingDef.methods;
    const keyUrl=sbAddingDef.apiKeyUrl;
    const hasApiKey=methods.some(m=>m.id==='apikey');
    body.innerHTML=\`
      <div style="padding:10px 14px 6px;font-size:11px;color:var(--mu)">Choose how to connect:</div>
      <div class="auth-cards">
        \${methods.map(m=>\`
          <div class="auth-card" onclick="sbGoToMethod('\${m.id}')">
            <div class="auth-card-hdr">
              <span class="auth-card-ic">\${methodIcon(m.id)}</span>
              <span class="auth-card-name">\${m.name}</span>
            </div>
            <div class="auth-card-sub">\${m.desc}</div>
          </div>\`).join('')}
      </div>
      \${keyUrl&&hasApiKey?\`<div style="padding:4px 14px 12px;display:flex;align-items:center;gap:6px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;color:var(--mu)"><circle cx="7.5" cy="14.5" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M10 12l8-8m-1 1l3 3m-6 0l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span style="font-size:10px;color:var(--mu)">Need an API key?</span>
        <a href="\${keyUrl}" target="_blank" rel="noopener noreferrer"
          style="font-size:10px;color:var(--bl2);text-decoration:none;display:inline-flex;align-items:center;gap:3px"
          onmouseover="this.style.color='#a5b4fc'" onmouseout="this.style.color='var(--bl2)'">
          Get one here
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>\`:''}\`;
  }
  else if(sbScreen==='add-method'){
    const m=sbAddingMethod;
    title.textContent=m.name;
    let warn=m.warn?\`<div class="auth-warn">\${m.warn}</div>\`:'';

    if(m.id==='oauth'){
      body.innerHTML=\`\${warn}
        <div class="auth-form">
          <div class="form-label">Account label (optional)</div>
          <input class="form-input" id="f-label" placeholder="\${sbAddingDef.name} Account" value="\${sbAddingDef.name}"/>
          <div class="form-actions">
            <button class="form-cancel" onclick="sbGoBack()">Cancel</button>
            <button class="form-submit" onclick="doOAuth()">\${SVG_ICONS.login} Open Login</button>
          </div>
        </div>\`;
    }
    else if(m.id==='apikey'){
      const ph=sbAddingDef.id==='anthropic'?'sk-ant-...'
               :sbAddingDef.id==='openai'?'sk-...'
               :sbAddingDef.id==='google'?'AIza...':'';
      body.innerHTML=\`\${warn}
        <div class="auth-form">
          <div class="form-label">Account label</div>
          <input class="form-input" id="f-label" placeholder="\${sbAddingDef.name} Account" value="\${sbAddingDef.name}"/>
          <div class="form-label">API Key</div>
          <input class="form-input" id="f-key" type="password" placeholder="\${ph}"/>
          <div class="form-actions">
            <button class="form-cancel" onclick="sbGoBack()">Cancel</button>
            <button class="form-submit" onclick="doApiKey()">Connect</button>
          </div>
        </div>\`;
      setTimeout(()=>document.getElementById('f-key')?.focus(),50);
    }
    else if(m.id==='session'){
      const site=sbAddingDef.id==='anthropic'?'claude.ai':'chatgpt.com';
      body.innerHTML=\`\${warn}
        <div style="padding:0 14px 10px;font-size:10px;color:var(--mu);line-height:1.6">
          Open DevTools > Application > Cookies > \${site} > copy session token.
        </div>
        <div class="auth-form">
          <div class="form-label">Account label</div>
          <input class="form-input" id="f-label" placeholder="\${sbAddingDef.name} Account" value="\${sbAddingDef.name}"/>
          <div class="form-label">Session Token</div>
          <input class="form-input" id="f-ses" type="password" placeholder="Paste token"/>
          <div class="form-actions">
            <button class="form-cancel" onclick="sbGoBack()">Cancel</button>
            <button class="form-submit" onclick="doSession()">Connect</button>
          </div>
        </div>\`;
      setTimeout(()=>document.getElementById('f-ses')?.focus(),50);
    }
    else if(m.id==='local'){
      body.innerHTML=\`
        <div class="auth-form">
          <div class="form-label">Account label</div>
          <input class="form-input" id="f-label" placeholder="Ollama Local" value="Ollama Local"/>
          <div class="form-label">Ollama base URL</div>
          <input class="form-input" id="f-url" placeholder="http://localhost:11434" value="\${ST.ollamaBaseUrl||'http://localhost:11434'}"/>
          <div class="form-actions">
            <button class="form-cancel" onclick="sbGoBack()">Cancel</button>
            <button class="form-submit" onclick="doLocal()">Add Ollama</button>
          </div>
        </div>\`;
    }
  }
  else if(sbScreen==='oauth-device'){
    const d=sbOAuthDevice||{};
    title.textContent='Enter GitHub Code';
    const mins=d.expiresIn?Math.max(1,Math.ceil((d.expiresIn*1000-(Date.now()-(d.startedAt||Date.now())))/60000)):10;
    body.innerHTML=\`
      <div class="auth-form">
        <div class="form-label">GitHub verification code</div>
        <input class="form-input" style="font-size:22px;letter-spacing:2px;text-align:center;font-weight:800;color:var(--fg);font-family:ui-monospace,monospace" value="\${d.userCode||''}" readonly onclick="this.select()"/>
        <div style="font-size:10px;color:var(--mu);line-height:1.5;margin-top:4px">
          Enter this code on the GitHub device page. rcodex will connect automatically after approval.
        </div>
        <div class="form-actions" style="flex-wrap:wrap">
          <button class="form-cancel" onclick="copyOAuthCode()">Copy Code</button>
          <button class="form-submit" onclick="openOAuthDevicePage()">Open GitHub</button>
        </div>
        <div style="font-size:10px;color:var(--mu);padding-top:8px">Waiting for approval · expires in ~\${mins}m</div>
      </div>\`;
  }
}

function renderConnectedAccounts(){
  const all=[...ST.accounts];
  if(!all.length&&!ST.ollamaRunning){
    return \`<div style="padding:12px 16px;font-size:10px;color:var(--mu)">No accounts connected yet.</div>\`;
  }
  const methodLabel={apikey:'API Key','oauth-official':'OAuth','oauth-unofficial':'Session',local:'Local'};
  let html=\`<div class="acc-grid">\`+all.map(a=>{
    const models=a.models||[];
    const activeSlots=(a.activeModels||[]).length;
    const canvasCount=Object.values(nodeSlots).filter(s=>s.accountId===a.id).length;
    const sub=accountSubtext(a);
    if(!sidebarModelSel[a.id]&&models.length) sidebarModelSel[a.id]=models[0];
    const curSel=sidebarModelSel[a.id]||'';
    const statusTxt=activeSlots?\`<span style="color:var(--gr)">\${activeSlots} active</span>\`:canvasCount?\`\${canvasCount} on canvas\`:'idle';
    const modelPicker=models.length
      ?\`<select class="msel" style="flex:1;font-size:10px;padding:3px 5px"
            onchange="sidebarModelSel['\${a.id}']=this.value">
          \${models.map(m=>\`<option value="\${m}"\${m===curSel?' selected':''}>\${m}</option>\`).join('')}
         </select>\`
      :\`<div style="flex:1;font-size:10px;color:var(--mu)">No models</div>\`;
    return \`<div class="acc-card">
      <div class="acc-card-hd">
        <div class="acc-ic" style="background:\${IBGS[a.provider]||'rgba(96,96,128,.1)'};width:26px;height:26px;border-radius:7px;flex-shrink:0">\${providerImg(a.provider,14)}</div>
        <div class="acc-card-info">
          <div class="acc-card-nm">\${accountName(a)}</div>
          <div class="acc-card-sb">\${methodLabel[a.method]||a.method} · \${statusTxt}</div>
          \${sub?\`<div class="acc-card-sb" style="opacity:.6;font-size:8px">\${sub}</div>\`:''}
        </div>
        <button class="del-btn" onclick="deleteAccount('\${a.id}')" title="Delete">\${SVG_ICONS.close}</button>
      </div>
      <div class="acc-card-ft">
        \${modelPicker}
        <button class="add-btn" style="padding:3px 8px;font-size:9px" onclick="addToCanvas('\${a.id}')">+ Canvas</button>
      </div>
    </div>\`;
  }).join('')+\`</div>\`;
  if(ST.ollamaRunning&&!ST.accounts.find(a=>a.provider==='ollama')){
    html+=\`<div style="padding:4px 12px 8px;font-size:10px;color:var(--mu)">
      Ollama is running — <button onclick="sbGoToAdd('ollama')" style="background:none;border:none;color:var(--bl2);cursor:pointer;font-size:10px">add account</button>
    </div>\`;
  }
  return html;
}

function sbGoTo(screen){ sbScreen=screen; renderSb(); }
function saveBodyLimit(){
  const el=document.getElementById('set-blimit');
  const msg=document.getElementById('set-blimit-msg');
  if(!el) return;
  const v=parseInt(el.value,10);
  if(!v||v<1||v>1024){el.style.borderColor='var(--rd)';setTimeout(()=>el.style.borderColor='',1500);return;}
  fetch('/api/settings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({bodyLimitMiB:v})})
    .then(r=>r.json()).then(d=>{
      if(d.ok&&msg){msg.style.display='';setTimeout(()=>{if(msg)msg.style.display='none';},2000);}
    }).catch(()=>{if(el)el.style.borderColor='var(--rd)';setTimeout(()=>{if(el)el.style.borderColor='';},1500);});
}
function sbGoToAdd(providerId){
  sbAddingDef=PDEFS.find(p=>p.id===providerId);
  sbScreen='add-type';
  renderSb();
}
function sbGoToMethod(methodId){
  sbAddingMethod=sbAddingDef.methods.find(m=>m.id===methodId);
  sbScreen='add-method';
  renderSb();
}

// Auth actions
async function doApiKey(){
  const label=document.getElementById('f-label')?.value.trim()||sbAddingDef.name;
  const key=document.getElementById('f-key')?.value.trim();
  if(!key){toast('API key is required',true);return}
  const r=await api('POST','/api/accounts',{provider:sbAddingDef.id,label,method:'apikey',apiKey:key});
  if(!r.ok){toast('Error: '+await r.text(),true);return}
  toast(label+' connected');
  sbScreen='providers';
  await fetchStatus();
  renderSb();
}
async function doSession(){
  const label=document.getElementById('f-label')?.value.trim()||sbAddingDef.name;
  const ses=document.getElementById('f-ses')?.value.trim();
  if(!ses){toast('Session token is required',true);return}
  const method=sbAddingDef.id==='anthropic'?'oauth-unofficial':'oauth-unofficial';
  const r=await api('POST','/api/accounts',{provider:sbAddingDef.id,label,method,sessionToken:ses});
  if(!r.ok){toast('Error: '+await r.text(),true);return}
  toast(label+' connected');
  sbScreen='providers';
  await fetchStatus();
  renderSb();
}
async function doOAuth(){
  const label=document.getElementById('f-label')?.value.trim()||sbAddingDef.name;
  const endpoint=sbAddingDef.id==='anthropic'?'/api/oauth/anthropic/start'
    :sbAddingDef.id==='antigravity'?'/api/oauth/antigravity/start'
    :sbAddingDef.id==='copilot'?'/api/oauth/copilot/start'
    :'/api/oauth/openai/start';
  const r=await api('POST',endpoint,{label});
  if(!r.ok){toast('Error starting OAuth',true);return}
  const d=await r.json();
  window.open(d.authUrl,'_blank','width=600,height=700');
  if(d.userCode){
    sbOAuthDevice={provider:sbAddingDef.id,label,authUrl:d.authUrl,userCode:d.userCode,expiresIn:d.expiresIn,startedAt:Date.now()};
    try{await navigator.clipboard?.writeText(d.userCode);}catch{}
    toast('GitHub code: '+d.userCode+' (copied if allowed)');
    sbScreen='oauth-device';
    renderSb();
    pollNewAccount(0,ST.accounts.length);
    return;
  }else{
    toast('Complete login in the opened window');
  }
  sbScreen='providers';
  renderSb();
  pollNewAccount(0,ST.accounts.length);
}
async function copyOAuthCode(){
  if(!sbOAuthDevice?.userCode)return;
  try{await navigator.clipboard?.writeText(sbOAuthDevice.userCode);toast('Code copied');}
  catch{toast('Copy failed - select the code manually',true);}
}
function openOAuthDevicePage(){
  if(sbOAuthDevice?.authUrl)window.open(sbOAuthDevice.authUrl,'_blank','width=600,height=700');
}
async function doLocal(){
  const label=document.getElementById('f-label')?.value.trim()||'Ollama Local';
  const url=document.getElementById('f-url')?.value.trim()||'http://localhost:11434';
  await api('POST','/api/ollama/config',{baseUrl:url});
  const r=await api('POST','/api/accounts',{provider:'ollama',label,method:'local'});
  if(!r.ok){toast('Error: '+await r.text(),true);return}
  toast(label+' added');
  sbScreen='providers';
  await fetchStatus();
  renderSb();
}
function pollNewAccount(n,prevCount){
  if(n>180){toast('OAuth timed out - no account detected. Check terminal logs.',true);return;}
  setTimeout(async()=>{
    await fetchStatus();
    renderSb();
    if(ST.oauthError){
      toast('Login failed: '+ST.oauthError,true);
      return;
    }
    if(ST.accounts.length>prevCount){
      const newAcc=ST.accounts.slice(-1)[0];
      toast((newAcc?.label||'Account')+' connected!');
      sbOAuthDevice=null;
      if(sbScreen==='oauth-device')sbScreen='providers';
      renderSb();
      return;
    }
    pollNewAccount(n+1,prevCount);
  },4000);
}

// Account / slot management
async function deleteAccount(id){
  // Remove all canvas nodes belonging to this account
  for(const [slotId,info] of Object.entries(nodeSlots)){
    if(info.accountId===id){ onCanvas.delete(slotId); delete nodeSlots[slotId]; delete NP[slotId]; }
  }
  saveLS();
  const r=await api('DELETE',\`/api/accounts/\${id}\`);
  if(!r.ok){toast('Delete failed: '+await r.text(),true);await fetchStatus();return;}
  toast('Account removed');
  await fetchStatus();
}

function addToCanvas(accountId){
  const acc=ST.accounts.find(a=>a.id===accountId);
  if(!acc)return;
  const models=acc.models||[];
  const model=sidebarModelSel[accountId]||models[0]||'';
  const slotId='slot_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  hiddenSlots.delete(slotId);
  nodeSlots[slotId]={accountId,model};
  onCanvas.add(slotId);
  if(!NP[slotId]){
    const ws=document.getElementById('ws');
    const wr=ws.getBoundingClientRect();
    const cx=(wr.width/2-vp.x)/vp.s,cy=(wr.height/2-vp.y)/vp.s;
    const off=([...onCanvas].length-1)*28;
    NP[slotId]={x:Math.max(20,cx-107+off),y:Math.max(20,cy-90+off)};
  }
  saveLS();
  render();
  renderSb();
}

async function removeFromCanvas(slotId){
  const info=nodeSlots[slotId];
  onCanvas.delete(slotId);
  hiddenSlots.add(slotId);
  delete NP[slotId];
  delete nodeSlots[slotId];
  saveLS();
  render();
  if(sbOpen)renderSb();
  if(info){
    const acc=ST.accounts.find(a=>a.id===info.accountId);
    const slot=(acc?.activeModels||[]).find(s=>s.slotId===slotId);
    if(slot){
      const r=await api('DELETE',\`/api/accounts/\${info.accountId}/slots/\${slotId}\`);
      if(!r.ok)toast('Remove failed: '+await r.text(),true);
      await fetchStatus();
    }
  }
}

// Pi agent panel
let piOpen = false;
let piTerm = null;
let piWs = null;
let piFit = null;
if(!NP.piNode) NP.piNode = { x: 60, y: 60 };
if(!NP.piSize) NP.piSize = { w: 780, h: 480 };
let piConns = new Set(JSON.parse(localStorage.getItem('rcodex-pi-conns')||'[]'));
let piMaximized = false;
function savePiConns(){ localStorage.setItem('rcodex-pi-conns', JSON.stringify([...piConns])); }

function piCmd(){ return 'pi'; }

function togglePi(){
  piOpen = !piOpen;
  document.getElementById('hb-pi')?.classList.toggle('on', piOpen);
  if(!piOpen && piMaximized){
    piMaximized = false;
    document.getElementById('nd-pi')?.remove();
  }
  render();
  if(piOpen && !piTerm) initPiTerminal();
}

async function initPiTerminal(){
  // Ensure pi-loading is in DOM (built by buildPiNode → render above)
  let loading = document.getElementById('pi-loading');
  if(!loading){
    loading = document.createElement('div');
    loading.id = 'pi-loading';
    loading.className = 'pi-loading';
    loading.innerHTML = '<div class="pi-spin"></div><div id="pi-loading-msg" style="font-size:12px;color:#6b7280">Checking Pi installation…</div>';
    document.getElementById('nd-pi')?.appendChild(loading);
  }
  const msg = loading.querySelector('#pi-loading-msg') || loading.lastElementChild;
  loading.style.display = 'flex';

  msg.textContent = 'Checking Pi installation…';
  let installed = false;
  try{
    const r = await api('GET', '/api/pi/status');
    const d = await r.json();
    installed = d.installed;
  }catch{}

  if(!installed){
    msg.textContent = 'Installing Pi… (npm install -g @earendil-works/pi-coding-agent)';
    try{
      const r = await api('POST', '/api/terminal/exec', { cmd: 'npm install -g @earendil-works/pi-coding-agent' });
      const d = await r.json();
      if(d.stderr && !d.stdout){ msg.textContent = 'Install failed: ' + d.stderr.slice(0,120); return; }
    }catch(e){ msg.textContent = 'Install error: ' + e.message; return; }
  }

  try{ await api('POST', '/api/pi/sync-models'); }catch{}
  loading.style.display = 'none';
  connectPiPty(piCmd());
}

function connectPiPty(initialCmd){
  // Reuse existing #pi-term-wrap element or find the slot placeholder
  let wrap = document.getElementById('pi-term-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'pi-term-wrap';
    wrap.className = 'pi-term-wrap';
    const slot = document.getElementById('pi-term-slot');
    if(slot) slot.replaceWith(wrap); else document.getElementById('nd-pi')?.appendChild(wrap);
  }
  if(piTerm){ piTerm.dispose(); piTerm = null; }
  if(piWs){ try{ piWs.close(); }catch{} piWs = null; }

  const term = new Terminal({
    theme:{ background:'#0d0d0f', foreground:'#e4e4e7', cursor:'#818cf8', selectionBackground:'rgba(129,140,248,.3)' },
    fontFamily:'Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize:13, lineHeight:1.5, cursorBlink:true, scrollback:5000,
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(wrap);
  fit.fit();
  piTerm = term; piFit = fit;

  const wsUrl = \`ws://\${location.host}/api/pty?cols=\${term.cols}&rows=\${term.rows}&cmd=\${encodeURIComponent(initialCmd||'')}\`;
  const ws = new WebSocket(wsUrl);
  piWs = ws;
  ws.onmessage = e => term.write(typeof e.data === 'string' ? e.data : new Uint8Array(e.data));
  ws.onclose = () => { term.write('\\r\\n\\x1b[90m[session ended]\\x1b[0m\\r\\n'); render(); };
  ws.onerror = () => { term.write('\\r\\n\\x1b[31m[connection error]\\x1b[0m\\r\\n'); };
  term.onData(d => { if(ws.readyState === WebSocket.OPEN) ws.send(d); });
  term.onResize(({cols,rows}) => { if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'resize',cols,rows})); });

  const ro = new ResizeObserver(() => { if(piFit) piFit.fit(); });
  ro.observe(wrap);
}

function sendToPi(cmd){
  if(piWs && piWs.readyState === WebSocket.OPEN) piWs.send(cmd + '\\r');
}

function restartPi(){
  if(piTerm){ piTerm.dispose(); piTerm = null; }
  if(piWs){ try{ piWs.close(); }catch{} piWs = null; }
  const l = document.getElementById('pi-loading');
  if(l) l.style.display = 'none';
  connectPiPty(piCmd());
}

async function resetPi(){
  try{
    const r = await api('POST', '/api/pi/reset');
    const d = await r.json();
    toast('Pi reset: ' + (d.removed.length ? d.removed.join(', ') + ' removed' : 'nothing to clear'));
  }catch(e){ toast('Reset failed', true); return; }
  restartPi();
}

// Pi canvas node (full terminal node inside #world)
function buildPiNode(){
  if(!piOpen || piMaximized) return '';
  const pos = NP.piNode || { x:60, y:60 };
  const sz  = NP.piSize  || { w:780, h:480 };
  const running = piWs && piWs.readyState === WebSocket.OPEN;
  const dot = running
    ? \`<span style="width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block;margin-right:5px;flex-shrink:0"></span>\`
    : \`<span style="width:7px;height:7px;border-radius:50%;background:#6b7280;display:inline-block;margin-right:5px;flex-shrink:0"></span>\`;
  const connSlots = [...piConns].map(slotId=>{
    const info = nodeSlots[slotId];
    if(!info) return null;
    const acc = ST.accounts.find(a=>a.id===info.accountId);
    return acc ? {slotId, model: info.model, acc} : null;
  }).filter(Boolean);
  const hasConns = connSlots.length > 0;
  const portLive = hasConns ? ' live' : '';
  const connHtml = hasConns
    ? connSlots.map(({slotId,model,acc})=>\`<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(0,0,0,.25);border-radius:5px;padding:1px 5px 1px 3px;font-size:9px;color:#9090b0;margin-right:3px">
        <span style="width:5px;height:5px;border-radius:50%;background:\${COL[acc.provider]||'#818cf8'};flex-shrink:0"></span>\${model||'(auto)'}
        <button onclick="removePiConn('\${slotId}')" style="background:none;border:none;color:#555;cursor:pointer;font-size:9px;padding:0;line-height:1;margin-left:1px">✕</button>
      </span>\`).join('')
    : \`<span style="color:#444;font-size:9px">Drop node to connect</span>\`;
  return \`<div class="nd mn" id="nd-pi" style="left:\${pos.x}px;top:\${pos.y}px;width:\${sz.w}px">
  <div class="pi-nd-port\${portLive}" id="pi-nd-port" title="Drop account node here"></div>
  <div class="nh" id="pi-nd-hdr" style="cursor:grab">
    <div class="nic" style="background:rgba(129,140,248,.15)">
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 11V3l4 5 4-5v8" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-size:11px;font-weight:600;color:#e0e0f0;display:flex;align-items:center">\${dot}Pi Agent</div>
      <div style="font-size:9px;margin-top:1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">\${connHtml}</div>
    </div>
    <button class="nd-rm" style="font-size:14px;width:22px;height:22px" onclick="togglePiMax()" title="Fullscreen">⛶</button>
    <button class="nd-rm" onclick="togglePi()" title="Close">×</button>
  </div>
  <div id="pi-term-slot" style="height:\${sz.h}px;overflow:hidden;background:#0d0d0f;border-radius:0 0 12px 12px"></div>
  <div id="pi-loading-slot"></div>
  <div class="mn-rs-e" onpointerdown="startPiResize(event,'e')"></div>
  <div class="mn-rs-s" onpointerdown="startPiResize(event,'s')"></div>
  <div class="mn-rs-se" onpointerdown="startPiResize(event,'se')"></div>
</div>\`;
}

async function connectPi(slotId){
  const info = nodeSlots[slotId];
  if(!info){ toast('Slot not found', true); return; }
  const r = await api('POST', '/api/pi/connect', { accountId: info.accountId, model: info.model });
  if(!r.ok){ toast('Pi connect failed', true); return; }
  piConns.add(slotId);
  savePiConns();
  await api('POST', '/api/pi/sync-models');
  render();
  const modelName = info.model || '(model)';
  toast((piWs && piWs.readyState === WebSocket.OPEN)
    ? modelName + ' added — use /model in Pi to select'
    : 'Connected to Pi Agent: ' + modelName);
}
async function removePiConn(slotId){
  const info = nodeSlots[slotId];
  if(info) await api('DELETE', '/api/pi/connect/' + info.accountId + (info.model ? '?model=' + encodeURIComponent(info.model) : ''));
  piConns.delete(slotId);
  savePiConns();
  await api('POST', '/api/pi/sync-models');
  render();
}

function togglePiMax(){
  piMaximized = !piMaximized;
  const nd = document.getElementById('nd-pi');
  if(!nd) return;
  if(piMaximized){
    // Move out of #world so position:fixed works correctly (bypasses CSS zoom)
    nd.style.position = 'fixed';
    nd.style.inset = '0';
    nd.style.width = '100vw';
    nd.style.height = '100vh';
    nd.style.borderRadius = '0';
    nd.style.zIndex = '200';
    document.body.appendChild(nd);
  } else {
    // Move back into #world
    nd.style.position = '';
    nd.style.inset = '';
    nd.style.width = NP.piSize.w + 'px';
    nd.style.height = '';
    nd.style.borderRadius = '';
    nd.style.zIndex = '';
    nd.style.left = NP.piNode.x + 'px';
    nd.style.top  = NP.piNode.y + 'px';
    document.getElementById('world').appendChild(nd);
    // Restore term slot ← wrap preserved, re-slot via render
    render();
  }
  if(piFit) setTimeout(()=>piFit.fit(), 80);
}

function startPiResize(e,dir){
  e.preventDefault();e.stopPropagation();
  const sz=NP.piSize||{w:780,h:480};
  piResizeD={dir,sx:e.clientX,sy:e.clientY,w0:sz.w,h0:sz.h};
}

// ChatGPT panel toggle
function toggleCgpt(){
  cgptOpen = !cgptOpen;
  const panel = document.getElementById('cgpt-panel');
  const ws = document.getElementById('ws');
  const btn = document.getElementById('hb-cgpt');
  if(cgptOpen){
    panel.style.display='flex';
    ws.style.display='none';
    btn?.classList.add('on');
    const frame = document.getElementById('cgpt-frame');
    if(frame && (!frame.src || frame.src === window.location.href)){
      frame.src = 'https://chatgpt.com/';
      setTimeout(()=>{
        try{
          const blocked = !frame.contentDocument || frame.contentDocument.URL==='about:blank';
          if(blocked) document.getElementById('cgpt-blocked').style.display='flex';
        }catch(e){
          // cross-origin = iframe loaded fine
        }
      }, 4000);
    }
  } else {
    panel.style.display='none';
    ws.style.display='';
    btn?.classList.remove('on');
  }
}

// Monitor node
function toggleMonitor(tab){
  if(monitorOpen && monitorTab===tab){ monitorOpen=false; }
  else{ monitorOpen=true; monitorTab=tab; if(!NP.monitor) NP.monitor={x:80,y:60}; }
  document.getElementById('hb-mon')?.classList.toggle('on', monitorOpen);
  render();
  if(monitorOpen) startMonitorRefresh();
  else stopMonitorRefresh();
}

function startMonitorRefresh(){
  stopMonitorRefresh();
  if(monitorTab==='status') refreshStatus();
  else if(monitorTab==='logs') refreshLogs(true);
  else if(monitorTab==='requests') refreshRequests();
  else if(monitorTab==='usage') refreshUsage();
  monitorRefreshTimer=setInterval(()=>{
    if(!monitorOpen){stopMonitorRefresh();return;}
    if(monitorTab==='status') refreshStatus();
    else if(monitorTab==='logs') refreshLogs();
    else if(monitorTab==='requests') refreshRequests();
    else if(monitorTab==='usage') refreshUsage();
  },3000);
}
function stopMonitorRefresh(){if(monitorRefreshTimer){clearInterval(monitorRefreshTimer);monitorRefreshTimer=null;}}

async function clearMonitor(){
  if(monitorTab==='logs'){
    await api('DELETE','/api/logs');
    const body=document.getElementById('mn-logs-body');
    if(body)body.innerHTML='<div class="mn-empty">Cleared</div>';
  }else if(monitorTab==='requests'){
    await api('DELETE','/api/requests');
    lastReqData=null;
    const body=document.getElementById('mn-reqs-body');
    if(body)body.innerHTML='<div class="mn-empty">Cleared</div>';
  }
}

function switchMonitorTab(tab){
  monitorTab=tab;
  render();
  startMonitorRefresh();
}

function startMonitorResize(e,dir){
  e.preventDefault();e.stopPropagation();
  const sz=NP.monitorSize||{w:620,h:320};
  resizeD={dir,sx:e.clientX,sy:e.clientY,w0:sz.w,h0:sz.h};
}
function buildMonitorNode(){
  const pos=NP.monitor||{x:80,y:60};
  const sz=NP.monitorSize||{w:620,h:320};
  const tabs=['status','logs','requests','usage'];
  const labels={status:'Status',logs:'Logs',requests:'Requests',usage:'Usage'};
  const icons={
    status:'<svg width="11" height="11" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    logs:'<svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M2 7h7M2 10.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    requests:'<svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M2.5 7h6M2.5 9.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="11" cy="9.5" r="2" stroke="currentColor" stroke-width="1.2"/></svg>',
    usage:'<svg width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="8" width="2.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="5.75" y="5" width="2.5" height="7.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="10" y="2" width="2.5" height="10.5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>',
  };
  const clearBtn=(monitorTab==='logs'||monitorTab==='requests')
    ?\`<button onclick="clearMonitor()" style="margin:4px 8px;padding:2px 9px;border-radius:5px;border:1px solid var(--b2);background:rgba(239,68,68,.08);color:#f87171;font-size:9px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .12s" onmouseover="this.style.background='rgba(239,68,68,.18)'" onmouseout="this.style.background='rgba(239,68,68,.08)'">Clear</button>\`
    :'';
  const tabHtml=tabs.map(t=>\`<div class="mn-t \${monitorTab===t?'on':''}" onclick="switchMonitorTab('\${t}')">\${icons[t]} \${labels[t]}</div>\`).join('')+
    \`<div style="flex:1"></div>\${clearBtn}\`;

  let content='',inputRow='';
  if(monitorTab==='status'){
    content=\`<div id="mn-status-body"><div class="mn-empty">Loading</div></div>\`;
  } else if(monitorTab==='logs'){
    content=\`<div class="log-wrap" id="mn-logs-body"><div class="mn-empty">Loading</div></div>\`;
  } else if(monitorTab==='requests'){
    content=\`<div class="req-wrap" id="mn-reqs-body"><div class="mn-empty">Loading</div></div>\`;
  } else if(monitorTab==='usage'){
    content=\`<div id="mn-usage-body">\${usageHtmlCache||'<div class="mn-empty">Loading</div>'}</div>\`;
  }

  return \`<div class="nd mn" id="nd-monitor" style="left:\${pos.x}px;top:\${pos.y}px;width:\${sz.w}px">
  <div class="nh" style="border-radius:13px 13px 0 0;cursor:grab">
    <div class="nic" style="background:rgba(99,102,241,.15);font-size:11px">\${SVG_ICONS.terminal}</div>
    <span class="nn">Monitor</span>
    <button class="nd-rm" onclick="toggleMonitor(monitorTab)" title="Close">×</button>
  </div>
  <div class="mn-tabbar">\${tabHtml}</div>
  <div class="mn-body last" id="mn-body" style="height:\${sz.h}px">\${content}</div>
  <div class="mn-rs-e" onpointerdown="startMonitorResize(event,'e')"></div>
  <div class="mn-rs-s" onpointerdown="startMonitorResize(event,'s')"></div>
  <div class="mn-rs-se" onpointerdown="startMonitorResize(event,'se')"></div>
</div>\`;
}

function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Status / Logs / Requests refresh
async function refreshStatus(){
  const body=document.getElementById('mn-status-body');
  if(!body)return;
  try{
    const d=await(await fetch('/api/status')).json();
    const upSec=Math.floor(d.uptimeMs/1000);
    const upStr=upSec<60?\`\${upSec}s\`:upSec<3600?\`\${Math.floor(upSec/60)}m\`:\`\${Math.floor(upSec/3600)}h \${Math.floor((upSec%3600)/60)}m\`;
    const provHtml=(d.connectedProviders||[]).map(p=>\`
      <div class="st-pr">
        <span style="width:8px;height:8px;border-radius:50%;background:\${COL[p.provider]||'#888'};flex-shrink:0;display:inline-block"></span>
        <span style="font-weight:600">\${p.label}</span>
        <span style="color:var(--mu)">\${p.model}</span>
      </div>\`).join('');
    body.innerHTML=\`
      <div class="st-grid">
        <div class="st-card"><div class="st-val">:\${d.port}</div><div class="st-key">Port</div></div>
        <div class="st-card"><div class="st-val">\${d.connectedCount}</div><div class="st-key">Connected</div></div>
        <div class="st-card"><div class="st-val">\${upStr}</div><div class="st-key">Uptime</div></div>
      </div>
      \${provHtml?\`<div class="st-prov">\${provHtml}</div>\`:''}
    \`;
  }catch{body.innerHTML='<div class="mn-empty">Failed to load</div>';}
}

function preserveScrollTop(_body,render){
  // Requests: newest at top ??restore mn-body scroll position after innerHTML reset
  const scroller=document.getElementById('mn-body');
  const saved=scroller?scroller.scrollTop:0;
  render();
  if(scroller) requestAnimationFrame(()=>{ scroller.scrollTop=saved; });
}

async function refreshLogs(forceBottom=false){
  const body=document.getElementById('mn-logs-body');
  const scroller=document.getElementById('mn-body');
  if(!body)return;
  // Snapshot scroll state before async fetch (so user scroll during fetch doesn't matter)
  const atBottom=forceBottom||!scroller||scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<40;
  try{
    const d=await(await fetch('/api/logs?n=120')).json();
    if(!d.lines?.length){body.innerHTML='<div class="mn-empty">No log entries yet</div>';return;}
    body.innerHTML=d.lines.map(l=>{
      const lower=String(l).toLowerCase(); const cls=lower.includes('error')?'err':lower.includes('warn')?'warn':lower.includes('[ok]')?'ok':'';
      return \`<div class="log-l \${cls}">\${escHtml(l)}</div>\`;
    }).join('');
    if(scroller&&atBottom) scroller.scrollTop=scroller.scrollHeight;
  }catch{body.innerHTML='<div class="mn-empty">Failed to load</div>';}
}

async function refreshRequests(){
  const body=document.getElementById('mn-reqs-body');
  const scroller=document.getElementById('mn-body');
  if(!body)return;
  const savedScroll=scroller?scroller.scrollTop:0;
  try{
    const d=await(await fetch('/api/requests')).json();
    if(!d.requests?.length){body.innerHTML='<div class="mn-empty">No requests yet</div>';return;}
    const hdr='<div class="req-row req-hdr"><span>Time</span><span>Provider</span><span>Model</span><span>Src</span><span>ms</span><span>Tokens</span><span></span></div>';
    const rows=d.requests.map((r,i)=>{
      const t=new Date(r.ts);
      const ts=t.toLocaleTimeString('en',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const stCls=r.status==='error'?'req-err':r.fallback?'req-fb':'req-ok';
      const col=COL[r.provider]||'#888';
      let modelLabel;
      if(r.failedModels?.length&&r.usedModel){
        const failedLines=r.failedModels.map(m=>\`<div style="opacity:.38;text-decoration:line-through;line-height:1.4">\${m}</div>\`).join('');
        modelLabel=failedLines+\`<div style="line-height:1.4">\${r.usedModel}</div>\`;
      } else if(r.failedModels?.length&&!r.usedModel){
        modelLabel=r.failedModels.map(m=>\`<div style="opacity:.5;text-decoration:line-through;line-height:1.4">\${m}</div>\`).join('');
      } else {
        modelLabel=r.usedModel||'-';
      }
      const tokensTxt=r.inputTokens!=null||r.outputTokens!=null
        ?\`<span style="color:#6ee7b7">\${r.inputTokens??0}</span>/<span style="color:#f9a8d4">\${r.outputTokens??0}</span>\`:'-';
      const hasDetail=!!(r.inputPreview||r.outputPreview||r.toolCalls?.length||r.toolCallDetails?.length||r.webFetches?.length||r.error);
      const detailId=\`req-detail-\${r.ts}\`;
      const detailBtn=hasDetail?\`<button class="req-expand-btn" onclick="toggleReqDetail('\${detailId}')" title="Show detail">+</button>\`:'';

      // Build detail panel
      let detailHtml='';
      if(hasDetail){
        const parts=[];
        if(r.inputPreview) parts.push(\`<div class="req-detail-section"><div class="req-detail-label">User</div><div class="req-detail-val">\${escHtml(r.inputPreview)}</div></div>\`);
        if(r.toolCallDetails?.length){
          const detailLines=r.toolCallDetails.map(tc=>{
            let argStr='';
            try{const p=JSON.parse(tc.args);const cmd=p.cmd??p.command??p.script??p.url??p.path;argStr=cmd?\` <span style="color:var(--mu)">\${escHtml(String(cmd))}</span>\`:\`<span style="color:var(--mu);font-size:9px"> \${escHtml(tc.args.slice(0,80))}</span>\`;}catch{argStr=tc.args?\`<span style="color:var(--mu);font-size:9px"> \${escHtml(tc.args.slice(0,80))}</span>\`:'';};
            return\`<code>\${escHtml(tc.name)}</code>\${argStr}\`;
          });
          parts.push(\`<div class="req-detail-section"><div class="req-detail-label">Tools called</div><div class="req-detail-val">\${detailLines.join('<br>')}</div></div>\`);
        } else if(r.toolCalls?.length) parts.push(\`<div class="req-detail-section"><div class="req-detail-label">Tools called</div><div class="req-detail-val">\${r.toolCalls.map(n=>\`<code>\${escHtml(n)}</code>\`).join(' ')}</div></div>\`);
        if(r.webFetches?.length) parts.push(\`<div class="req-detail-section"><div class="req-detail-label">Web fetched</div><div class="req-detail-val">\${r.webFetches.map(u=>\`<code>\${escHtml(u)}</code>\`).join('<br>')}</div></div>\`);
        if(r.outputPreview) parts.push(\`<div class="req-detail-section"><div class="req-detail-label">Model</div><div class="req-detail-val">\${escHtml(r.outputPreview)}</div></div>\`);
        if(r.error) parts.push(\`<div class="req-detail-section"><div class="req-detail-label" style="color:#f87171">Error</div><div class="req-detail-val" style="color:#f87171">\${escHtml(r.error)}</div></div>\`);
        detailHtml=\`<div id="\${detailId}" class="req-detail-panel" style="display:none">\${parts.join('')}</div>\`;
      }

      const srcBadge=r.source==='pi'
        ?\`<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#1e3a5f;color:#60a5fa;font-weight:600">Pi</span>\`
        :r.source==='codex'
        ?\`<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#2d1b69;color:#a78bfa;font-weight:600">Codex</span>\`
        :'';
      return \`<div style="flex-direction:column;display:flex;border-bottom:1px solid rgba(255,255,255,.035)">
        <div class="req-row \${stCls}-row" style="border-bottom:none">
          <span class="req-ts">\${ts}</span>
          <span class="req-prov" style="color:\${col}">\${r.provider||'-'}</span>
          <span class="req-model">\${modelLabel}</span>
          <span>\${srcBadge}</span>
          <span class="req-ms">\${r.ms}</span>
          <span>\${tokensTxt}</span>
          <span>\${detailBtn}</span>
        </div>
        \${detailHtml}
      </div>\`;
    }).join('');
    // Save which detail panels are open (by ts-based ID) before rebuilding
    const openIds=new Set([...body.querySelectorAll('.req-detail-panel')].filter(el=>el.style.display!=='none').map(el=>el.id));
    body.innerHTML=hdr+rows;
    if(scroller) scroller.scrollTop=savedScroll;
    // Restore open state after rebuild
    openIds.forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='block';const btn=el.previousElementSibling?.querySelector('.req-expand-btn');if(btn)btn.textContent='-';}});
  }catch{body.innerHTML='<div class="mn-empty">Failed to load</div>';}
}
function toggleReqDetail(id){
  const el=document.getElementById(id);
  if(!el)return;
  const btn=el.previousElementSibling?.querySelector('.req-expand-btn');
  if(el.style.display==='none'){el.style.display='block';if(btn)btn.textContent='-';}
  else{el.style.display='none';if(btn)btn.textContent='+';}
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Usage
const PRICING={
  'claude-opus-4-7':[15,75],'claude-opus-4-7-20250514':[15,75],'claude-opus-4-5':[15,75],
  'claude-sonnet-4-6':[3,15],'claude-sonnet-4-5':[3,15],
  'claude-haiku-4-5':[0.8,4],'claude-haiku-4-5-20251001':[0.8,4],
  'gpt-4o':[2.5,10],'gpt-4o-mini':[0.15,0.6],
  'gpt-4.1':[2,8],'gpt-4.1-mini':[0.4,1.6],'gpt-4.5':[75,150],
  'gpt-5':[15,60],'gpt-5.1':[15,60],'gpt-5.2':[15,60],'gpt-5.3':[15,60],'gpt-5.4':[15,60],'gpt-5.5':[15,60],
  'o3':[10,40],'o4-mini':[1.1,4.4],
  'gemini-2.5-pro':[1.25,10],'gemini-2.5-flash':[0.15,0.6],'gemini-2.0-flash':[0.1,0.4],
};
function getPrice(model){
  if(!model)return null;
  if(PRICING[model])return PRICING[model];
  const key=Object.keys(PRICING).find(k=>model.startsWith(k));
  return key?PRICING[key]:null;
}
function fmtCost(usd){
  if(usd==null)return'-';
  if(usd<0.0001)return'<$0.0001';
  if(usd<0.01)return'$'+usd.toFixed(4);
  return'$'+usd.toFixed(3);
}
function fmtTok(n){if(!n)return'-';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return String(n);}

function fmtReset(isoStr){
  if(isoStr==null||isoStr==='')return'';
  let t;
  if(typeof isoStr==='number'){
    t=isoStr<1e12?isoStr*1000:isoStr;
  }else if(/^\d+$/.test(String(isoStr))){
    const n=Number(isoStr);
    t=n<1e12?n*1000:n;
  }else{
    t=Date.parse(String(isoStr));
  }
  if(!Number.isFinite(t))return'';
  const diff=t-Date.now();
  if(diff<=0)return'<1m';
  const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);
  if(diff<3600000)return m+'m';
  if(diff<86400000)return h+'h '+m+'m';
  const d=Math.floor(diff/86400000);return d+'d '+(h%24)+'h';
}
function quotaBar(pct,col){
  const used=Math.min(100,Math.max(0,pct));
  const barCol=used>80?'#ef4444':used>50?'#f59e0b':col||'#6366f1';
  return\`<div style="flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden">
    <div style="height:100%;width:\${used}%;background:\${barCol};border-radius:3px;transition:width .4s"></div>
  </div>\`;
}
function quotaRow(label,used,resetsAt){
  const remaining=Math.max(0,100-used);
  const col=used>80?'#ef4444':used>50?'#f59e0b':'#6366f1';
  const reset=fmtReset(resetsAt);
  return\`<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
    <span title="\${escHtml(label)}" style="font-size:9px;color:var(--mu);width:72px;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0">\${escHtml(label)}</span>
    \${quotaBar(used,col)}
    <span style="font-size:9px;width:28px;text-align:right;flex-shrink:0;\${used>80?'color:#ef4444':used>50?'color:#f59e0b':''}">\${remaining}%</span>
    \${reset?\`<span style="font-size:9px;color:var(--mu);flex-shrink:0">reset: \${reset}</span>\`:''}
  </div>\`;
}

function renderUsage(){
  const body=document.getElementById('mn-usage-body');
  if(!body)return;

  // ?�?� Quota section ??built from ST.accounts + quotaState (no auto-fetch) ?�?�
  const oauthAccts=(ST.accounts||[]).filter(a=>a.method==='oauth-official'&&(a.provider==='anthropic'||a.provider==='openai'||a.provider==='antigravity'));
  let quotaHtml='';
  if(oauthAccts.length){
    const cards=oauthAccts.map(a=>{
      const qs=quotaState[a.id]||{data:null,loading:false};
      const icon=providerImg(a.provider,14);
      let rows='';
      if(qs.loading){
        rows=\`<div style="font-size:9px;color:var(--mu)">Fetching</div>\`;
      }else if(!qs.data){
        rows=\`<div style="font-size:9px;color:var(--mu);opacity:.5">Click refresh to load</div>\`;
      }else if(qs.data.unavailable){
        rows=\`<div style="font-size:9px;color:var(--mu);line-height:1.45">\${escHtml(qs.data.unavailable)}</div>\`;
      }else if(qs.data.error){
        rows=\`<div style="font-size:9px;color:var(--rd)">Error: \${qs.data.error}</div>\`;
      }else if(a.provider==='anthropic'){
        if(qs.data.five_hour!=null)rows+=quotaRow('5h',qs.data.five_hour.utilization,qs.data.five_hour.resets_at);
        if(qs.data.seven_day!=null)rows+=quotaRow('7d',qs.data.seven_day.utilization,qs.data.seven_day.resets_at);
      }else if(a.provider==='openai'){
        if(qs.data.primary!=null)rows+=quotaRow('5h',qs.data.primary.used,qs.data.primary.resets_at);
        if(qs.data.secondary!=null)rows+=quotaRow('7d',qs.data.secondary.used,qs.data.secondary.resets_at);
      }else if(a.provider==='antigravity'){
        if(Array.isArray(qs.data.models)){
          qs.data.models.slice(0,8).forEach(m=>{
            rows+=quotaRow(m.displayName||m.name,m.used,m.resets_at);
          });
        }
      }
      if(!rows&&qs.data&&!qs.data.error)rows=\`<div style="font-size:9px;color:var(--mu)">No quota data</div>\`;
      const btnStyle='background:none;border:1px solid var(--b2);border-radius:5px;color:var(--di);cursor:pointer;font-size:12px;width:28px;height:24px;display:inline-flex;align-items:center;justify-content:center;transition:all .12s;flex-shrink:0';
      return\`<div style="background:var(--s2);border-radius:8px;padding:8px 10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:\${rows?'6':'0'}px">
          <div style="width:20px;height:20px;border-radius:5px;background:\${IBGS[a.provider]||'rgba(96,96,128,.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">\${icon}</div>
          <span style="font-size:11px;font-weight:600;flex:1">\${escHtml(a.label||a.provider)}</span>
          <button onclick="refreshQuota('\${a.id}')" \${qs.loading?'disabled':''} style="\${btnStyle}" title="Refresh quota">\${qs.loading?'...':SVG_ICONS.refresh}</button>
        </div>
        \${rows}
      </div>\`;
    }).join('');
    quotaHtml=\`<div style="padding:10px 10px 0">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mu);margin-bottom:6px">Subscription Quota</div>
      <div style="display:flex;flex-direction:column;gap:6px">\${cards}</div>
    </div>\`;
  }

  // ?�?� Token usage section ??built from lastReqData ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
  const reqs=(lastReqData?.requests||[]);
  const ok=reqs.filter(r=>r.status==='ok'&&r.usedModel);
  let tokenHtml='';
  if(ok.length){
    let totIn=0,totOut=0,totCost=0,hasCost=false;
    const byModel={};
    for(const r of ok){
      const inT=r.inputTokens||0,outT=r.outputTokens||0;
      totIn+=inT;totOut+=outT;
      const p=getPrice(r.usedModel);
      const cost=p&&(inT||outT)?(inT*p[0]+outT*p[1])/1e6:null;
      if(cost!=null){totCost+=cost;hasCost=true;}
      if(!byModel[r.usedModel])byModel[r.usedModel]={provider:r.provider,reqs:0,inT:0,outT:0,cost:0,hasCost:false};
      byModel[r.usedModel].reqs++;byModel[r.usedModel].inT+=inT;byModel[r.usedModel].outT+=outT;
      if(cost!=null){byModel[r.usedModel].cost+=cost;byModel[r.usedModel].hasCost=true;}
    }
    const cards=\`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      <div class="usg-card"><div class="usg-val">\${fmtTok(totIn)}</div><div class="usg-lbl">Input tokens</div></div>
      <div class="usg-card"><div class="usg-val">\${fmtTok(totOut)}</div><div class="usg-lbl">Output tokens</div></div>
      <div class="usg-card"><div class="usg-val" style="color:var(--gr)">\${hasCost?fmtCost(totCost):'-'}</div><div class="usg-lbl">Est. cost</div></div>
    </div>\`;
    const hdr=\`<div class="usg-row usg-hdr"><span>Model</span><span>Reqs</span><span>In</span><span>Out</span><span>Cost</span></div>\`;
    const rows=Object.entries(byModel).sort((a,b)=>b[1].inT+b[1].outT-(a[1].inT+a[1].outT)).map(([model,m])=>{
      const col=COL[m.provider]||'#888';
      return\`<div class="usg-row">
        <span style="display:flex;align-items:center;gap:5px;min-width:0">
          <span style="width:6px;height:6px;border-radius:50%;background:\${col};flex-shrink:0"></span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${model}</span>
        </span>
        <span>\${m.reqs}</span><span>\${fmtTok(m.inT)||'-'}</span><span>\${fmtTok(m.outT)||'-'}</span>
        <span>\${m.hasCost?fmtCost(m.cost):'-'}</span>
      </div>\`;
    }).join('');
    tokenHtml=\`<div style="padding:10px 10px 0">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mu);margin-bottom:6px">Token Usage <span style="font-weight:400;opacity:.5">(24h)</span></div>
      \${cards}
      <div style="margin-top:6px;background:var(--s2);border-radius:8px;overflow:hidden">\${hdr}\${rows}</div>
    </div>\`;
  }else if(!quotaHtml){
    body.innerHTML='<div class="mn-empty">No usage data yet.</div>';return;
  }

  const note=\`<div style="padding:6px 10px;font-size:9px;color:var(--mu);border-top:1px solid var(--b1);margin-top:8px">Tokens: resets at midnight · Quota: manual refresh</div>\`;
  usageHtmlCache=quotaHtml+tokenHtml+note;
  body.innerHTML=usageHtmlCache;
}

async function refreshUsage(){
  try{lastReqData=await fetch('/api/requests').then(r=>r.json());}catch{/* keep last */}
  renderUsage();
}

async function refreshQuota(accountId){
  if(!quotaState[accountId])quotaState[accountId]={data:null,loading:false};
  quotaState[accountId]={...quotaState[accountId],loading:true};
  renderUsage();
  try{
    const d=await fetch('/api/quota?bust='+encodeURIComponent(accountId)).then(r=>r.json());
    const entry=(d.quota||[]).find(q=>q.id===accountId)||null;
    quotaState[accountId]={data:entry,loading:false};
  }catch{
    quotaState[accountId]={data:null,loading:false};
  }
  renderUsage();
}

// Canvas viewport
function applyVp(){
  // Use CSS zoom for scaling so the browser re-renders content at the exact zoom level
  // (crisp text at any zoom), and translate for panning (in parent pixel space)
  const rx=Math.round(vp.x),ry=Math.round(vp.y);
  const world=document.getElementById('world');
  world.style.transform=\`translate(\${rx}px,\${ry}px)\`;
  world.style.zoom=String(vp.s);
  const gs=28*vp.s,ws=document.getElementById('ws');
  ws.style.backgroundSize=\`\${gs}px \${gs}px\`;
  ws.style.backgroundPosition=\`\${rx}px \${ry}px\`;
  document.getElementById('zpct').textContent=Math.round(vp.s*100)+'%';
  drawLines();
}
function zoomAt(f,cx,cy){
  const r=document.getElementById('ws').getBoundingClientRect();
  const px=cx??r.width/2,py=cy??r.height/2;
  const wx=(px-vp.x)/vp.s,wy=(py-vp.y)/vp.s;
  vp.s=Math.max(.08,Math.min(4,vp.s*f));
  vp.x=px-wx*vp.s;vp.y=py-wy*vp.s;
  applyVp();
}
function zoomStep(d){zoomAt(d>0?1.25:1/1.25)}
function fitAll(){
  const ws=document.getElementById('ws'),wr=ws.getBoundingClientRect();
  const ids=['out',...onCanvas];
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  ids.forEach(id=>{
    const el=document.getElementById('nd-'+id);
    if(!el||!NP[id])return;
    x0=Math.min(x0,NP[id].x);y0=Math.min(y0,NP[id].y);
    x1=Math.max(x1,NP[id].x+(el.offsetWidth||215));
    y1=Math.max(y1,NP[id].y+(el.offsetHeight||180));
  });
  if(!isFinite(x0))return;
  const pad=70,cw=x1-x0+pad*2,ch=y1-y0+pad*2;
  vp.s=Math.min(wr.width/cw,wr.height/ch,1.4);
  vp.x=Math.round((wr.width-cw*vp.s)/2-(x0-pad)*vp.s);
  vp.y=Math.round((wr.height-ch*vp.s)/2-(y0-pad)*vp.s);
  applyVp();
}

// Canvas render
function render(){
  const world=document.getElementById('world');
  const savedScroll=document.getElementById('mn-body')?.scrollTop??0;
  // Snapshot monitor content so rebuild doesn't flash "Loading"
  const savedReqs=document.getElementById('mn-reqs-body')?.innerHTML;
  const savedLogs=document.getElementById('mn-logs-body')?.innerHTML;
  const savedStat=document.getElementById('mn-status-body')?.innerHTML;
  // Preserve xterm Pi terminal and loading overlay across world rebuilds
  const piTermEl   = piOpen && !piMaximized ? document.getElementById('pi-term-wrap')  : null;
  const piLoadEl   = piOpen && !piMaximized ? document.getElementById('pi-loading')     : null;
  const slotNodes=[...onCanvas]
    .filter(id=>id!=='out'&&id!=='monitor')
    .map(slotId=>buildAccNode(slotId))
    .join('');
  world.innerHTML=slotNodes+buildOutNode()+(monitorOpen?buildMonitorNode():'')+buildPiNode();
  // Restore monitor content
  if(savedReqs){const el=document.getElementById('mn-reqs-body');if(el)el.innerHTML=savedReqs;}
  if(savedLogs){const el=document.getElementById('mn-logs-body');if(el)el.innerHTML=savedLogs;}
  if(savedStat){const el=document.getElementById('mn-status-body');if(el)el.innerHTML=savedStat;}
  if(savedScroll>0){const mb=document.getElementById('mn-body');if(mb)mb.scrollTop=savedScroll;}
  // Re-attach preserved Pi terminal elements
  if(piTermEl){const slot=document.getElementById('pi-term-slot');if(slot)slot.replaceWith(piTermEl);}
  if(piLoadEl){const slot=document.getElementById('pi-loading-slot');if(slot)slot.replaceWith(piLoadEl);}

  [...onCanvas].filter(id=>id!=='out'&&id!=='monitor').forEach(slotId=>{
    const port=document.getElementById('po-'+slotId);
    if(port)port.addEventListener('pointerdown',e=>{e.stopPropagation();startConn(e,slotId)});
    const hdr=document.querySelector('#nd-'+slotId+' .nh');
    if(hdr)hdr.addEventListener('pointerdown',e=>startNodeDrag(e,slotId));
  });
  const outHdr=document.querySelector('#nd-out .nh');
  if(outHdr)outHdr.addEventListener('pointerdown',e=>startNodeDrag(e,'out'));

  const piNdHdr=document.getElementById('pi-nd-hdr');
  if(piNdHdr)piNdHdr.addEventListener('pointerdown',e=>startPiNodeDrag(e));

  if(monitorOpen){
    const monHdr=document.querySelector('#nd-monitor .nh');
    if(monHdr)monHdr.addEventListener('pointerdown',e=>startNodeDrag(e,'monitor'));
    if(monitorTab==='status') refreshStatus();
    else if(monitorTab==='logs') refreshLogs();
    else if(monitorTab==='requests') refreshRequests();
  }

  drawLines();
}

function accountSubtext(acc){
  try{
    if(acc.method==='oauth-official'&&acc.oauthToken){
      const parts=acc.oauthToken.split('.');
      if(parts.length>=2){
        const pad=parts[1].replace(/-/g,'+').replace(/_/g,'/');
        const payload=JSON.parse(atob(pad+'=='.slice(0,(4-pad.length%4)%4)));
        const email=payload.email||payload.sub||'';
        if(email)return 'User '+email;
      }
      // No email in JWT ??show provider-specific label
      if(acc.provider==='anthropic')return 'Claude Code OAuth';
    }
  }catch{}
  if(acc.method==='oauth-official')return acc.provider==='anthropic'?'Claude Code OAuth':'OAuth';
  if(acc.method==='apikey'&&acc.apiKey){
    const k=acc.apiKey;
    return 'Key '+k.slice(0,10)+'...'+k.slice(-4);
  }
  if(acc.method==='oauth-unofficial')return 'Session Token';
  if(acc.method==='local')return 'Local '+(ST.ollamaBaseUrl||'localhost:11434');
  return '';
}

function buildAccNode(slotId){
  const info=nodeSlots[slotId];
  if(!info)return '';
  const acc=ST.accounts.find(a=>a.id===info.accountId);
  if(!acc)return '';
  const model=info.model||'(auto)';
  const slot=(acc.activeModels||[]).find(s=>s.slotId===slotId);
  const isOut=!!slot;
  const sub=accountSubtext(acc);
  const no=accountNo(acc);
  const noBadge=no?\`<span class="acct-badge">#\${no}</span>\`:'';
  const subEl=sub?\`<div class="nd-acct" title="\${sub}">\${sub}</div>\`:'';
  const pos=NP[slotId]||{x:80,y:80};
  return \`<div class="nd \${isOut?'live':''}" id="nd-\${slotId}" style="left:\${pos.x}px;top:\${pos.y}px">
  <div class="nh">
    <div class="nic" style="background:\${IBGS[acc.provider]}">\${providerImg(acc.provider,14)}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px;min-width:0" title="\${accountName(acc)}">
        <div class="nn">\${accountName(acc)}</div>\${noBadge}
      </div>
      <div style="font-size:9px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="\${model}">\${model}</div>
    </div>
    <span class="bk \${isOut?'bk-on':'bk-off'}">\${isOut?'Active':'Idle'}</span>
    <button class="nd-rm" onclick="removeFromCanvas('\${slotId}')" title="Remove from canvas">\${SVG_ICONS.close}</button>
  </div>
  \${sub?\`<div class="nb" style="padding:4px 12px 6px">\${subEl}</div>\`:''}
  <div class="po \${isOut?'live':''}" id="po-\${slotId}" title="Drag to connect to OUT"></div>
</div>\`;
}

function buildOutNode(){
  const allSlots=[];
  for(const acc of ST.accounts){
    for(const slot of (acc.activeModels||[])){
      allSlots.push({acc,slot});
    }
  }
  allSlots.sort((a,b)=>a.slot.order-b.slot.order);
  const piCls='pi'+(allSlots.length?' live':'');
  const multi=allSlots.length>1;
  const subtitle=multi?'Priority order / fallback chain':'Codex uses these models';
  const body=allSlots.length
    ?allSlots.map(({acc,slot},i)=>{
        const m=slot.model||'(auto)';
        const upDis=i===0?'disabled':'';
        const dnDis=i===allSlots.length-1?'disabled':'';
        const orderBtns=multi?\`<div class="oi-ord">
          <button class="oi-arr" onclick="moveOut('\${acc.id}','\${slot.slotId}',-1)" \${upDis}>&uarr;</button>
          <button class="oi-arr" onclick="moveOut('\${acc.id}','\${slot.slotId}',1)" \${dnDis}>&darr;</button>
        </div>\`:'';
        return \`<div class="oi">
          \${multi?\`<span class="oi-num">\${i+1}</span>\`:''}
          <div class="oi-dot" style="background:\${COL[acc.provider]}"></div>
          <div class="oi-inf">
            <div class="oi-pr">\${accountName(acc)}</div>
            <div class="oi-mo" title="\${m}">\${m}</div>
          </div>
          \${orderBtns}
          <button class="oi-x" onclick="removeOut('\${acc.id}','\${slot.slotId}')">\${SVG_ICONS.close}</button>
        </div>\`;
      }).join('')
    :'<div class="out-empty">No providers connected<br><span style="font-size:9px">Drag from a node here</span></div>';
  const pos=NP.out||{x:520,y:280};
  const bypassed=codexMode==='openai';
  const bypassBanner=bypassed?'<div class="out-bypass">Bypassed - Codex using OpenAI directly</div>':'';
  return \`<div class="nd out-node\${bypassed?' bypassed':''}" id="nd-out" style="left:\${pos.x}px;top:\${pos.y}px">
  <div class="\${piCls}" id="pi"></div>
  <div class="nh">
    <div class="out-ic">O</div>
    <div style="flex:1;min-width:0">
      <div class="nn">Active Output</div>
      <div style="font-size:9px;color:var(--mu)">\${subtitle}</div>
    </div>
  </div>
  <div class="nb" id="out-body">\${body}</div>
  \${bypassBanner}
</div>\`;
}

// SVG lines
function portPos(el){
  const ws=document.getElementById('ws').getBoundingClientRect();
  const r=el.getBoundingClientRect();
  return{x:r.left+r.width/2-ws.left,y:r.top+r.height/2-ws.top};
}
function bezier(x1,y1,x2,y2){
  const dx=Math.abs(x2-x1)*.55;
  return \`M\${x1},\${y1} C\${x1+dx},\${y1} \${x2-dx},\${y2} \${x2},\${y2}\`;
}
function drawLines(){
  const svg=document.getElementById('svgl');
  svg.querySelectorAll('.cp').forEach(e=>e.remove());
  const pi=document.getElementById('pi');
  if(!pi)return;
  const tp=portPos(pi);
  [...onCanvas].filter(id=>id!=='out'&&id!=='monitor').forEach(slotId=>{
    const info=nodeSlots[slotId];
    if(!info)return;
    const acc=ST.accounts.find(a=>a.id===info.accountId);
    if(!acc)return;
    const slot=(acc.activeModels||[]).find(s=>s.slotId===slotId);
    if(!slot)return;
    const pe=document.getElementById('po-'+slotId);
    if(!pe)return;
    const sp=portPos(pe);
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.classList.add('cp');
    path.setAttribute('stroke',COL[acc.provider]||'#818cf8');
    path.setAttribute('d',bezier(sp.x,sp.y,tp.x,tp.y));
    svg.appendChild(path);
  });
  // Lines to Pi Agent node
  const piNdPort=document.getElementById('pi-nd-port');
  if(piNdPort){
    const pp=portPos(piNdPort);
    [...piConns].forEach(slotId=>{
      const info=nodeSlots[slotId];
      if(!info)return;
      const acc=ST.accounts.find(a=>a.id===info.accountId);
      const pe=document.getElementById('po-'+slotId);
      if(!pe)return;
      const sp=portPos(pe);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.classList.add('cp');
      path.setAttribute('stroke',acc?COL[acc.provider]||'#818cf8':'#818cf8');
      path.setAttribute('d',bezier(sp.x,sp.y,pp.x,pp.y));
      svg.appendChild(path);
    });
  }
}

// Node drag
function startPiNodeDrag(e){
  if(e.target.tagName==='BUTTON')return;
  e.preventDefault();e.stopPropagation();
  const pos=NP.piNode||{x:60,y:60};
  const sx=e.clientX,sy=e.clientY,nx=pos.x,ny=pos.y;
  function onMove(ev){
    NP.piNode={x:Math.round(nx+(ev.clientX-sx)/vp.s),y:Math.round(ny+(ev.clientY-sy)/vp.s)};
    const nd=document.getElementById('nd-pi');
    if(nd){nd.style.left=NP.piNode.x+'px';nd.style.top=NP.piNode.y+'px';}
    drawLines();
  }
  function onUp(){saveLS();document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);}
  document.addEventListener('pointermove',onMove);
  document.addEventListener('pointerup',onUp);
}

function startNodeDrag(e,id){
  if(e.target.tagName==='BUTTON'||e.target.tagName==='SELECT'||e.target.tagName==='INPUT')return;
  e.preventDefault();e.stopPropagation();
  const pos=NP[id]||{x:0,y:0};
  nodeD={id,sx:e.clientX,sy:e.clientY,nx:pos.x,ny:pos.y};
  document.getElementById('nd-'+id)?.classList.add('sel');
}

const WS=document.getElementById('ws');
WS.addEventListener('pointerdown',e=>{
  if(e.target.closest('.nd')||e.target.closest('.zbar'))return;
  if(sbOpen){sbOpen=false;document.getElementById('sb').classList.remove('open');document.getElementById('sb-btn').classList.remove('on');}
  panD={sx:e.clientX,sy:e.clientY,vx:vp.x,vy:vp.y};
  WS.style.cursor='grabbing';
  e.preventDefault();
});

function startConn(e,fromId){
  e.preventDefault();
  const pe=document.getElementById('po-'+fromId);
  if(!pe)return;
  pe.classList.add('dragging');
  connD={fromId};
  const sp=portPos(pe);
  const svg=document.getElementById('svgl');
  const tmp=document.createElementNS('http://www.w3.org/2000/svg','path');
  tmp.classList.add('ct');tmp.id='ctmp';
  tmp.setAttribute('d',bezier(sp.x,sp.y,sp.x,sp.y));
  svg.appendChild(tmp);
  document.getElementById('pi')?.classList.add('acc');
  document.getElementById('pi-nd-port')?.classList.add('acc');
}

window.addEventListener('pointermove',e=>{
  if(resizeD){
    const dx=e.clientX-resizeD.sx,dy=e.clientY-resizeD.sy;
    const sz=NP.monitorSize||{w:620,h:320};
    if(resizeD.dir==='e'||resizeD.dir==='se') sz.w=Math.max(320,resizeD.w0+dx);
    if(resizeD.dir==='s'||resizeD.dir==='se') sz.h=Math.max(120,resizeD.h0+dy);
    NP.monitorSize=sz;
    const mn=document.getElementById('nd-monitor');
    if(mn) mn.style.width=sz.w+'px';
    const mb=document.getElementById('mn-body');
    if(mb) mb.style.height=sz.h+'px';
    return;
  }
  if(piResizeD){
    const dx=(e.clientX-piResizeD.sx)/vp.s,dy=(e.clientY-piResizeD.sy)/vp.s;
    const sz=NP.piSize||{w:780,h:480};
    if(piResizeD.dir==='e'||piResizeD.dir==='se') sz.w=Math.max(320,piResizeD.w0+dx);
    if(piResizeD.dir==='s'||piResizeD.dir==='se') sz.h=Math.max(160,piResizeD.h0+dy);
    NP.piSize=sz;
    const nd=document.getElementById('nd-pi');
    if(nd) nd.style.width=sz.w+'px';
    const slot=document.getElementById('pi-term-wrap')||document.getElementById('pi-term-slot');
    if(slot) slot.style.height=sz.h+'px';
    if(piFit) piFit.fit();
    return;
  }
  if(nodeD){
    const dx=(e.clientX-nodeD.sx)/vp.s,dy=(e.clientY-nodeD.sy)/vp.s;
    NP[nodeD.id]={x:Math.round(nodeD.nx+dx),y:Math.round(nodeD.ny+dy)};
    const el=document.getElementById('nd-'+nodeD.id);
    if(el){el.style.left=NP[nodeD.id].x+'px';el.style.top=NP[nodeD.id].y+'px'}
    drawLines();
  }
  if(panD){vp.x=Math.round(panD.vx+(e.clientX-panD.sx));vp.y=Math.round(panD.vy+(e.clientY-panD.sy));applyVp()}
  if(connD){
    const pe=document.getElementById('po-'+connD.fromId);
    if(!pe)return;
    const sp=portPos(pe);
    const wr=document.getElementById('ws').getBoundingClientRect();
    const mx=e.clientX-wr.left,my=e.clientY-wr.top;
    const tmp=document.getElementById('ctmp');
    if(tmp)tmp.setAttribute('d',bezier(sp.x,sp.y,mx,my));
    const pi=document.getElementById('pi');
    if(pi){
      const pr=pi.getBoundingClientRect();
      const near=Math.hypot(e.clientX-(pr.left+pr.width/2),e.clientY-(pr.top+pr.height/2))<34;
      const hasConn=ST.accounts.some(a=>(a.activeModels||[]).length>0);
      pi.className='pi '+(near?'acc':hasConn?'live':'');
    }
    const piNdPort=document.getElementById('pi-nd-port');
    if(piNdPort){
      const pr=piNdPort.getBoundingClientRect();
      const near=Math.hypot(e.clientX-(pr.left+pr.width/2),e.clientY-(pr.top+pr.height/2))<34;
      piNdPort.className='pi-nd-port '+(near?'acc':piConns.size>0?'live':'');
    }
  }
});

window.addEventListener('pointerup',async e=>{
  if(resizeD){saveLS();resizeD=null;}
  if(piResizeD){saveLS();piResizeD=null;}
  if(nodeD){
    document.getElementById('nd-'+nodeD.id)?.classList.remove('sel');
    saveLS();
    nodeD=null;
  }
  if(panD){panD=null;WS.style.cursor='default'}
  if(connD){
    document.getElementById('po-'+connD.fromId)?.classList.remove('dragging');
    document.getElementById('ctmp')?.remove();
    document.getElementById('pi')?.classList.remove('acc');
    document.getElementById('pi-nd-port')?.classList.remove('acc');
    let handled = false;
    const pi=document.getElementById('pi');
    if(pi){
      const pr=pi.getBoundingClientRect();
      const near=Math.hypot(e.clientX-(pr.left+pr.width/2),e.clientY-(pr.top+pr.height/2))<36;
      if(near){await connectOut(connD.fromId);handled=true;}
    }
    if(!handled){
      const piNdPort=document.getElementById('pi-nd-port');
      if(piNdPort){
        const pr=piNdPort.getBoundingClientRect();
        const near=Math.hypot(e.clientX-(pr.left+pr.width/2),e.clientY-(pr.top+pr.height/2))<36;
        if(near) connectPi(connD.fromId);
      }
    }
    connD=null;
  }
});

WS.addEventListener('wheel',e=>{
  // Don't intercept scroll events from inside panels (monitor, sidebar)
  if(e.target instanceof Element&&e.target.closest('.mn-body,.sb-body'))return;
  e.preventDefault();
  const r=WS.getBoundingClientRect();
  zoomAt(e.deltaY<0?1.1:1/1.1,e.clientX-r.left,e.clientY-r.top);
},{passive:false});

// State changes
async function connectOut(slotId){
  const info=nodeSlots[slotId];
  if(!info)return;
  const r=await api('POST',\`/api/accounts/\${info.accountId}/slots\`,{slotId,model:info.model});
  if(!r.ok){toast('Connection failed: '+await r.text(),true);return;}
  hiddenSlots.delete(slotId);
  toast('Connected to output');
  await fetchStatus();
}
async function removeOut(accountId,slotId){
  await api('DELETE',\`/api/accounts/\${accountId}/slots/\${slotId}\`);
  onCanvas.delete(slotId);
  hiddenSlots.add(slotId);
  delete nodeSlots[slotId];
  delete NP[slotId];
  if(piConns.has(slotId)){
    piConns.delete(slotId); savePiConns();
    const info2 = nodeSlots[slotId];
    if(info2) api('DELETE', '/api/pi/connect/' + info2.accountId);
  }
  saveLS();
  render();
  toast('Disconnected');
  await fetchStatus();
}
async function moveOut(accountId,slotId,dir){
  const allSlots=[];
  for(const acc of ST.accounts){
    for(const slot of (acc.activeModels||[])){
      allSlots.push({accountId:acc.id,slotId:slot.slotId,order:slot.order});
    }
  }
  allSlots.sort((a,b)=>a.order-b.order);
  const idx=allSlots.findIndex(s=>s.slotId===slotId);
  if(idx<0)return;
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=allSlots.length)return;
  [allSlots[idx],allSlots[newIdx]]=[allSlots[newIdx],allSlots[idx]];
  await api('POST','/api/slots/reorder',{items:allSlots.map(s=>({accountId:s.accountId,slotId:s.slotId}))});
  await fetchStatus();
}

// Fetch
async function fetchStatus(){
  try{
    const d=await(await fetch('/api/accounts')).json();
    ST=d;

    // Sync server activeModels ??canvas (add missing slots)
    let idx=[...onCanvas].length;
    for(const acc of ST.accounts){
      for(const slot of (acc.activeModels||[])){
        if(hiddenSlots.has(slot.slotId))continue;
        if(!nodeSlots[slot.slotId]){
          nodeSlots[slot.slotId]={accountId:acc.id,model:slot.model};
        }
        if(!onCanvas.has(slot.slotId)){
          onCanvas.add(slot.slotId);
          if(!NP[slot.slotId])NP[slot.slotId]={x:80+(idx%4)*240,y:80+Math.floor(idx/4)*180};
          idx++;
        }
      }
    }

    // Remove stale canvas entries (account deleted from server)
    const serverAccountIds=new Set(ST.accounts.map(a=>a.id));
    [...onCanvas].forEach(id=>{
      if(id==='out'||id==='monitor')return;
      const info=nodeSlots[id];
      if(!info||!serverAccountIds.has(info.accountId)){
        onCanvas.delete(id); delete nodeSlots[id]; delete NP[id];
      }
    });

    saveLS();
    render();
    if(sbOpen)renderSb();
  }catch(e){console.error(e)}
}

function api(method,url,body){
  return fetch(url,{method,headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
}
function updateModeUI(){
  document.getElementById('ms-rcodex')?.classList.toggle('active',codexMode==='rcodex');
  document.getElementById('ms-oai')?.classList.toggle('active',codexMode==='openai');
  render();
}
async function switchProvider(mode){
  try{
    toast(mode==='rcodex'?'Switching to rcodex Gateway':'Switching to OpenAI direct');
    const r=await api('POST','/api/codex-provider',{mode});
    if(!r.ok){toast('Switch failed',true);return;}
    codexMode=mode;
    updateModeUI();
    toast(mode==='rcodex'?'rcodex Gateway - Codex restarted':'OpenAI direct - Codex restarted');
  }catch{toast('Switch failed',true);}
}
function toast(msg,err){
  const t=document.createElement('div');t.className='toast';
  t.style.borderColor=err?'rgba(239,68,68,.3)':'rgba(34,197,94,.2)';
  t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3000);
}

window.addEventListener('resize',drawLines);

// Init
async function init(){
  await fetchStatus();
  try{const d=await fetch('/api/codex-provider').then(r=>r.json());codexMode=d.mode||'rcodex';updateModeUI();}catch{}
  setTimeout(()=>{applyVp();if([...onCanvas].length>0||NP.out)fitAll();},120);
  setInterval(fetchStatus,10000);
}
init();
</script>
</body>
</html>`;
}
