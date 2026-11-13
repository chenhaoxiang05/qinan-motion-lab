import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWorkspaceTransitions} from '../src/transitions.js';

const markup=`<!doctype html><body>
  <a class="portal-node" data-portal="check" href="#check"><span class="portal-content">检查材料</span></a>
  <a class="portal-node" data-portal="contacts" href="#contacts"><span class="portal-content">联系家人</span></a>
  <div id="backdrop" aria-hidden="true"></div>
  <dialog><section class="portal-surface"><header>标题</header><main>内容</main><footer>说明</footer></section></dialog>
</body>`;

function fixture(t){
  const dom=new JSDOM(markup,{pretendToBeVisual:true,url:'https://qinan.test'});
  const document=dom.window.document,dialog=document.querySelector('dialog'),surface=dialog.firstElementChild;
  const backdrop=document.querySelector('#backdrop'),portals=[...document.querySelectorAll('.portal-node')];
  const calls=[],stages=[],renders=[];let enabled=true;
  dialog.showModal=()=>{assert.equal(dialog.open,false);dialog.open=true;calls.push('show');};
  dialog.close=()=>{assert.equal(dialog.open,true);dialog.open=false;calls.push('close');};
  function timeline(kind,params,target){
    const stage={kind,params,target,complete(){if(stage.done)return;stage.done=true;params.onComplete?.();},cancel(){stage.cancelled=true;}};
    stages.push(stage);return stage;
  }
  const layout={
    record(){calls.push('record');},
    animate(params){return timeline('expand',params);},
    update(callback,params){calls.push('record');callback();return timeline('collapse',params);},
    revert(){calls.push('revert');},
  };
  const controller=createWorkspaceTransitions({dialog,surface,backdrop,portals,
    animate:(target,params)=>timeline('fade',params,target),
    createLayout:(root,params)=>{assert.strictEqual(root,dialog);assert.deepEqual(params.children,['.portal-surface']);return layout;},
    motionEnabled:()=>enabled,
    onBusy:()=>calls.push('busy'),onHome:()=>calls.push('home'),onClosed:()=>calls.push('closed'),
  });
  const navigate=(key,portal=portals.find(node=>node.dataset.portal===key))=>controller.navigate({key,portal,render(){renders.push(key);surface.querySelector('main').textContent=key;}});
  const complete=()=>{const stage=stages.find(item=>!item.done&&!item.cancelled);assert.ok(stage,'an animation is pending');stage.complete();return stage;};
  const open=()=>{navigate('check');complete();complete();complete();assert.equal(controller.state,'open');};
  t.after(()=>{controller.destroy();dom.window.close();});
  return {dom,document,dialog,surface,backdrop,portals,calls,stages,renders,controller,navigate,complete,open,setMotion:value=>{enabled=value;}};
}

test('native dialog shell morph runs between explicit text fades and retains its backdrop through return',t=>{
  const f=fixture(t),{controller,dialog,surface,backdrop,portals,calls,stages}=f;
  f.navigate('check');
  assert.equal(controller.state,'opening');assert.equal(dialog.open,false);
  assert.equal(stages.at(-1).params.duration,90);assert.ok(backdrop.classList.contains('is-visible'));
  f.complete();
  assert.equal(dialog.open,true);assert.equal(stages.at(-1).kind,'expand');
  assert.equal(stages.at(-1).params.duration,600);assert.ok(dialog.classList.contains('is-transitioning'));
  assert.ok([...surface.children].every(node=>node.style.opacity==='0'));
  f.complete();
  assert.equal(controller.state,'opening');assert.equal(stages.at(-1).params.duration,160);
  f.complete();assert.equal(controller.state,'open');assert.equal(portals[0].style.visibility,'hidden');
  f.navigate('home');
  assert.equal(controller.state,'closing');assert.equal(dialog.open,true);assert.equal(stages.at(-1).params.duration,90);
  assert.equal(calls.includes('home'),false);
  f.complete();
  assert.equal(dialog.open,false);assert.equal(stages.at(-1).kind,'collapse');assert.equal(stages.at(-1).params.duration,420);
  assert.ok(dialog.classList.contains('is-transitioning'));assert.ok(backdrop.classList.contains('is-visible'));
  assert.equal(portals[0].querySelector('.portal-content').style.opacity,'0');
  f.complete();
  assert.equal(controller.state,'closing');assert.equal(stages.at(-1).params.duration,120);
  assert.ok(backdrop.classList.contains('is-visible'));assert.equal(calls.includes('home'),false);
  f.complete();
  assert.equal(controller.state,'closed');assert.equal(portals[0].querySelector('.portal-content').style.opacity,'1');
  assert.equal(backdrop.classList.contains('is-visible'),false);assert.equal(f.document.body.classList.contains('feature-open'),false);
  assert.equal(calls.filter(call=>call==='home').length,1);assert.equal(calls.filter(call=>call==='closed').length,1);
  assert.strictEqual(f.document.activeElement,portals[0]);
});

