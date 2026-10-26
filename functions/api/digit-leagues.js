// Session credentials remain in POST bodies. Preview deployments cannot modify the shared workbook.
const PROD = 'https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec';
const PREVIEW = 'https://script.google.com/macros/s/AKfycbywlPw_MsMCzBO8PNnbQuVOADFxHQuZk3AJtqoDr6_F2Oi-2-p57OLmtmdEFpknrAq0/exec';
const actions = new Set(['getDigitClockWorkspace', 'adminSaveDigitClockLeague', 'adminPublishDigitClockSeason', 'adminPrepareDigitClockImport', 'adminPreviewDigitClockImport', 'adminCommitDigitClockImport']);
const headers = {'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply = (body,status=200) => new Response(JSON.stringify(body),{status,headers});
export async function onRequestPost({request}) {
  if (Number(request.headers.get('content-length') || 0)>4000000) return reply({success:false,error:'Request too large.'},413);
  try {
    const raw=await request.text(); if(raw.length>4000000) return reply({success:false,error:'Request too large.'},413);
    const body=JSON.parse(raw);
    if (!actions.has(body.action)) return reply({success:false,error:'Unsupported action.'},400);
    const production=['pattc-predicts.pages.dev','my-appscript-project.pages.dev'].includes(new URL(request.url).hostname);
    if(!production && /^admin/.test(body.action) && body.action!=='adminPreviewDigitClockImport') return reply({success:false,error:'Preview is read-only. Save or import from the production PATTC app.'},403);
    const response=await fetch(production?PROD:PREVIEW,{method:'POST',headers:{'content-type':'text/plain;charset=utf-8',accept:'application/json'},body:raw,redirect:'follow',signal:AbortSignal.timeout(55000)});
    if(!response.ok) throw new Error('PATTC shared storage is temporarily unavailable.');
    const result=await response.json();
    return reply(result);
  } catch(error) {return reply({success:false,error:error instanceof SyntaxError?'Invalid server response or request.':error.message},502);}
}
export const onRequestGet = () => reply({success:false,error:'Use POST with a PATTC session.'},405);
