import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWorkspaceTransitions} from '../src/transitions.js';

const markup=`<!doctype html><body>
  <a class="portal-node" data-portal="check" href="#check"><span class="portal-content">检查材料</span></a>
  <a class="portal-node" data-portal="contacts" href="#contacts"><span class="portal-content">联系家人</span></a>
  <div id="backdrop" aria-hidden="true"></div>
  <dialog><section class="workspace-surface"><header>标题</header><main>内容</main><footer>说明</footer></section></dialog>
</body>`;

function fixture(t){
  const dom=new JSDOM(markup,{pretendToBeVisual:true,url:'https://qinan.test'});
  const document=dom.window.document,dialog=document.querySelector('dialog'),surface=dialog.firstElementChild;
  const backdrop=document.querySelector('#backdrop'),portals=[...document.querySelectorAll('.portal-node')];
  const calls=[],stages=[],renders=[];let enabled=true,throwNext=false;
  surface.getBoundingClientRect=()=>({left:120,top:60,width:900,height:700});
  portals.forEach((node,i)=>{node.getBoundingClientRect=()=>({left:40+i*700,top:200,width:240,height:160});});
  dialog.showModal=()=>{assert.equal(dialog.open,false);dialog.open=true;calls.push('show');};
  dialog.close=()=>{assert.equal(dialog.open,true);dialog.open=false;calls.push('close');};
  function animate(target,params){
    if(throwNext){throwNext=false;throw new Error('injected animation failure');}
    const stage={kind:target.classList?.contains('workspace-proxy')?'morph':'fade',params,target,complete(){if(stage.done)return;stage.done=true;params.onComplete?.();},cancel(){stage.cancelled=true;}};
    stages.push(stage);return stage;
  }
  const controller=createWorkspaceTransitions({dialog,surface,backdrop,portals,animate,
    createLayout(){throw new Error('Live content must never enter a shared layout snapshot');},
    motionEnabled:()=>enabled,
    onBusy:()=>calls.push('busy'),onHome:()=>calls.push('home'),onClosed:()=>calls.push('closed'),onOpened:()=>calls.push('opened'),
  });
  const navigate=(key,portal=portals.find(node=>node.dataset.portal===key))=>controller.navigate({key,portal,render(){renders.push(key);surface.querySelector('main').textContent=key;}});
  const complete=()=>{const stage=stages.find(item=>!item.done&&!item.cancelled);assert.ok(stage,'an animation is pending');stage.complete();return stage;};
  const open=()=>{navigate('check');complete();complete();complete();assert.equal(controller.state,'open');};
  t.after(()=>{controller.destroy();dom.window.close();});
  return {dom,document,dialog,surface,backdrop,portals,calls,stages,renders,controller,navigate,complete,open,setMotion:value=>{enabled=value;},failNext:()=>{throwNext=true;}};
}

function assertSettled(f,open){
  assert.equal(f.controller.state,open?'open':'closed');assert.equal(f.controller.busy,false);
  assert.equal(f.dialog.open,open);assert.equal(f.dialog.classList.contains('is-transitioning'),false);
  assert.ok([...f.surface.children].every(node=>node.style.opacity==='1'));
  assert.equal(f.dialog.querySelector('.workspace-proxy').style.display,'none');
  assert.equal(f.document.body.classList.contains('feature-open'),open);
  assert.equal(f.backdrop.classList.contains('is-visible'),open);
  assert.equal(f.backdrop.style.transition,'');
  assert.equal(f.backdrop.style.getPropertyValue('backdrop-filter'),'');
  if(!open){assert.equal(f.backdrop.classList.contains('is-visible'),false);assert.equal(f.portals[0].querySelector('.portal-content').style.opacity,'1');}
}

