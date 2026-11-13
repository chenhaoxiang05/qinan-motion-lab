import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {guideMarkup,mountUsageGuide} from '../src/usage-guide.js';
import {GUIDE_EXAMPLES} from '../src/guide-examples.js';

function setup(t,{islands={},motion=true,animationError=false}={}) {
  const dom=new JSDOM(`<dialog open><div id="guideHost">${guideMarkup()}</div></dialog>`,{url:'https://qinan.test/',pretendToBeVisual:true});
  const doc=dom.window.document,host=doc.querySelector('#guideHost'),animations=[],started=[],closed=[];
  dom.window.fetch=()=>{throw new Error('Teaching examples cannot make API requests');};
  dom.window.localStorage.setItem('qinan-contacts','[]');
  const animate=(node,options)=>{if(animationError)throw new Error('No animation');node.style.opacity='.2';node.style.transform='translateY(12px)';const animation={node,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(animation);return animation;};
  const guide=mountUsageGuide(host,{islands,animate,motionEnabled:()=>motion,onStart:kind=>started.push(kind),onClose:()=>closed.push(true)});
  t.after(()=>{guide.destroy();dom.window.close();});
  return {dom,doc,host,guide,animations,started,closed,$:selector=>host.querySelector(selector)};
}

test('each local material progresses through meaningful evidence and independent verification without a fabricated report',t=>{
  const {$,host,doc,started,closed}=setup(t);
  assert.equal(doc.querySelector('dialog').classList.contains('is-usage-guide'),true);
  for(const kind of ['audio','video','image','chat']) {
    $(`[data-guide-kind="${kind}"]`).click();
    assert.equal($(`[data-guide-kind="${kind}"]`).getAttribute('aria-selected'),'true');
    assert.equal($('#guidePanel').getAttribute('aria-labelledby'),`guide-type-${kind}`);
    assert.equal($('[data-guide-step="0"]').getAttribute('aria-current'),'step');
    assert.ok($('#guidePanel').textContent.includes(GUIDE_EXAMPLES[kind].quote));
    assert.equal(host.querySelector('audio,video'),null,'no fake playback controls');
    $('[data-guide-next]').click();
    assert.equal($('[data-guide-step="1"]').getAttribute('aria-current'),'step');
    assert.equal(host.querySelectorAll('.usage-clues li').length,3);
    assert.ok($('#guidePanel').textContent.includes(GUIDE_EXAMPLES[kind].clues[0].detail));
    $('[data-guide-next]').click();
    assert.equal($('[data-guide-step="2"]').getAttribute('aria-current'),'step');
    assert.equal(host.querySelectorAll('.usage-checklist li').length,3);
    assert.ok($('[data-guide-faq]').textContent.includes(GUIDE_EXAMPLES[kind].faq.answer));
    assert.equal(host.querySelector('[href^="tel:"]'),null);
    $('[data-guide-next]').click();assert.equal(started.at(-1),kind);
  }
  assert.deepEqual(started,['audio','video','image','chat']);
  assert.equal(doc.defaultView.localStorage.length,1);
  assert.equal(doc.defaultView.localStorage.getItem('qinan-contacts'),'[]');
  assert.equal(doc.defaultView.sessionStorage.length,0);
  $('#helpDone').click();assert.equal(closed.length,1);
});

test('example tabs support arrows, Home and End and restart at the material step',t=>{
  const {$,dom,doc}=setup(t);
  $('[data-guide-step="2"]').click();
  const audio=$('[data-guide-kind="audio"]');audio.focus();
  audio.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(doc.activeElement.dataset.guideKind,'video');
  assert.equal($('[data-guide-step="0"]').getAttribute('aria-current'),'step');
  doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true}));
  assert.equal(doc.activeElement.dataset.guideKind,'chat');
  doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  assert.equal(doc.activeElement.dataset.guideKind,'audio');
  $('[data-guide-next]').click();assert.equal(doc.activeElement.id,'guideStepTitle');
  $('[data-guide-back]').click();assert.equal($('[data-guide-back]').disabled,true);
});

test('counter is stable while FAQ roots unmount before replacing their DOM and lazy islands can arrive later',t=>{
  const islands={},destroyed=[],updates=[],mounted=[];
  const {$,guide}=setup(t,{islands});
  assert.match($('[data-guide-counter]').textContent,/1 \/ 3/);
  islands.mountCounter=(host,props)=>{host.textContent='counter';mounted.push('counter');return {update(next){updates.push(next.value);},destroy(){assert.equal(host.isConnected,true);destroyed.push('counter');host.replaceChildren();}};};
  islands.mountFaq=(host,props)=>{host.textContent=props.items[0].answer;mounted.push('faq');return {update(next){assert.equal(next.items.length,1);},destroy(){assert.equal(host.isConnected,true,'unmount occurs while FAQ parent remains connected');destroyed.push('faq');host.replaceChildren();}};};
  guide.refreshIslands();guide.refreshIslands();assert.deepEqual(mounted,['counter']);
  $('[data-guide-step="2"]').click();assert.deepEqual(mounted,['counter','faq']);
  $('[data-guide-kind="chat"]').click();assert.deepEqual(destroyed,['faq']);
  assert.ok(updates.includes(3));assert.equal(updates.at(-1),1);
  $('[data-guide-step="2"]').click();guide.destroy();guide.destroy();
  assert.deepEqual(destroyed,['faq','faq','counter']);
  const before=mounted.length;guide.refreshIslands();guide.setPaused(false);assert.equal(mounted.length,before);
});

test('pause, page hiding and disposal settle finite motion without late writes or stale callbacks',t=>{
  const {$,guide,doc,dom,animations,started}=setup(t);
  const first=animations.at(-1);$('[data-guide-next]').click();assert.equal(first.cancelled,true);
  const second=animations.at(-1),inner=$('.usage-stage-inner');
  guide.setPaused(true);assert.equal(second.cancelled,true);assert.equal(inner.style.opacity,'1');assert.equal(inner.style.transform,'none');
  second.options.onComplete();assert.equal(inner.style.opacity,'1');
  guide.setPaused(false);$('[data-guide-next]').click();
  const third=animations.at(-1);
  Object.defineProperty(doc,'hidden',{configurable:true,value:true});doc.dispatchEvent(new dom.window.Event('visibilitychange'));
  assert.equal(third.cancelled,true);assert.equal($('.usage-stage-inner').style.opacity,'1');
  const start=$('[data-guide-next]');guide.destroy();start.click();third.options.onComplete();
  assert.deepEqual(started,[]);assert.equal(doc.querySelector('dialog').classList.contains('is-usage-guide'),false);
});

test('a missing or throwing animation/island engine leaves all three steps readable',t=>{
  const islands={mountCounter(){throw new Error('No React');},mountFaq(){throw new Error('No React');}};
  for(const options of [{motion:false},{animationError:true}]) {
    const {$,guide}=setup(t,{islands,...options});
    $('[data-guide-step="2"]').click();assert.ok($('[data-guide-faq] details[open]'));
    assert.match($('[data-guide-counter]').textContent,/3 \/ 3/);
    assert.notEqual($('.usage-stage-inner').style.opacity,'0');
    guide.destroy();
  }
});
