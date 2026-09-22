'use strict';
const assert=require('assert'), fs=require('fs'), path=require('path'), vm=require('vm');
const R3=require('../frontend/js/ownerVisualStudioR3.js');
// Small deterministic DOM double. This verifies renderer transactions, not browser
// layout; real Wrangler/browser acceptance is a separate release gate.
function dom(){
  let document;
  class Node {
    constructor(tag){this.tagName=tag.toUpperCase();this.nodeType=1;this.children=[];this.parentNode=null;this.attrs={};this.content='';this.properties=new Map();this.classes=new Set();this.ownerDocument=document;
      this.classList={contains:x=>this.classes.has(x),toggle:(x,force)=>{const on=force===undefined?!this.classes.has(x):force;if(on)this.classes.add(x);else this.classes.delete(x);return on;},add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),[Symbol.iterator]:()=>this.classes[Symbol.iterator]()};
      this.style={setProperty:(k,v,p)=>this.properties.set(k,[String(v),p||'']),getPropertyValue:k=>this.properties.get(k)?.[0]||'',getPropertyPriority:k=>this.properties.get(k)?.[1]||'',removeProperty:k=>this.properties.delete(k)};
    }
    get parentElement(){return this.parentNode;} get isConnected(){return this===document.body||!!this.parentNode?.isConnected;}
    get id(){return this.attrs.id||'';} set id(v){this.attrs.id=v;}
    get className(){return [...this.classes].join(' ');} set className(v){this.classes=new Set(v.split(/\s+/).filter(Boolean));}
    get attributes(){return Object.entries(this.attrs).map(([name,value])=>({name,value}));}
    get firstChild(){return this.children[0]||null;}
    getAttribute(name){if(name==='style')return this.properties.size?[...this.properties].map(([k,v])=>k+':'+v[0]+(v[1]?' !important':'')).join(';'):null;if(name==='class')return this.className;return this.attrs[name]??null;}
    setAttribute(name,value){if(name==='style'){this.properties.clear();String(value).split(';').forEach(row=>{const i=row.indexOf(':');if(i>0)this.style.setProperty(row.slice(0,i).trim(),row.slice(i+1).replace(/!important/g,'').trim(),row.includes('!important')?'important':'');});}else if(name==='class')this.className=value;else this.attrs[name]=String(value);}
    removeAttribute(name){if(name==='style')this.properties.clear();else delete this.attrs[name];}
    appendChild(node){node.remove();node.parentNode=this;this.children.push(node);return node;}
    removeChild(node){node.remove();return node;}
    insertBefore(node,anchor){node.remove();node.parentNode=this;const i=this.children.indexOf(anchor);this.children.splice(i<0?this.children.length:i,0,node);return node;}
    remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
    replaceWith(node){const p=this.parentNode;const i=p.children.indexOf(this);node.remove();p.children[i]=node;node.parentNode=p;this.parentNode=null;}
    contains(node){return node===this||this.children.some(n=>n.contains(node));}
    matches(selector){return selector.split(',').some(part=>{part=part.trim();if(part==='*')return true;if(part.includes(' '))return false;
      const attribute=part.match(/\[([^=\]*]+)(\*?=)?["']?([^\]"']*)["']?\]/);if(attribute){const value=this.getAttribute(attribute[1]);if(attribute[2]==='*='){if(!String(value||'').includes(attribute[3]))return false;}else if(attribute[2]==='='){if(value!==attribute[3])return false;}else if(value==null)return false;part=part.replace(attribute[0],'');}
      const id=part.match(/#([\w-]+)/);if(id&&this.id!==id[1])return false;const classes=[...part.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);if(classes.some(c=>!this.classes.has(c)))return false;const tag=part.match(/^[a-zA-Z][\w-]*/);return !tag||tag[0].toUpperCase()===this.tagName;
    });}
    querySelectorAll(selector){const out=new Set();selector.split(',').forEach(part=>{const direct=part.trim().startsWith(':scope >');part=part.trim().replace(/^:scope >\s*/,'');const walk=node=>node.children.forEach(n=>{if(n.matches(part))out.add(n);if(!direct)walk(n);});walk(this);});return [...out];}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    get textContent(){return this.content+this.children.map(n=>n.textContent).join('');} set textContent(value){this.content=String(value);this.children.forEach(n=>n.parentNode=null);this.children=[];}
    get innerHTML(){return this.content+this.children.map(n=>n.outerHTML).join('');} set innerHTML(value){this.textContent=value;}
    get outerHTML(){return '<'+this.tagName.toLowerCase()+' id="'+this.id+'" class="'+this.className+'">'+this.innerHTML+'</'+this.tagName.toLowerCase()+'>';}
    cloneNode(deep){const node=new Node(this.tagName);node.attrs={...this.attrs};node.className=this.className;node.content=this.content;node.properties=new Map(this.properties);if(deep)this.children.forEach(n=>node.appendChild(n.cloneNode(true)));return node;}
  }
  document={createElement:tag=>new Node(tag),createDocumentFragment:()=>new Node('fragment'),getElementById:id=>document.body.querySelector('#'+id),querySelector:selector=>document.body.querySelector(selector),querySelectorAll:selector=>document.body.querySelectorAll(selector),addEventListener(){},readyState:'loading'};
  document.body=new Node('body');return {document,Node};
}
const {document,Node}=dom();
const root=new Node('main');root.id='app';document.body.appendChild(root);
const section=new Node('section');section.id='weeklyPicks';section.className='card';root.appendChild(section);
const title=new Node('h2');title.textContent='Weekly Picks';section.appendChild(title);
const button=new Node('button');button.id='picker';section.appendChild(button);
const label=new Node('span');label.className='tf-edit-label';button.appendChild(label);
const target=new Node('section');target.id='compare';target.className='card';root.appendChild(target);
section.setAttribute('style','background-image:linear-gradient(red,blue);padding:7px;min-height:88px');
const renderer=R3.createRenderer(root), key=renderer.key(section), labelKey=renderer.key(label);
let manifest=R3.normalize({items:{[key]:{style:{backgroundMode:'transparent',heightMode:'fixed',heightPx:300,headerFontSize:26,scale:110}}},hiddenSelectors:{'span.tf-edit-label':true}});
renderer.render(manifest);
assert.equal(section.style.getPropertyValue('background-color'),'transparent');assert.equal(section.style.getPropertyValue('overflow-y'),'auto');assert.equal(title.style.getPropertyValue('font-size'),'26px');assert.equal(section.style.getPropertyValue('zoom'),'1.1');
assert.equal(label.style.getPropertyValue('display'),'none');assert.equal(button.style.getPropertyValue('display'),'');
manifest.items[key].style={backgroundMode:'original',heightMode:'original'};manifest.hiddenSelectors['span.tf-edit-label']=false;renderer.render(manifest);
assert.equal(section.style.getPropertyValue('background-image'),'linear-gradient(red,blue)');assert.equal(section.style.getPropertyValue('background-color'),'');assert.equal(section.style.getPropertyValue('min-height'),'88px');assert.equal(label.style.getPropertyValue('display'),'');
manifest.groups.all={selector:'section.card',style:{backgroundMode:'color',backgroundColor:'black'}};renderer.render(manifest);
assert.equal(section.style.getPropertyValue('background-color'),'','Original must override a group color');
manifest.moves[labelKey]=renderer.key(target);renderer.render(manifest);assert.strictEqual(label.parentNode,target);
renderer.render(R3.normalize());assert.strictEqual(label.parentNode,button);assert.equal(section.style.getPropertyValue('padding'),'7px');
manifest=R3.normalize({generatedSections:{new:{title:'Split section',parentKey:'id:app'}},moves:{[labelKey]:'generated:new'}});renderer.render(manifest);
assert.equal(label.parentNode.className,'pattc-vs-generated-body');renderer.render(manifest);assert.equal(label.parentNode.className,'pattc-vs-generated-body');renderer.reset();assert.strictEqual(label.parentNode,button);assert.equal(root.querySelectorAll('details').length,0);
const legacy='dom:span.tf-edit-label|p:id-picker|i:0';
renderer.render(R3.normalize({items:{[legacy]:{style:{fontSize:31}}}}));assert.equal(label.style.getPropertyValue('font-size'),'31px');
renderer.render(R3.normalize({items:{[legacy]:{style:{fontSize:31}},[labelKey]:{original:true,style:{}}}}));assert.equal(label.style.getPropertyValue('font-size'),'');renderer.reset();
// Simulated refreshed DOM resolves deterministic element keys, including R2 IDs.
const second=R3.createRenderer(root);assert.equal(second.key(section),key);assert.equal(second.key(label),labelKey);

