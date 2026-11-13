import { icon } from './icons.js';
import { GUIDE_EXAMPLES } from './guide-examples.js';

const KINDS = ['audio', 'video', 'image', 'chat'];
const STEPS = ['选择材料', '看懂线索', '独立核实'];
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icons = {audio:'sound',video:'video',image:'scan',chat:'file'};

/** Contents of the existing help dialog; examples remain local teaching material. */
export function guideMarkup() {
  return `<section class="usage-guide" data-usage-guide>
    <div class="usage-heading"><div><span class="modal-eyebrow">A LITTLE PRACTICE / QUICK START</span><h2 id="modalTitle">先看一个例子。</h2><p>从一份材料开始，把疑问变成下一步行动。</p></div><span class="usage-example-tag">教学示例</span></div>
    <div class="usage-types" role="tablist" aria-label="选择示例材料">${KINDS.map((kind,index)=>`<button type="button" id="guide-type-${kind}" role="tab" aria-selected="${index===0}" aria-controls="guidePanel" tabindex="${index===0?0:-1}" data-guide-kind="${kind}">${icon(icons[kind])}<span>${e(GUIDE_EXAMPLES[kind].label)}</span></button>`).join('')}</div>
    <div class="usage-progress"><nav class="usage-steps" aria-label="示例步骤">${STEPS.map((label,index)=>`<button type="button" data-guide-step="${index}"${index===0?' aria-current="step"':''}><span>${String(index+1).padStart(2,'0')}</span>${label}</button>`).join('')}</nav><div class="usage-counter" data-guide-counter aria-live="polite">1 / 3</div></div>
    <div id="guidePanel" class="usage-stage" role="tabpanel" aria-labelledby="guide-type-audio"></div>
    <div class="usage-actions"><button type="button" class="secondary" data-guide-back disabled>上一步</button><button type="button" class="primary" data-guide-next>看看有哪些线索 ${icon('arrow')}</button><button type="button" class="text-button" id="helpDone" data-guide-close>知道了</button></div>
    <div class="usage-footnote"><span>示例用于理解流程，结果不计入核验记录。</span><button type="button" class="text-button" data-guide-start>用自己的材料核验 ${icon('arrow')}</button></div>
  </section>`;
}

function materialMarkup(kind, example, compact=false) {
  const label = `<div class="usage-material-label"><span>${e(example.materialLabel)}</span><b>EXAMPLE</b></div>`;
  let media;
  if(kind==='audio') {
    const bars=Array.from({length:32},(_,i)=>`<i style="--wave:${(12+Math.round(Math.abs(Math.sin(i*1.71)*Math.cos(i*.43))*54))}px;--n:${i}"></i>`).join('');
    media=`<div class="usage-audio"><div class="usage-wave" aria-hidden="true">${bars}</div><span>声音情景 · 文字转写</span><blockquote>${e(example.quote)}</blockquote></div>`;
  } else if(kind==='chat') {
    media=`<div class="usage-chat"><div class="usage-chat-person"><span aria-hidden="true">家</span><div><strong>一条来自新号码的消息</strong><small>聊天情景示例</small></div></div><p class="usage-bubble">${e(example.quote)}</p><p class="usage-bubble is-response">我先打你原来的号码确认一下。</p></div>`;
  } else {
    media=`<figure class="usage-image"><img src="${e(example.image)}" alt="${e(example.imageAlt)}" draggable="false"><figcaption>${e(example.quote)}</figcaption></figure>`;
  }
  return `<div class="usage-material${compact?' is-compact':''}">${label}${media}<div class="usage-file">${icon('file')}<span>${e(example.filename)}</span><span aria-hidden="true">↗</span></div></div>`;
}

