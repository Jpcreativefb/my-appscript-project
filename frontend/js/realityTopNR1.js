/* PATTC Reality TV Top N R1 — isolated optional UI, no auto writes. */
(function(host){
  'use strict';
  let key='', data=null, draft=[], loading=null, saving=false;
  const esc = v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){
    const pd=typeof PICKS_PAGE_DATA==='object'?PICKS_PAGE_DATA:{};
    const s=typeof getSession==='function'?(getSession()||{}):{};
    if(!pd.realityTvView || pd.realityTvView.enabled!==true || !pd.gameId || !s.username || !s.token)return null;
    return {gameId:String(pd.gameId),username:String(s.username),token:String(s.token),leagueId:typeof getApiLeagueId_==='function'?getApiLeagueId_():''};
  }
  function fetchState(){
    const ctx=context(), root=document.getElementById('realityTopNMount');
    if(!root||!ctx)return;
    const next=[ctx.gameId,ctx.username,ctx.token].join('::');
    if(next!==key){key=next;data=null;draft=[];loading=null;}
    if(data){render();return;}
    if(loading)return;
    root.innerHTML='<div class="season-anchor-card loading" aria-live="polite">Loading Top N ranking…</div>';
    loading=api('getRealityTopN',ctx).then(r=>{
      if(key!==next)return;
      if(!r||r.success===false)throw new Error(r&&r.error||'Could not load Top N ranking.');
      data=r;draft=(r.orderedIds||[]).slice();render();
    }).catch(err=>{if(key===next&&root.isConnected)root.textContent=err.message||String(err);})
      .finally(()=>{if(key===next)loading=null;});
  }
  function render(message){
    const root=document.getElementById('realityTopNMount');if(!root||!data)return;
    if(data.enabled!==true){root.innerHTML='';return;}
    const roster=Array.isArray(data.roster)?data.roster:[];
    const n=Number(data.n), locked=!!data.locked || data.canSave!==true, scoring=data.scoring;
    const rows=Array.from({length:n},(_,i)=>{
      const id=draft[i]||'';
      const current=roster.find(x=>x.id===id);
      const opts=roster.filter(x=>x.eligible!==false||x.id===id);
      const list=['<option value="">Choose contestant…</option>'].concat(opts.map(x=>`<option value="${esc(x.id)}" ${id===x.id?'selected':''}>${esc(x.name)}</option>`)).join('');
      const lost=scoring&&scoring.lostPositions&&scoring.lostPositions[String(id).toLowerCase()];
      return `<label class="reality-topn-row" style="display:flex;gap:8px;align-items:center;padding:5px 0"><strong style="min-width:70px">#${i+1} · ${n-i} pts</strong>${locked?`<span>${esc(current&&current.name||'Unselected')}${lost?' · Eliminated':''}</span>`:`<select class="input" data-rtv-topn-index="${i}" aria-label="Rank ${i+1}" style="flex:1;min-width:0">${list}</select>`}</label>`;
    }).join('');
    const s=scoring?`<p>Top N season total: <b>${esc(scoring.rawTotal)}</b> · Main-game contribution: <b>${esc(scoring.overallContribution)}</b> · Exact-finish bonus: ${esc(scoring.exactFinishBonus)}</p>`:'';
    root.innerHTML=`<details class="season-anchor-card reality-topn-card" ${data.orderedIds&&data.orderedIds.length?'':'open'}><summary class="season-anchor-card-header"><h2>Top ${n} Survival Ranking</h2><small>${locked?'Rankings locked':'Season-long picks'}</small></summary><div class="season-anchor-card-body"><p>Rank ${n} contestants from predicted champion to position ${n}. Once locked, eliminated positions lose their value permanently and receive a one-time equal-value penalty.</p>${s}${data.hiddenBySpoiler?'<p>Results hidden by Spoiler Shield until revealed.</p>':''}${rows}${locked?'':`<button class="button" type="button" data-rtv-topn-save ${saving?'disabled':''}>${saving?'Saving…':'Save Ranking'}</button>`}<div data-rtv-topn-message role="status">${esc(message||'')}</div></div></details>`;
    root.querySelectorAll('[data-rtv-topn-index]').forEach(select=>select.addEventListener('change',e=>{
      draft[Number(e.target.dataset.rtvTopnIndex)]=e.target.value;
    }));
    const button=root.querySelector('[data-rtv-topn-save]');if(button)button.addEventListener('click',save);
  }
  async function save(){
    if(saving||!data||data.locked)return;
    const ctx=context();if(!ctx)return;
    const original=key, choices=draft.slice();
    if(choices.length!==Number(data.n)||choices.some(x=>!x)||new Set(choices).size!==choices.length){render('Choose '+data.n+' different contestants before saving.');return;}
    saving=true;render();
    try{
      const result=await apiPost('saveRealityTopNBallot',{...ctx,orderedIds:choices});
      if(!result||result.success!==true)throw new Error(result&&result.error||'Could not save ranking.');
      if(original!==key)return;
      if(JSON.stringify(result.orderedIds)!==JSON.stringify(choices.map(x=>String(x).toLowerCase())))throw new Error('Saved ranking did not match the selected positions.');
      const fresh=await api('getRealityTopN',ctx);
      if(original!==key)return;
      if(!fresh||fresh.success!==true)throw new Error('Could not verify saved ranking.');
      data=fresh;draft=(fresh.orderedIds||[]).slice();
      if(original===key) { saving=false; render('Ranking saved and verified.'); }
    }catch(err){if(original===key)render(err.message||String(err));}
    finally{saving=false;}
  }
  const adminPrefix='realityTopNAdmin_';
  const adminId=id=>adminPrefix+encodeURIComponent(id);
  function adminPanel(seasonId){const safe=encodeURIComponent(seasonId);return `<details class="reality-tv-admin-section"><summary><strong>Top N Survival Ranking</strong> · Optional season-long game</summary><div id="${adminId(seasonId)}" data-rtv-topn-season="${safe}"><button type="button" class="admin-small-button" data-rtv-topn-admin-load="${safe}">Load Top N settings</button></div></details>`;}
  async function adminLoad(seasonId){
    const root=document.getElementById(adminId(seasonId));if(!root)return;
    root.textContent='Loading Top N settings…';
    try{
      const result=await api('adminGetRealityTopNSettings',{seasonId});
      if(!result||!result.success)throw new Error(result&&result.error||'Settings unavailable.');
      const s=result.settings||{}, configured=!!result.configured;
      const lock=s.ballotLockDateTime?new Date(s.ballotLockDateTime):null;
      const local=lock&&!isNaN(lock.getTime())?new Date(lock.getTime()-lock.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
      const form=`<div><label><input type="checkbox" data-topn="enabled" ${s.enabled?'checked':''}> Enable Top N</label></div>
      <label>Ranked contestants <input class="input" data-topn="n" type="number" min="2" max="64" value="${esc(s.n||10)}"></label>
      <label>First scoring episode <input class="input" data-topn="start" type="number" min="1" value="${esc(s.startEpisodeNumber||1)}"></label>
      <label>Ballot lock (local time) <input class="input" data-topn="lock" type="datetime-local" value="${local}"></label>
      <label>Overall contribution (%) <input class="input" data-topn="weight" type="number" min="0" max="100" value="${esc(configured?s.contributionPercent:25)}"></label>
      <label>Exact-finish bonus multiplier <input class="input" data-topn="bonus" type="number" min="0" max="10" value="${esc(configured?s.bonusMultiplier:1)}"></label>
      <p>Existing ballots: ${esc(result.ballotCount||0)}. Settings remain OFF for existing seasons unless explicitly enabled.</p>
      <button type="button" class="admin-small-button" data-rtv-topn-admin-save>Save Top N settings</button><div data-rtv-topn-admin-status role="status"></div>`;
      root.innerHTML=form;
      root.querySelector('[data-rtv-topn-admin-save]').addEventListener('click',()=>adminSave(seasonId,root));
    }catch(err){root.textContent=err.message||String(err);}
  }
  async function adminSave(seasonId,root){
    const get=id=>root.querySelector(`[data-topn="${id}"]`), msg=root.querySelector('[data-rtv-topn-admin-status]');
    const date=new Date(get('lock').value);if(!Number.isFinite(date.getTime())){msg.textContent='Choose a valid ballot lock date and time.';return;}
    const payload={seasonId,enabled:get('enabled').checked,n:Number(get('n').value),startEpisodeNumber:Number(get('start').value),ballotLockDateTime:date.toISOString(),contributionPercent:Number(get('weight').value),bonusMultiplier:Number(get('bonus').value)};
    msg.textContent='Saving…';
    try{const result=await apiPost('adminSaveRealityTopNSettings',payload);if(!result||result.success!==true)throw new Error(result&&result.error||'Could not save settings.');await adminLoad(seasonId);const next=document.getElementById(adminId(seasonId));if(next){const m=next.querySelector('[data-rtv-topn-admin-status]');if(m)m.textContent='Top N settings saved.';}}
    catch(err){msg.textContent=err.message||String(err);}
  }
  document.addEventListener('click',function(event){const target=event.target.closest('[data-rtv-topn-admin-load]');
    if(target)adminLoad(decodeURIComponent(target.dataset.rtvTopnAdminLoad));
  });
  host.PATTC_REALITY_TOPN_R1={mount:fetchState,adminPanel,adminLoad};
})(window);
