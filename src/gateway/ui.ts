export function getHTML(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>rcodex Gateway</title>
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
.nd{position:absolute;width:215px;background:var(--s1);border:1px solid var(--b1);
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
/* terminal */
.term-wrap{height:100%;padding:8px 10px;display:flex;flex-direction:column;gap:0}
.term-line{white-space:pre-wrap;word-break:break-all;line-height:1.55;padding:1px 0}
.t-cmd{color:#e0e0f0}.t-out{color:#8888aa}.t-err{color:#f87171}.t-info{color:#818cf8}
.mn-inp-row{display:flex;align-items:center;gap:6px;padding:5px 10px;
  border-top:1px solid var(--b1);background:rgba(0,0,0,.18);
  border-radius:0 0 12px 12px;flex-shrink:0}
.mn-cwd-lbl{font-size:9px;color:var(--bl2);font-family:'SF Mono',monospace;
  max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0}
.mn-inp{flex:1;background:transparent;border:none;color:var(--tx);
  font-size:11px;font-family:'SF Mono',monospace;outline:none;min-width:0}
.mn-inp::placeholder{color:var(--mu)}
.mn-run{padding:3px 9px;border-radius:5px;border:1px solid var(--b2);
  background:rgba(99,102,241,.12);color:var(--bl2);font-size:10px;
  cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .12s}
.mn-run:hover{background:rgba(99,102,241,.22)}
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
.req-row{display:grid;grid-template-columns:52px 80px 1fr 40px 72px 20px;
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
    <button class="icon-btn" id="hb-term" onclick="toggleMonitor('terminal')" title="Terminal">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3.5L5 7l-3.5 3.5M6 10.5h6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <button class="icon-btn" id="hb-stat" onclick="toggleMonitor('status')" title="Gateway Status">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
    </button>
    <button class="icon-btn" id="hb-logs" onclick="toggleMonitor('logs')" title="Gateway Logs">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M2 7h7M2 10.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
    </button>
    <button class="icon-btn" id="hb-reqs" onclick="toggleMonitor('requests')" title="Request History">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M2.5 7h6M2.5 9.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="11" cy="9.5" r="2" stroke="currentColor" stroke-width="1.2"/></svg>
    </button>
    <button class="icon-btn" id="hb-usage" onclick="toggleMonitor('usage')" title="Token Usage">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="8" width="2.5" height="4.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="5.75" y="5" width="2.5" height="7.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="10" y="2" width="2.5" height="10.5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
    </button>
    <div style="width:1px;height:18px;background:var(--b1);margin:0 2px"></div>
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
      <button class="zbtn" onclick="zoomStep(-1)">-</button>
      <div class="zpct" id="zpct">100%</div>
      <button class="zbtn" onclick="zoomStep(1)">+</button>
      <button class="zbtn" onclick="fitAll()" style="font-size:12px">fit</button>
    </div>
    <div class="hint">Scroll to zoom / Drag to pan / Drag ports to connect</div>
  </div>

</div>

<script>
// Provider definitions
const PDEFS = [
  {id:'anthropic',name:'Claude',sub:'Anthropic',icon:'C',ibg:'rgba(249,115,22,.15)',color:'#f97316',
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with Claude Code',desc:'OAuth login uses your Claude Pro/Max subscription',warn:null},
     {id:'apikey',icon:'Key',name:'API Key',desc:'Use Anthropic API key from console.anthropic.com',warn:null},
     {id:'session',icon:'Cookie',name:'Session Token',desc:'Use claude.ai browser cookie (unofficial)',warn:'Unofficial; may break. Against ToS.'},
   ]},
  {id:'openai',name:'ChatGPT / Codex',sub:'OpenAI',icon:'O',ibg:'rgba(16,163,127,.15)',color:'#10a37f',
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with ChatGPT',desc:'OAuth login uses your ChatGPT subscription',warn:null},
     {id:'apikey',icon:'Key',name:'API Key',desc:'Use OpenAI API key from platform.openai.com',warn:null},
     {id:'session',icon:'Cookie',name:'Session Token',desc:'Use chatgpt.com browser cookie (unofficial)',warn:'Unofficial; may break. Against ToS.'},
   ]},
  {id:'google',name:'Gemini',sub:'Google',icon:'G',ibg:'rgba(66,133,244,.15)',color:'#4285f4',
   methods:[
     {id:'apikey',icon:'Key',name:'API Key',desc:'Use Google AI Studio key from aistudio.google.com',warn:null},
   ]},
  {id:'ollama',name:'Ollama',sub:'Local models',icon:'L',ibg:'rgba(168,85,247,.15)',color:'#a855f7',
   methods:[
     {id:'local',icon:'Local',name:'Connect Local',desc:'Use locally running Ollama (localhost:11434)',warn:null},
   ]},
  {id:'antigravity',name:'Antigravity',sub:'Google (Daily)',icon:'A',ibg:'rgba(52,211,153,.15)',color:'#34d399',
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with Google',desc:'OAuth login uses your Google Cloud / Gemini Code Assist account',warn:null},
   ]},
  {id:'copilot',name:'Copilot',sub:'GitHub',icon:'P',ibg:'rgba(31,111,235,.15)',color:'#2f81f7',
   methods:[
     {id:'oauth',icon:'Auth',name:'Login with GitHub',desc:'OAuth device login uses your GitHub Copilot subscription',warn:null},
   ]},
];
const COL={anthropic:'#f97316',openai:'#10a37f',google:'#4285f4',ollama:'#a855f7',antigravity:'#34d399',copilot:'#2f81f7'};
const ICONS={anthropic:'C',openai:'O',google:'G',ollama:'L',antigravity:'A',copilot:'P'};
const IBGS={anthropic:'rgba(249,115,22,.15)',openai:'rgba(16,163,127,.15)',google:'rgba(66,133,244,.15)',ollama:'rgba(168,85,247,.15)',antigravity:'rgba(52,211,153,.15)',copilot:'rgba(31,111,235,.15)'};const IMG_ICONS={
  anthropic:'data:image/png;base64,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',
  openai:'data:image/png;base64,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',
  google:'data:image/jpeg;base64,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',
  ollama:'data:image/png;base64,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',
};
function providerImg(provider,size){
  size=size||18;
  const src=IMG_ICONS[provider];
  return src?\`<img src="\${src}" style="width:\${size}px;height:\${size}px;object-fit:contain;border-radius:2px">\`:(ICONS[provider]||'?');
}

// App state
let ST = { accounts:[], ollamaRunning:false, ollamaModels:[], ollamaBaseUrl:'http://localhost:11434' };
let sbOpen = false;
let sbScreen = 'home'; // 'home' | 'providers' | 'add-type' | 'add-method' | 'oauth-device'
let sbAddingDef = null;
let sbAddingMethod = null;
let sbOAuthDevice = null;
let sidebarModelSel = {}; // accountId ??currently selected model in sidebar

// Monitor state
let monitorOpen = false;
let resizeD = null;
let monitorTab = 'terminal';
let termLines = [];
let termCwd = '';
let termHistory = [];
let termHistIdx = -1;
let termBusy = false;
let monitorRefreshTimer = null;
let usageHtmlCache = '';
let quotaState = {};
let lastReqData = null;
let codexMode = 'rcodex';

// Canvas state (localStorage) ??keyed by slotId (not accountId)
const LS_POS    = 'rcodex-pos-v4';
const LS_CANVAS = 'rcodex-canvas-v4';
const LS_SLOTS  = 'rcodex-slots-v1';
function loadPos(){   try{return JSON.parse(localStorage.getItem(LS_POS)||'{}')}catch{return {}} }
function loadCanvas(){ try{return new Set(JSON.parse(localStorage.getItem(LS_CANVAS)||'[]'))}catch{return new Set()} }
function loadSlots(){  try{return JSON.parse(localStorage.getItem(LS_SLOTS)||'{}')}catch{return {}} }
let NP        = loadPos();
let onCanvas  = loadCanvas();  // Set of slotIds (+ 'out', 'monitor')
let nodeSlots = loadSlots();   // {[slotId]: {accountId, model}}

function saveLS(){
  localStorage.setItem(LS_POS,    JSON.stringify(NP));
  localStorage.setItem(LS_CANVAS, JSON.stringify([...onCanvas]));
  localStorage.setItem(LS_SLOTS,  JSON.stringify(nodeSlots));
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
}

function renderSb(){
  const back=document.getElementById('sb-back');
  const title=document.getElementById('sb-title');
  const body=document.getElementById('sb-body');
  const showBack=sbScreen!=='home';
  back.style.display=showBack?'flex':'none';

  if(sbScreen==='home'){
    title.textContent='Menu';
    body.innerHTML=\`
      <div style="padding:8px 0">
        <div class="nav-item" onclick="sbGoTo('providers')">
          <div class="nav-ic" style="background:rgba(99,102,241,.15)">P</div>
          <div class="nav-info">
            <div class="nav-name">Providers</div>
            <div class="nav-sub">Manage AI provider accounts</div>
          </div>
          <span class="nav-arr">&gt;</span>
        </div>
        <div class="nav-item" style="opacity:.4;pointer-events:none">
          <div class="nav-ic" style="background:rgba(96,96,128,.1)">i</div>
          <div class="nav-info">
            <div class="nav-name">Settings</div>
            <div class="nav-sub">Gateway configuration</div>
          </div>
          <span class="nav-badge">Soon</span>
        </div>
        <div class="nav-item" style="opacity:.4;pointer-events:none">
          <div class="nav-ic" style="background:rgba(96,96,128,.1)">M</div>
          <div class="nav-info">
            <div class="nav-name">Monitor</div>
            <div class="nav-sub">Request logs & metrics</div>
          </div>
          <span class="nav-badge">Soon</span>
        </div>
      </div>\`;
  }
  else if(sbScreen==='providers'){
    title.textContent='Providers';
    const connectedHtml=renderConnectedAccounts();
    body.innerHTML=\`
      <div class="sb-section">Add Provider</div>
      \${PDEFS.map(p=>\`
        <div class="ptype" onclick="sbGoToAdd('\${p.id}')">
          <div class="ptype-ic" style="background:\${p.ibg}">\${providerImg(p.id,20)}</div>
          <div class="ptype-info">
            <div class="ptype-name">\${p.name}</div>
            <div class="ptype-sub">\${p.sub}</div>
          </div>
          <button class="add-btn" onclick="event.stopPropagation();sbGoToAdd('\${p.id}')">+ Add</button>
        </div>\`).join('')}
      <div class="sb-sep"></div>
      <div class="sb-section">Connected Providers</div>
      \${connectedHtml}\`;
  }
  else if(sbScreen==='add-type'){
    title.textContent='Add '+sbAddingDef.name;
    const methods=sbAddingDef.methods;
    body.innerHTML=\`
      <div style="padding:10px 14px 6px;font-size:11px;color:var(--mu)">Choose how to connect:</div>
      <div class="auth-cards">
        \${methods.map(m=>\`
          <div class="auth-card" onclick="sbGoToMethod('\${m.id}')">
            <div class="auth-card-hdr">
              <span class="auth-card-ic">\${m.icon}</span>
              <span class="auth-card-name">\${m.name}</span>
            </div>
            <div class="auth-card-sub">\${m.desc}</div>
          </div>\`).join('')}
      </div>\`;
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
            <button class="form-submit" onclick="doOAuth()">Open Login</button>
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
  let html=all.map(a=>{
    const models=a.models||[];
    const activeSlots=(a.activeModels||[]).length;
    const canvasCount=Object.values(nodeSlots).filter(s=>s.accountId===a.id).length;
    const sub=accountSubtext(a);
    if(!sidebarModelSel[a.id]&&models.length) sidebarModelSel[a.id]=models[0];
    const curSel=sidebarModelSel[a.id]||'';
    const modelPicker=models.length
      ?\`<select class="msel" style="flex:1;font-size:10px;padding:4px 6px"
            onchange="sidebarModelSel['\${a.id}']=this.value">
          \${models.map(m=>\`<option value="\${m}"\${m===curSel?' selected':''}>\${m}</option>\`).join('')}
         </select>\`
      :\`<div style="flex:1;font-size:10px;color:var(--mu);padding:4px 0">No models loaded</div>\`;
    return \`<div class="acc-item" style="flex-direction:column;align-items:stretch;gap:5px">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="acc-ic" style="background:\${IBGS[a.provider]||'rgba(96,96,128,.1)'}">\${providerImg(a.provider,16)}</div>
        <div class="acc-info">
          <div class="acc-name">\${a.label}</div>
          <div class="acc-sub">\${methodLabel[a.method]||a.method}\${activeSlots?' · <span style="color:var(--gr)">active</span> '+activeSlots+' active':canvasCount?' · '+canvasCount+' on canvas':''}</div>
          \${sub?\`<div class="acc-sub" style="opacity:.6;margin-top:1px;font-size:9px">\${sub}</div>\`:''}
        </div>
        <button class="del-btn" onclick="deleteAccount('\${a.id}')" title="Delete">×</button>
      </div>
      <div style="display:flex;gap:6px;padding:0 0 2px 40px">
        \${modelPicker}
        <button class="add-btn" onclick="addToCanvas('\${a.id}')">+ Canvas</button>
      </div>
    </div>\`;
  }).join('');
  if(ST.ollamaRunning&&!ST.accounts.find(a=>a.provider==='ollama')){
    html+=\`<div style="padding:8px 16px;font-size:10px;color:var(--mu)">
      Ollama is running <button onclick="sbGoToAdd('ollama')" style="background:none;border:none;color:var(--bl2);cursor:pointer;font-size:10px">add it as an account</button>
    </div>\`;
  }
  return html;
}

function sbGoTo(screen){ sbScreen=screen; renderSb(); }
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
  saveLS();
  render();
  if(sbOpen)renderSb();
  if(info){
    const acc=ST.accounts.find(a=>a.id===info.accountId);
    const slot=(acc?.activeModels||[]).find(s=>s.slotId===slotId);
    if(slot){
      await api('DELETE',\`/api/accounts/\${info.accountId}/slots/\${slotId}\`);
      await fetchStatus();
    }
  }
}

// Monitor node
function toggleMonitor(tab){
  if(monitorOpen && monitorTab===tab){ monitorOpen=false; }
  else{ monitorOpen=true; monitorTab=tab; if(!NP.monitor) NP.monitor={x:80,y:60}; }
  ['terminal','status','logs','requests','usage'].forEach(t=>{
    document.getElementById('hb-'+{terminal:'term',status:'stat',logs:'logs',requests:'reqs',usage:'usage'}[t])
      ?.classList.toggle('on', monitorOpen&&monitorTab===t);
  });
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
  const tabs=['terminal','status','logs','requests','usage'];
  const labels={terminal:'Terminal',status:'Status',logs:'Logs',requests:'Requests',usage:'Usage'};
  const icons={
    terminal:'<svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M1.5 3.5L5 7l-3.5 3.5M6 10.5h6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
  if(monitorTab==='terminal'){
    const linesHtml=termLines.map(l=>\`<div class="term-line t-\${l.t}">\${escHtml(l.v)}</div>\`).join('');
    content=\`<div class="term-wrap" id="term-out">\${linesHtml||'<div class="t-info">Ready. Type a command below.</div>'}</div>\`;
    const cwd=termCwd||'~';
    const short=cwd.replace(new RegExp('^/Users/[^/]+'),'~');
    inputRow=\`<div class="mn-inp-row">
      <span class="mn-cwd-lbl" title="\${cwd}">\${short}$</span>
      <input class="mn-inp" id="mn-inp" placeholder="Enter command" autocomplete="off" spellcheck="false"/>
      <button class="mn-run" onclick="sendTerm()">Run</button>
    </div>\`;
  } else if(monitorTab==='status'){
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
    <div class="nic" style="background:rgba(99,102,241,.15);font-size:11px">T</div>
    <span class="nn">Monitor</span>
    <button class="nd-rm" onclick="toggleMonitor(monitorTab)" title="Close">×</button>
  </div>
  <div class="mn-tabbar">\${tabHtml}</div>
  <div class="mn-body \${!inputRow?'last':''}" id="mn-body" style="height:\${sz.h}px">\${content}</div>
  \${inputRow}
  <div class="mn-rs-e" onpointerdown="startMonitorResize(event,'e')"></div>
  <div class="mn-rs-s" onpointerdown="startMonitorResize(event,'s')"></div>
  <div class="mn-rs-se" onpointerdown="startMonitorResize(event,'se')"></div>
</div>\`;
}

function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Terminal
function addTermLine(t,v){
  termLines.push({t,v});
  if(termLines.length>500)termLines.splice(0,termLines.length-500);
  const out=document.getElementById('term-out');
  if(out){
    const el=document.createElement('div');
    el.className=\`term-line t-\${t}\`;
    el.textContent=v;
    out.appendChild(el);
    out.scrollTop=out.scrollHeight;
  }
}

async function sendTerm(){
  const inp=document.getElementById('mn-inp');
  if(!inp||termBusy)return;
  const cmd=inp.value.trim();
  if(!cmd)return;
  inp.value='';
  termHistory.unshift(cmd);
  termHistIdx=-1;
  termBusy=true;
  addTermLine('cmd',\`\${(termCwd||'~').replace(new RegExp('^/Users/[^/]+'),'~')}$ \${cmd}\`);
  try{
    const r=await api('POST','/api/terminal/exec',{cmd,cwd:termCwd||undefined});
    const d=await r.json();
    if(d.cwd)termCwd=d.cwd;
    if(d.stdout?.trim())d.stdout.trimEnd().split('\\n').forEach(l=>addTermLine('out',l));
    if(d.stderr?.trim())d.stderr.trimEnd().split('\\n').forEach(l=>addTermLine('err',l));
    // Re-render only header of monitor (for cwd update in prompt)
    const lbl=document.querySelector('.mn-cwd-lbl');
    if(lbl){const short=(d.cwd||termCwd||'~').replace(new RegExp('^/Users/[^/]+'),'~');lbl.textContent=short+'$';lbl.title=d.cwd||'';}
  }catch(e){addTermLine('err','Error: '+e.message);}
  termBusy=false;
  document.getElementById('mn-inp')?.focus();
}

function setupTermKeys(){
  const inp=document.getElementById('mn-inp');
  if(!inp)return;
  inp.onkeydown=e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendTerm();}
    else if(e.key==='ArrowUp'){e.preventDefault();if(termHistIdx<termHistory.length-1){termHistIdx++;inp.value=termHistory[termHistIdx];}}
    else if(e.key==='ArrowDown'){e.preventDefault();if(termHistIdx>0){termHistIdx--;inp.value=termHistory[termHistIdx];}else{termHistIdx=-1;inp.value='';}}
    else if(e.key==='l'&&e.ctrlKey){e.preventDefault();termLines=[];document.getElementById('term-out').innerHTML='';}
  };
  inp.focus();
}

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
  const atBottom=!scroller||scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<60;
  try{
    const d=await(await fetch('/api/requests')).json();
    if(!d.requests?.length){body.innerHTML='<div class="mn-empty">No requests yet</div>';return;}
    const hdr='<div class="req-row req-hdr"><span>Time</span><span>Provider</span><span>Model</span><span>ms</span><span>Tokens</span><span></span></div>';
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

      return \`<div style="flex-direction:column;display:flex;border-bottom:1px solid rgba(255,255,255,.035)">
        <div class="req-row \${stCls}-row" style="border-bottom:none">
          <span class="req-ts">\${ts}</span>
          <span class="req-prov" style="color:\${col}">\${r.provider||'-'}</span>
          <span class="req-model">\${modelLabel}</span>
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
    if(scroller&&atBottom) scroller.scrollTop=scroller.scrollHeight;
    // Restore open state after rebuild
    openIds.forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='block';const btn=el.previousElementSibling?.querySelector('.req-expand-btn');if(btn)btn.textContent='-';}});
  }catch{body.innerHTML='<div class="mn-empty">Failed to load</div>';}
}
function toggleReqDetail(id){
  const el=document.getElementById(id);
  if(!el)return;
  const btn=el.previousElementSibling?.querySelector('.req-expand-btn');
  if(el.style.display==='none'){el.style.display='block';if(btn)btn.textContent='-';}
  else{el.style.display='none';if(btn)btn.textContent='-';}
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
  if(!isoStr)return'';
  const diff=new Date(isoStr)-Date.now();
  if(diff<=0)return'now';
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
    <span style="font-size:9px;color:var(--mu);width:26px;flex-shrink:0">\${label}</span>
    \${quotaBar(used,col)}
    <span style="font-size:9px;width:28px;text-align:right;flex-shrink:0;\${used>80?'color:#ef4444':used>50?'color:#f59e0b':''}">\${remaining}%</span>
    \${reset?\`<span style="font-size:9px;color:var(--mu);flex-shrink:0">reset: \${reset}</span>\`:''}
  </div>\`;
}

function renderUsage(){
  const body=document.getElementById('mn-usage-body');
  if(!body)return;

  // ?�?� Quota section ??built from ST.accounts + quotaState (no auto-fetch) ?�?�
  const oauthAccts=(ST.accounts||[]).filter(a=>a.method==='oauth-official'&&(a.provider==='anthropic'||a.provider==='openai'));
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
      }else if(qs.data.error){
        rows=\`<div style="font-size:9px;color:var(--rd)">Error: \${qs.data.error}</div>\`;
      }else if(a.provider==='anthropic'){
        if(qs.data.five_hour!=null)rows+=quotaRow('5h',qs.data.five_hour.utilization,qs.data.five_hour.resets_at);
        if(qs.data.seven_day!=null)rows+=quotaRow('7d',qs.data.seven_day.utilization,qs.data.seven_day.resets_at);
      }else if(a.provider==='openai'){
        if(qs.data.primary!=null)rows+=quotaRow('5h',qs.data.primary.used,qs.data.primary.resets_at);
        if(qs.data.secondary!=null)rows+=quotaRow('7d',qs.data.secondary.used,qs.data.secondary.resets_at);
      }
      if(!rows&&qs.data&&!qs.data.error)rows=\`<div style="font-size:9px;color:var(--mu)">No quota data</div>\`;
      const btnStyle='background:none;border:1px solid var(--b2);border-radius:5px;color:var(--di);cursor:pointer;font-size:12px;padding:0 7px;line-height:1.8;transition:all .12s;flex-shrink:0';
      return\`<div style="background:var(--s2);border-radius:8px;padding:8px 10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:\${rows?'6':'0'}px">
          <div style="width:20px;height:20px;border-radius:5px;background:\${IBGS[a.provider]||'rgba(96,96,128,.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">\${icon}</div>
          <span style="font-size:11px;font-weight:600;flex:1">\${escHtml(a.label||a.provider)}</span>
          <button onclick="refreshQuota('\${a.id}')" \${qs.loading?'disabled':''} style="\${btnStyle}" title="Refresh quota">\${qs.loading?'...':'Refresh'}</button>
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
  // Snapshot current monitor content so rebuild doesn't flash "Loading
  const savedReqs=document.getElementById('mn-reqs-body')?.innerHTML;
  const savedLogs=document.getElementById('mn-logs-body')?.innerHTML;
  const savedStat=document.getElementById('mn-status-body')?.innerHTML;
  const slotNodes=[...onCanvas]
    .filter(id=>id!=='out'&&id!=='monitor')
    .map(slotId=>buildAccNode(slotId))
    .join('');
  world.innerHTML=slotNodes+buildOutNode()+(monitorOpen?buildMonitorNode():'');
  // Restore content immediately before async refresh fires
  if(savedReqs){const el=document.getElementById('mn-reqs-body');if(el)el.innerHTML=savedReqs;}
  if(savedLogs){const el=document.getElementById('mn-logs-body');if(el)el.innerHTML=savedLogs;}
  if(savedStat){const el=document.getElementById('mn-status-body');if(el)el.innerHTML=savedStat;}
  if(savedScroll>0){const mb=document.getElementById('mn-body');if(mb)mb.scrollTop=savedScroll;}

  [...onCanvas].filter(id=>id!=='out'&&id!=='monitor').forEach(slotId=>{
    const port=document.getElementById('po-'+slotId);
    if(port)port.addEventListener('pointerdown',e=>{e.stopPropagation();startConn(e,slotId)});
    const hdr=document.querySelector('#nd-'+slotId+' .nh');
    if(hdr)hdr.addEventListener('pointerdown',e=>startNodeDrag(e,slotId));
  });
  const outHdr=document.querySelector('#nd-out .nh');
  if(outHdr)outHdr.addEventListener('pointerdown',e=>startNodeDrag(e,'out'));

  if(monitorOpen){
    const monHdr=document.querySelector('#nd-monitor .nh');
    if(monHdr)monHdr.addEventListener('pointerdown',e=>startNodeDrag(e,'monitor'));
    if(monitorTab==='terminal') setupTermKeys();
    else if(monitorTab==='status') refreshStatus();
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
  const subEl=sub?\`<div class="nd-acct" title="\${sub}">\${sub}</div>\`:'';
  const pos=NP[slotId]||{x:80,y:80};
  return \`<div class="nd \${isOut?'live':''}" id="nd-\${slotId}" style="left:\${pos.x}px;top:\${pos.y}px">
  <div class="nh">
    <div class="nic" style="background:\${IBGS[acc.provider]}">\${providerImg(acc.provider,14)}</div>
    <div style="flex:1;min-width:0">
      <div class="nn">\${acc.label}</div>
      <div style="font-size:9px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="\${model}">\${model}</div>
    </div>
    <span class="bk \${isOut?'bk-on':'bk-off'}">\${isOut?'Active':'Idle'}</span>
    <button class="nd-rm" onclick="removeFromCanvas('\${slotId}')" title="Remove from canvas">×</button>
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
            <div class="oi-pr">\${acc.label}</div>
            <div class="oi-mo" title="\${m}">\${m}</div>
          </div>
          \${orderBtns}
          <button class="oi-x" onclick="removeOut('\${acc.id}','\${slot.slotId}')">×</button>
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
}

// Node drag
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
  }
});

window.addEventListener('pointerup',async e=>{
  if(resizeD){saveLS();resizeD=null;}
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
    const pi=document.getElementById('pi');
    if(pi){
      const pr=pi.getBoundingClientRect();
      const near=Math.hypot(e.clientX-(pr.left+pr.width/2),e.clientY-(pr.top+pr.height/2))<36;
      if(near)await connectOut(connD.fromId);
    }
    connD=null;
  }
});

WS.addEventListener('wheel',e=>{
  // Don't intercept scroll events from inside panels (monitor, sidebar)
  if(e.target instanceof Element&&e.target.closest('.mn-body,.sb-body,.mn-inp-row'))return;
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
  toast('Connected to output');
  await fetchStatus();
}
async function removeOut(accountId,slotId){
  await api('DELETE',\`/api/accounts/\${accountId}/slots/\${slotId}\`);
  // Also remove from canvas
  onCanvas.delete(slotId);
  saveLS();
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
  try{const d=await(await fetch('/api/status')).json();if(d.home)termCwd=d.home;}catch{}
  try{const d=await fetch('/api/codex-provider').then(r=>r.json());codexMode=d.mode||'rcodex';updateModeUI();}catch{}
  setTimeout(()=>{applyVp();if([...onCanvas].length>0||NP.out)fitAll();},120);
  setInterval(fetchStatus,10000);
}
init();
</script>
</body>
</html>`;
}