test('closing clears visual dimming immediately while native dialog and scroll lock survive proxy return',t=>{
  const f=fixture(t),{controller,dialog,surface,backdrop,portals,calls,stages}=f;
  f.navigate('check');assert.equal(controller.state,'opening');assert.equal(dialog.open,false);
  assert.equal(stages.at(-1).params.duration,90);f.complete();
  assert.equal(dialog.open,true);assert.equal(stages.at(-1).kind,'morph');assert.equal(stages.at(-1).params.duration,480);
  const proxy=dialog.querySelector('.workspace-proxy');assert.equal(proxy.children.length,0);assert.equal(proxy.textContent,'');
  assert.deepEqual(stages.at(-1).params.width,[240,900]);assert.equal(proxy.style.width,'240px');
  assert.ok(dialog.classList.contains('is-transitioning'));assert.ok([...surface.children].every(node=>node.style.opacity==='0'));
  f.complete();assert.equal(proxy.style.display,'none');assert.equal(stages.at(-1).params.duration,160);
  f.complete();assertSettled(f,true);assert.equal(calls.filter(c=>c==='opened').length,1);
  f.navigate('home');assert.equal(stages.at(-1).params.duration,90);
  assert.equal(backdrop.classList.contains('is-visible'),false,'dimming ends at close start');
  assert.equal(backdrop.style.transition,'none');assert.equal(backdrop.style.opacity,'0');
  assert.equal(backdrop.style.visibility,'hidden');assert.equal(backdrop.style.getPropertyValue('backdrop-filter'),'backdropFilter' in backdrop.style?'none':'');
  assert.equal(backdrop.style.background,'transparent');
  assert.equal(dialog.open,true);assert.equal(f.document.body.classList.contains('feature-open'),true);
  f.complete();
  assert.equal(dialog.open,true,'native top layer must not close at morph start');
  assert.equal(stages.at(-1).params.duration,420);assert.deepEqual(stages.at(-1).params.width,[900,240]);
  assert.equal(backdrop.classList.contains('is-visible'),false);assert.equal(calls.includes('home'),false);
  assert.equal(f.document.body.classList.contains('feature-open'),true);
  f.complete();assert.equal(dialog.open,false);assert.equal(stages.at(-1).params.duration,120);
  assert.equal(backdrop.classList.contains('is-visible'),false);f.complete();assertSettled(f,false);
  assert.equal(calls.filter(c=>c==='home').length,1);assert.strictEqual(f.document.activeElement,portals[0]);
});

test('latest queued route wins after close; ambient never restarts between queued windows',t=>{
  const f=fixture(t);f.open();f.navigate('home');f.navigate('history');f.navigate('contacts');
  assert.equal(f.backdrop.style.getPropertyValue('backdrop-filter'),'backdropFilter' in f.backdrop.style?'none':'');
  f.complete();f.complete();assert.deepEqual(f.renders,['check']);f.complete();
  assert.equal(f.backdrop.classList.contains('is-visible'),true,'queued opening restores its backdrop');
  assert.equal(f.backdrop.style.transition,'');assert.equal(f.backdrop.style.getPropertyValue('backdrop-filter'),'');
  assert.equal(f.document.body.classList.contains('feature-open'),true);
  assert.equal(f.controller.state,'opening');assert.deepEqual(f.renders,['check','contacts']);assert.equal(f.calls.includes('home'),false);
  f.complete();f.complete();f.complete();assertSettled(f,true);assert.equal(f.portals[1].style.visibility,'hidden');
});

test('repeat closes cancel queued reopens without duplicate lifecycle work',t=>{
  const f=fixture(t);f.open();f.navigate('home');f.navigate('contacts');f.navigate('home');f.navigate('home');
  f.complete();f.complete();f.complete();assertSettled(f,false);
  assert.deepEqual(f.renders,['check']);assert.equal(f.calls.filter(c=>c==='close').length,1);assert.equal(f.calls.filter(c=>c==='closed').length,1);
});

test('pause at every phase cancels its timeline, settles one lifecycle and ignores stale callbacks',t=>{
  const f=fixture(t);
  for(const phase of [0,1,2]){
    f.navigate('check');for(let i=0;i<phase;i++)f.complete();
    const interrupted=f.stages.at(-1);f.setMotion(false);f.controller.complete();assertSettled(f,true);
    assert.equal(interrupted.cancelled,true);interrupted.params.onComplete();assertSettled(f,true);
    f.setMotion(true);f.navigate('home');for(let i=0;i<phase;i++)f.complete();
    const closing=f.stages.at(-1);f.setMotion(false);f.controller.complete();assertSettled(f,false);
    closing.params.onComplete();assertSettled(f,false);f.setMotion(true);
  }
});

test('animation-construction failures at every phase restore visible usable terminal states',t=>{
  for(const phase of [0,1,2]){
    const f=fixture(t);
    if(phase===0)f.failNext();f.navigate('check');
    for(let i=0;i<phase;i++){if(i===phase-1)f.failNext();f.complete();}
    assertSettled(f,true);
    if(phase===0)f.failNext();f.navigate('home');
    for(let i=0;i<phase;i++){if(i===phase-1)f.failNext();f.complete();}
    assertSettled(f,false);
  }
});