// Real Team Fantasy pure renderers + retained fixtures. The original DOM identity
// and globals must survive every phase, and a renderer exception, unchanged.
const mount=new Node('div');mount.id='tfGameDayMount';root.appendChild(mount);mount.textContent='REAL COMPARE';
const leaderboard=new Node('div');leaderboard.id='tfLeaderboardMount';root.appendChild(leaderboard);leaderboard.textContent='REAL LEADERBOARD';
let writes=0;
const ctx={document,console,addEventListener(){},setTimeout(){throw new Error('Preview scheduled live work');},getSession:()=>({username:'owner'}),apiAdminSaveAppearanceOverride(){writes++;},apiSavePick(){writes++;}};ctx.window=ctx;
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../frontend/js/pages/teamFantasy.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../frontend/js/ownerVisualStudioR3Demo.js'),'utf8'),ctx);
const real={real:true};ctx.TEAM_FANTASY_GAME_DAY=real;ctx.TEAM_FANTASY_COMPARE_SELECTED=['real-player'];const selected=ctx.TEAM_FANTASY_COMPARE_SELECTED;
for(const phase of ['empty','in-progress','live','final','locked']){
  for(const kind of ['leaderboard','compare']){
    const output=ctx.PATTC_STUDIO_R3_DEMO.render(root,{phase,kind,pageKey:'team-fantasy',manifest:R3.normalize()});
    assert(output.includes(kind==='compare'?'tf-compare':'tf-week-row'));
    assert.strictEqual(document.getElementById('app'),root);assert.strictEqual(document.getElementById('tfGameDayMount'),mount);assert.equal(mount.textContent,'REAL COMPARE');assert.strictEqual(ctx.TEAM_FANTASY_GAME_DAY,real);assert.strictEqual(ctx.TEAM_FANTASY_COMPARE_SELECTED,selected);
  }
}
ctx.teamFantasyRenderCompareBoard_=()=>{throw new Error('fixture renderer failed');};assert.throws(()=>ctx.PATTC_STUDIO_R3_DEMO.render(root,{phase:'live',kind:'compare',pageKey:'team-fantasy'}),/fixture renderer/);
assert.strictEqual(document.getElementById('app'),root);assert.strictEqual(ctx.TEAM_FANTASY_GAME_DAY,real);assert.equal(writes,0);
console.log('Owner Visual Studio R3 renderer properties, original restoration, movement, generated sections, and real Team Fantasy demo isolation PASS');
