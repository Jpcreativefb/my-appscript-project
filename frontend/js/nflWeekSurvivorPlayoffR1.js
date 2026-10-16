/* PATTC NFL WEEK / SURVIVOR / PLAYOFF RACE R1 admin helper */
(function(root){
  'use strict';
  function esc(v){return String(v===undefined||v===null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function findSurvivorForm(){
    var field=document.querySelector('input[name="survivorBuildWeek"]');
    return field&&field.form?field.form:null;
  }
  function gameId(form){var n=form&&form.querySelector('[name="gameId"]');return n?String(n.value||'').trim():'';}
  async function load(){
    var form=findSurvivorForm(),card=document.getElementById('pattcNflSurvivorWeekTimingR1');
    if(!form||!card||typeof root.apiAdminRunSportsSurvivor!=='function')return;
    var status=card.querySelector('[data-week-status]');
    try{
      var r=await root.apiAdminRunSportsSurvivor({gameId:gameId(form),getWeekTiming:true});
      if(!r||r.success===false)throw new Error(r&&(r.error||r.message)||'Could not load NFL week timing.');
      var mode=card.querySelector('[data-week-mode]'),over=card.querySelector('[data-week-override]'),resolved=card.querySelector('[data-current-week]');
      if(mode)mode.value=r.weekMode||'auto';if(over)over.value=r.overrideWeek||r.currentWeek||1;if(resolved)resolved.textContent=String(r.currentWeek||'—');
      if(status)status.textContent=(r.weekMode==='override'?'Override active':'Automatic')+' · '+(r.weekSource||'NFL schedule/state');
    }catch(e){if(status)status.textContent=e&&e.message?e.message:'Could not load NFL week timing.';}
  }
  async function save(){
    var form=findSurvivorForm(),card=document.getElementById('pattcNflSurvivorWeekTimingR1');if(!form||!card)return;
    var status=card.querySelector('[data-week-status]'),button=card.querySelector('[data-week-save]');
    if(button)button.disabled=true;if(status)status.textContent='Saving NFL week timing…';
    try{
      var mode=card.querySelector('[data-week-mode]').value||'auto',overrideWeek=Number(card.querySelector('[data-week-override]').value||1);
      var r=await root.apiAdminRunSportsSurvivor({gameId:gameId(form),saveWeekTiming:true,weekMode:mode,overrideWeek:overrideWeek});
      if(!r||r.success===false)throw new Error(r&&(r.error||r.message)||'Could not save NFL week timing.');
      var current=card.querySelector('[data-current-week]');if(current)current.textContent=String(r.currentWeek||'—');
      if(status)status.textContent=(r.weekMode==='override'?'Override active':'Automatic restored')+' · current NFL Week '+String(r.currentWeek||'—');
    }catch(e){if(status)status.textContent=e&&e.message?e.message:'Could not save NFL week timing.';}finally{if(button)button.disabled=false;}
  }
  function inject(){
    var form=findSurvivorForm();if(!form||document.getElementById('pattcNflSurvivorWeekTimingR1'))return;
    var build=form.querySelector('input[name="survivorBuildWeek"]');if(!build)return;
    var host=build.closest('.admin-collapsible-body')||build.parentNode;
    var card=document.createElement('div');card.id='pattcNflSurvivorWeekTimingR1';card.className='admin-card';
    card.style.cssText='margin:10px 0;padding:10px;border:1px solid rgba(68,202,255,.38);border-radius:10px';
    card.innerHTML='<strong>NFL Week Timing</strong><div class="admin-sub">Normal production stays Automatic. A numeric override is ignored unless Override mode is explicitly selected.</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px">'+
      '<label class="admin-sub">Week Mode<select class="input admin-input" data-week-mode><option value="auto">Automatic</option><option value="override">Override Automatic Week</option></select></label>'+
      '<label class="admin-sub">Current NFL Week<div class="input admin-input" data-current-week style="display:flex;align-items:center">—</div></label>'+
      '<label class="admin-sub">Override Week<input class="input admin-input" data-week-override type="number" min="1" max="18" value="1"></label></div>'+
      '<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><button type="button" class="secondary" data-week-save>Save Week Timing</button><span class="admin-sub" data-week-status>Loading…</span></div>';
    host.insertBefore(card,host.firstChild);card.querySelector('[data-week-save]').addEventListener('click',save);load();
  }
  root.PATTC_NFL_WEEK_SURVIVOR_PLAYOFF_R1={inject:inject,load:load,save:save};
  if(typeof MutationObserver!=='undefined')new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else setTimeout(inject,0);
})(window);