test('nested text styles never enter a geometry snapshot or get restored by the proxy',t=>{
  const f=fixture(t);f.navigate('check');
  const text=f.document.createElement('p');text.textContent='可见的答题解析';text.style.opacity='1';f.surface.querySelector('main').append(text);
  f.complete();f.complete();f.complete();
  assert.equal(text.style.opacity,'1');assert.equal(text.style.visibility,'');
  f.navigate('home');f.complete();f.complete();f.complete();assert.equal(text.style.opacity,'1');
  assert.ok(f.stages.filter(s=>s.kind==='morph').every(s=>s.target.className==='workspace-proxy'));
});

test('internal navigation does not replay shell; an early close safely settles the opening',t=>{
  const f=fixture(t);f.open();const count=f.stages.length;f.navigate('contacts');
  assert.equal(f.stages.length,count);assertSettled(f,true);
  f.navigate('home');f.controller.complete();f.navigate('check');f.navigate('home');assertSettled(f,false);
});

test('hiding the tab or resizing during a morph restores its terminal layout',t=>{
  const f=fixture(t);f.navigate('check');f.complete();
  Object.defineProperty(f.document,'hidden',{value:true,configurable:true});
  f.document.dispatchEvent(new f.dom.window.Event('visibilitychange'));assertSettled(f,true);
  Object.defineProperty(f.document,'hidden',{value:false,configurable:true});
  f.navigate('home');f.complete();f.dom.window.dispatchEvent(new f.dom.window.Event('resize'));assertSettled(f,false);
});

test('a missing animation callback is bounded by the recovery timer',t=>{
  const f=fixture(t);t.mock.timers.enable({apis:['setTimeout']});
  f.navigate('check');t.mock.timers.tick(400);assertSettled(f,true);
  f.navigate('home');f.complete();t.mock.timers.tick(750);assertSettled(f,false);
});

test('destroy clears masks, restores origin, removes the proxy and rejects late completion',t=>{
  const f=fixture(t);f.navigate('check');f.complete();const stage=f.stages.at(-1);
  f.controller.destroy();stage.params.onComplete();f.navigate('contacts');
  assert.equal(stage.cancelled,true);assert.equal(f.controller.state,'closed');assert.equal(f.dialog.open,false);
  assert.equal(f.dialog.querySelector('.workspace-proxy'),null);assert.equal(f.backdrop.classList.contains('is-visible'),false);
  assert.equal(f.backdrop.style.transition,'');assert.equal(f.backdrop.style.getPropertyValue('backdrop-filter'),'');assert.equal(f.document.body.classList.contains('feature-open'),false);
  assert.equal(f.portals[0].style.visibility,'');assert.equal(f.portals[0].querySelector('.portal-content').style.opacity,'1');
});

test('real Anime.js animates only proxy geometry and completes usable dialog states',async t=>{
  const dom=new JSDOM(markup,{pretendToBeVisual:true,url:'https://qinan.test'}),w=dom.window;
  const keys=['window','document','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'];
  const previous=new Map(keys.map(key=>[key,globalThis[key]]));
  for(const key of keys)globalThis[key]=['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?w[key].bind(w):w[key];
  const {animate,engine}=await import('animejs');
  const dialog=w.document.querySelector('dialog'),surface=dialog.firstElementChild,portals=[...w.document.querySelectorAll('.portal-node')];
  dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
  surface.getBoundingClientRect=()=>({left:100,top:50,width:900,height:700});portals[0].getBoundingClientRect=()=>({left:25,top:200,width:240,height:160});
  const animations=[];
  const controller=createWorkspaceTransitions({dialog,surface,portals,backdrop:w.document.querySelector('#backdrop'),motionEnabled:()=>true,
    animate(target,params){const animation=animate(target,params);animations.push(animation);return animation;},
  });
  t.after(()=>{controller.destroy();engine.pause();w.close();for(const [key,value] of previous)globalThis[key]=value;});
  controller.navigate({key:'check',portal:portals[0],render(){}});
  for(let i=0;i<3;i++)animations[i].complete();
  assert.equal(controller.state,'open');assert.equal(dialog.open,true);assert.equal(dialog.querySelector('.workspace-proxy').style.width,'900px');
  controller.navigate({key:'home'});for(let i=3;i<6;i++)animations[i].complete();
  assert.equal(controller.state,'closed');assert.equal(dialog.open,false);assert.equal(portals[0].firstElementChild.style.opacity,'1');
  // Engine integration only: JSDOM cannot verify browser compositing or visual smoothness.
});