/** Owns guide descendants and its Rare UI roots. Destroy before replacing modal HTML. */
export function mountUsageGuide(host,{islands={},animate,motionEnabled=()=>true,onStart=()=>{},onClose=()=>{}}={}) {
  const root=host.querySelector('[data-usage-guide]'),doc=host.ownerDocument,dialog=host.closest('dialog');
  if(!root)return {destroy(){},setPaused(){},refreshIslands(){}};
  const $=selector=>root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)];
  const panel=$('#guidePanel'),counterHost=$('[data-guide-counter]');
  let kind='audio',step=0,paused=false,destroyed=false,counter=null,faq=null,faqValue=null;
  let animation=null,timer=null,revision=0;
  dialog?.classList.add('is-usage-guide');
  const canAnimate=()=>!paused&&motionEnabled()&&!doc.hidden;
  function settle() {
    revision++;clearTimeout(timer);timer=null;
    try{animation?.cancel?.();}catch{/* Complete content is always available. */}
    animation=null;
    const inner=panel.firstElementChild;
    if(inner){inner.style.opacity='1';inner.style.transform='none';}
    root.classList.remove('is-changing');
  }
  function destroyFaq(){faq?.destroy?.();faq=null;}
  function counterProps(){return {value:step+1,suffix:' / 3',paused:!canAnimate()};}
  function faqProps(){
    const example=GUIDE_EXAMPLES[kind];
    return {items:[{id:`guide-${kind}`,question:example.faq.question,answer:example.faq.answer}],value:faqValue,paused:!canAnimate(),onValueChange(value){if(destroyed)return;faqValue=value;faq?.update?.({value});}};
  }
  function refreshIslands() {
    if(destroyed)return;
    if(counter)counter.update?.(counterProps());
    else if(typeof islands.mountCounter==='function') {
      counterHost.replaceChildren();
      try{counter=islands.mountCounter(counterHost,counterProps());}catch{counterHost.textContent=`${step+1} / 3`;}
    } else counterHost.textContent=`${step+1} / 3`;
    const faqHost=$('[data-guide-faq]');
    if(faq&&faqHost)faq.update?.(faqProps());
    else if(faqHost&&typeof islands.mountFaq==='function') {
      const fallback=faqHost.innerHTML;faqHost.replaceChildren();
      try{faq=islands.mountFaq(faqHost,faqProps());}catch{faqHost.innerHTML=fallback;}
    }
  }
  function entrance() {
    if(!canAnimate()||typeof animate!=='function')return;
    const inner=panel.firstElementChild,token=++revision;let completed=false;
    root.classList.add('is-changing');
    const done=()=>{if(token!==revision||destroyed)return;completed=true;clearTimeout(timer);timer=null;animation=null;inner.style.opacity='1';inner.style.transform='none';root.classList.remove('is-changing');};
    try {
      const created=animate(inner,{opacity:[.2,1],y:[12,0],duration:360,ease:'out(4)',onComplete:done});
      if(!completed){animation=created;timer=setTimeout(()=>{if(token===revision)settle();},610);}
    }catch{settle();}
  }
  function render({focus=false}={}) {
    if(destroyed)return;
    settle();destroyFaq();root.classList.toggle('is-paused',!canAnimate());
    const example=GUIDE_EXAMPLES[kind];
    if(step===0)panel.innerHTML=`<div class="usage-stage-inner usage-material-layout">${materialMarkup(kind,example)}<div class="usage-reading"><span class="usage-kicker">01 / 从材料开始</span><h3 id="guideStepTitle" tabindex="-1">${e(example.title)}</h3><p>这里选用一份${e(example.label)}示例。真实使用时，放入你的材料，再查看对应线索。</p><div class="usage-note">${icon('scan')}<span>先看内容，再决定该问什么。</span></div></div></div>`;
    else if(step===1)panel.innerHTML=`<div class="usage-stage-inner usage-material-layout">${materialMarkup(kind,example,true)}<div class="usage-reading"><span class="usage-kicker">02 / 示例线索</span><h3 id="guideStepTitle" tabindex="-1">有些细节，值得多问一句。</h3><ol class="usage-clues">${example.clues.map((clue,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span><div><strong>${e(clue.title)}</strong><p>${e(clue.detail)}</p></div></li>`).join('')}</ol></div></div>`;
    else {
      faqValue=`guide-${kind}`;
      panel.innerHTML=`<div class="usage-stage-inner usage-verify"><div class="usage-reading"><span class="usage-kicker">03 / 把线索变成行动</span><h3 id="guideStepTitle" tabindex="-1">${e(example.verify.title)}</h3><ol class="usage-checklist">${example.verify.steps.map((item,index)=>`<li><span>${String(index+1).padStart(2,'0')}</span><p>${e(item)}</p></li>`).join('')}</ol></div><aside class="usage-answer"><span class="usage-answer-mark" aria-hidden="true">↗</span><span class="usage-kicker">多核实这一步</span><div data-guide-faq><details open><summary>${e(example.faq.question)}</summary><p>${e(example.faq.answer)}</p></details></div></aside></div>`;
    }
    panel.setAttribute('aria-labelledby',`guide-type-${kind}`);
    for(const tab of $$('[data-guide-kind]')){const active=tab.dataset.guideKind===kind;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
    for(const button of $$('[data-guide-step]')){if(Number(button.dataset.guideStep)===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');button.classList.toggle('is-done',Number(button.dataset.guideStep)<step);}
    $('[data-guide-back]').disabled=step===0;
    $('[data-guide-next]').innerHTML=`${['看看有哪些线索','下一步怎么做','用自己的材料核验'][step]} ${icon('arrow')}`;
    $('[data-guide-start]').hidden=step===2;
    refreshIslands();entrance();
    if(focus){$('#guideStepTitle')?.focus({preventScroll:true});if(dialog)dialog.scrollTop=0;}
  }
  function chooseKind(next,focus=false){if(!KINDS.includes(next)||next===kind)return;kind=next;step=0;render();if(focus)$(`[data-guide-kind="${kind}"]`)?.focus();}
  const click=event=>{
    if(destroyed)return;
    const button=event.target.closest('button');if(!button||!root.contains(button))return;
    if(button.dataset.guideKind)chooseKind(button.dataset.guideKind);
    else if(button.hasAttribute('data-guide-step')){const next=Number(button.dataset.guideStep);if(next!==step){step=next;render({focus:true});}}
    else if(button.hasAttribute('data-guide-back')&&step>0){step--;render({focus:true});}
    else if(button.hasAttribute('data-guide-next')){if(step<2){step++;render({focus:true});}else onStart(kind);}
    else if(button.hasAttribute('data-guide-start'))onStart(kind);
    else if(button.hasAttribute('data-guide-close'))onClose();
  };
  const keydown=event=>{
    const tab=event.target.closest('[data-guide-kind]');if(!tab||!root.contains(tab))return;
    const index=KINDS.indexOf(kind);let next;
    if(event.key==='ArrowRight')next=KINDS[(index+1)%KINDS.length];
    if(event.key==='ArrowLeft')next=KINDS[(index+KINDS.length-1)%KINDS.length];
    if(event.key==='Home')next=KINDS[0];if(event.key==='End')next=KINDS.at(-1);
    if(next){event.preventDefault();chooseKind(next,true);}
  };
  const visibility=()=>{if(doc.hidden)settle();root.classList.toggle('is-paused',!canAnimate());refreshIslands();};
  root.addEventListener('click',click);root.addEventListener('keydown',keydown);doc.addEventListener('visibilitychange',visibility);
  render();
  return {
    refreshIslands,
    setPaused(value){if(destroyed)return;paused=Boolean(value);root.classList.toggle('is-paused',!canAnimate());if(paused)settle();refreshIslands();},
    destroy(){if(destroyed)return;settle();destroyed=true;destroyFaq();counter?.destroy?.();counter=null;root.removeEventListener('click',click);root.removeEventListener('keydown',keydown);doc.removeEventListener('visibilitychange',visibility);dialog?.classList.remove('is-usage-guide');},
  };
}