test('closing consumes the latest navigation only after return finishes and never resumes ambient between windows',t=>{
  const f=fixture(t);f.open();f.navigate('home');
  f.navigate('history');f.navigate('contacts');
  assert.deepEqual(f.renders,['check']);assert.equal(f.controller.state,'closing');
  f.complete();f.complete();
  assert.deepEqual(f.renders,['check']);assert.ok(f.backdrop.classList.contains('is-visible'));
  f.complete();
  assert.equal(f.controller.state,'opening');assert.deepEqual(f.renders,['check','contacts']);
  assert.equal(f.calls.includes('home'),false);assert.equal(f.portals[0].style.visibility,'');
  f.complete();f.complete();f.complete();
  assert.equal(f.controller.state,'open');assert.equal(f.portals[1].style.visibility,'hidden');
});

test('repeat closes are idempotent and a later close cancels a queued reopen',t=>{
  const f=fixture(t);f.open();f.navigate('home');f.navigate('contacts');f.navigate('home');f.navigate('home');
  f.complete();f.complete();f.complete();
  assert.equal(f.controller.state,'closed');assert.deepEqual(f.renders,['check']);
  assert.equal(f.calls.filter(call=>call==='close').length,1);assert.equal(f.calls.filter(call=>call==='closed').length,1);
  assert.equal(f.calls.filter(call=>call==='home').length,1);
});

test('pausing at every transition phase settles one lifecycle and ignores stale completion callbacks',t=>{
  const f=fixture(t);
  for(const phase of [0,1,2]){
    f.navigate('check');for(let i=0;i<phase;i++)f.complete();
    const interrupted=f.stages.at(-1);f.setMotion(false);f.controller.complete();
    assert.equal(f.controller.state,'open');assert.equal(f.dialog.open,true);
    interrupted.params.onComplete?.();assert.equal(f.controller.state,'open');
    f.setMotion(true);f.navigate('home');for(let i=0;i<phase;i++)f.complete();
    f.setMotion(false);f.controller.complete();
    assert.equal(f.controller.state,'closed');assert.equal(f.dialog.open,false);assert.equal(f.controller.busy,false);
    assert.equal(f.backdrop.classList.contains('is-visible'),false);f.setMotion(true);
  }
});

test('internal navigation replaces content without animating the dialog and early close settles safely',t=>{
  const f=fixture(t);f.open();const count=f.stages.length;
  f.navigate('contacts');assert.equal(f.stages.length,count);assert.equal(f.controller.state,'open');
  assert.deepEqual(f.renders,['check','contacts']);
  f.navigate('home');f.controller.complete();f.navigate('check');f.navigate('home');
  assert.equal(f.controller.state,'closed');assert.equal(f.dialog.open,false);
  assert.equal(f.backdrop.classList.contains('is-visible'),false);
});

test('destroy cancels active work, restores source content and prevents stale callbacks from reopening',t=>{
  const f=fixture(t);f.navigate('check');f.complete();const stage=f.stages.at(-1);
  f.controller.destroy();stage.params.onComplete?.();f.navigate('contacts');
  assert.equal(stage.cancelled,true);assert.equal(f.controller.state,'closed');assert.equal(f.dialog.open,false);
  assert.equal(f.backdrop.classList.contains('is-visible'),false);assert.equal(f.portals[0].style.visibility,'');
  assert.equal(f.portals[0].querySelector('.portal-content').style.opacity,'1');assert.deepEqual(f.renders,['check']);
});

test('the real Anime.js createLayout settles callbacks and unchanged geometry without locking the controller',async t=>{
  const dom=new JSDOM(markup,{pretendToBeVisual:true,url:'https://qinan.test'}),w=dom.window;
  const keys=['window','document','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'];
  const previous=new Map(keys.map(key=>[key,globalThis[key]]));
  for(const key of keys)globalThis[key]=['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?w[key].bind(w):w[key];
  const {createLayout,engine}=await import('animejs');
  const style=w.document.createElement('style');
  style.textContent='*{transform:none} dialog{display:flex} dialog:not([open]) .portal-surface{visibility:hidden}';
  w.document.head.append(style);
  const dialog=w.document.querySelector('dialog'),surface=dialog.firstElementChild,portals=[...w.document.querySelectorAll('.portal-node')];
  dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
  const pending=[],layouts=[];
  const controller=createWorkspaceTransitions({dialog,surface,portals,backdrop:w.document.querySelector('#backdrop'),motionEnabled:()=>true,
    animate(target,params){const stage={complete(){params.onComplete();},cancel(){}};pending.push(stage);return stage;},
    createLayout(root,params){const layout=createLayout(root,params);layouts.push(layout);return layout;},
  });
  t.after(()=>{controller.destroy();engine.pause();w.close();for(const [key,value] of previous)globalThis[key]=value;});
  controller.navigate({key:'check',portal:portals[0],render(){}});
  pending.shift().complete();
  assert.ok(layouts[0].timeline,'real layout timeline was created');
  layouts[0].timeline.complete();
  pending.shift()?.complete();
  assert.equal(controller.state,'open');assert.equal(dialog.open,true);
  controller.navigate({key:'home'});
  pending.shift().complete();layouts[0].timeline.complete();pending.shift()?.complete();
  assert.equal(controller.state,'closed');assert.equal(dialog.open,false);
  // JSDOM supplies no geometry. This exercises the no-layout-change completion
  // branch, not browser rendering, top-layer compositing or visual smoothness.
  assert.equal(dialog.classList.contains('is-transitioning'),false);
});
