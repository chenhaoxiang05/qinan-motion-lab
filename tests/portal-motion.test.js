import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {portalIcon} from '../src/portal-icons.js';
import {createPortalMotion} from '../src/portal-motion.js';

const css=readFileSync(new URL('../src/portal-motion.css',import.meta.url),'utf8');
const kinds=['check','contacts','practice','history'];
function setup(t,{reduced=false}={}) {
  const errors=[],virtualConsole=new VirtualConsole();
  virtualConsole.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(`<style>${css}</style><main><div class="intro-copy"><h1>先<span class="title-accent" style="--emphasis-reveal: .75; --emphasis-light: .3">核实<span class="title-rule-shine" aria-hidden="true"></span></span>，再放心。</h1></div>${kinds.map(kind=>`<a class="portal-node" href="#${kind}" data-portal="${kind}"><span class="node-icon" data-portal-icon="${kind}">${portalIcon(kind)}</span><strong>${kind}</strong></a>`).join('')}</main>`,{pretendToBeVisual:true,virtualConsole});
  const {document}=dom.window,listeners=new Set();
  const media={matches:reduced,addEventListener(type,callback){if(type==='change')listeners.add(callback);},removeEventListener(type,callback){listeners.delete(callback);}};
  dom.window.matchMedia=()=>media;
  const controller=createPortalMotion({root:document});
  const hidden=value=>{Object.defineProperty(document,'hidden',{value,configurable:true});document.dispatchEvent(new dom.window.Event('visibilitychange'));};
  const setReduced=value=>{media.matches=value;for(const callback of [...listeners])callback({matches:value});};
  const state=()=>document.documentElement.dataset.portalMotion;
  t.after(()=>{controller.destroy();dom.window.close();assert.deepEqual(errors,[],'the complete motion stylesheet parses');});
  return {dom,document,controller,listeners,hidden,setReduced,state};
}

test('each portal has an identifiable decorative SVG without adding interactive or named descendants',t=>{
  const {document}=setup(t);
  for(const kind of kinds){
    const link=document.querySelector(`[data-portal="${kind}"]`),svg=link.querySelector('svg');
    assert.ok(svg.classList.contains(`portal-icon-${kind}`));
    assert.equal(svg.getAttribute('viewBox'),'0 0 32 32');
    assert.equal(svg.getAttribute('aria-hidden'),'true');
    assert.equal(svg.getAttribute('focusable'),'false');
    assert.equal(svg.querySelector('[tabindex],button,a,title,text'),null);
    assert.ok(svg.querySelectorAll('.portal-motion-part').length>0);
    assert.equal(link.getAttribute('href'),`#${kind}`);
  }
  assert.equal(portalIcon('untrusted" onload="alert(1)'),'', 'unknown values are never interpolated into SVG');
  assert.equal(portalIcon('__proto__'),'');
});

test('readiness, manual pause, covered panels, hidden tabs and reduced motion compose independently',t=>{
  const {controller,hidden,setReduced,state}=setup(t);
  assert.equal(state(),'paused');
  controller.setReady(true);assert.equal(state(),'running');
  controller.setPaused(true);controller.setCovered(true);hidden(true);setReduced(true);
  controller.setPaused(false);assert.equal(state(),'paused');
  controller.setCovered(false);assert.equal(state(),'paused');
  hidden(false);assert.equal(state(),'paused');
  setReduced(false);assert.equal(state(),'running');
  controller.setReady(false);assert.equal(state(),'paused');
  controller.setReady(true);assert.equal(state(),'running');
  controller.setCovered(true);controller.setPaused(true);controller.setCovered(false);
  assert.equal(state(),'paused','closing a feature never overrides manual pause');
  controller.setPaused(false);assert.equal(state(),'running');
});

test('home preparation and finite arrival hold CSS loops even after boot readiness',t=>{
  const {dom,document,controller}=setup(t),root=document.documentElement;
  const parts=[...document.querySelectorAll('.portal-motion-part,.title-rule-shine')];
  const playStates=()=>parts.map(part=>dom.window.getComputedStyle(part).animationPlayState);
  assert.ok(playStates().every(value=>value==='paused'));
  root.classList.add('home-prepared');controller.setReady(true);
  assert.ok(playStates().every(value=>value==='paused'));
  root.classList.replace('home-prepared','home-arriving');
  assert.ok(playStates().every(value=>value==='paused'));
  root.classList.remove('home-arriving');
  assert.ok(playStates().every(value=>value==='running'));
  controller.setCovered(true);
  assert.ok(playStates().every(value=>value==='paused'));
  assert.equal(dom.window.getComputedStyle(document.querySelector('.title-rule-shine')).visibility,'hidden');
  controller.setCovered(false);assert.ok(playStates().every(value=>value==='running'));
});

test('hover, focus and pause changes leave live labels, hit areas and entrance-owned underline state untouched',t=>{
  const {dom,document,controller,state}=setup(t);
  const link=document.querySelector('.portal-node'),label=link.querySelector('strong'),heading=document.querySelector('h1'),word=document.querySelector('.title-accent');
  const markup=document.querySelector('main').innerHTML,style=word.getAttribute('style');
  controller.setReady(true);
  for(const type of ['pointermove','pointerleave','pointerenter','focus','blur']){
    link.dispatchEvent(new dom.window.Event(type,{bubbles:true}));
    assert.equal(state(),'running',`${type} does not cancel looping ornaments`);
  }
  controller.setPaused(true);controller.setPaused(false);
  assert.equal(document.querySelector('.portal-node'),link);
  assert.equal(link.querySelector('strong'),label);assert.equal(document.querySelector('h1'),heading);
  assert.equal(document.querySelector('main').innerHTML,markup);
  assert.equal(word.getAttribute('style'),style);
  assert.equal(link.style.transform,'');assert.equal(label.style.opacity,'');assert.equal(heading.style.opacity,'');
});

test('reduced motion starts with still, complete drawings and can resume without reconstructing them',t=>{
  const {document,controller,setReduced,state}=setup(t,{reduced:true});
  const icons=[...document.querySelectorAll('.portal-icon-svg')];
  controller.setReady(true);assert.equal(state(),'paused');
  assert.equal(document.querySelectorAll('.portal-icon-svg').length,4);
  setReduced(false);assert.equal(state(),'running');
  assert.deepEqual([...document.querySelectorAll('.portal-icon-svg')],icons);
  controller.setPaused(true);setReduced(true);setReduced(false);assert.equal(state(),'paused');
});

test('destroy and replacing an owner remove old lifecycle hooks without permitting stale writes',t=>{
  const {document,controller,listeners,hidden,state}=setup(t);
  controller.setReady(true);
  const replacement=createPortalMotion({root:document});t.after(()=>replacement.destroy());
  assert.equal(listeners.size,1);assert.equal(state(),'paused');
  controller.setReady(true);controller.setPaused(false);assert.equal(state(),'paused');
  replacement.setReady(true);assert.equal(state(),'running');
  hidden(true);assert.equal(state(),'paused');hidden(false);assert.equal(state(),'running');
  replacement.destroy();assert.equal(listeners.size,0);assert.equal(state(),undefined);
  hidden(true);replacement.setReady(true);controller.setCovered(true);
  assert.equal(state(),undefined);assert.equal(document.querySelectorAll('.portal-icon-svg').length,4);
});

test('motion declarations are confined to inner drawings and the independent shine, with explicit mobile icon sizing',t=>{
  const {document}=setup(t),sheet=document.styleSheets[0];
  assert.ok(sheet.cssRules.length>20,'the browser CSS parser retains every animation and guard');
  for(const rule of sheet.cssRules){
    if(!rule.selectorText||!rule.style?.getPropertyValue('animation'))continue;
    assert.match(rule.selectorText,/portal-(?:scan-line|phone-|practice-|clock-)|title-rule-shine/);
    assert.doesNotMatch(rule.selectorText,/portal-content|strong|h1/);
  }
  assert.doesNotMatch(css,/--emphasis-/,'the steady shine does not share entrance custom properties');
  const mobile=[...sheet.cssRules].find(rule=>rule.conditionText==='(max-width: 699px)');
  const iconRule=[...mobile.cssRules].find(rule=>rule.selectorText==='.portal-node .node-icon');
  assert.equal(iconRule.style.display,'inline-flex','override the legacy mobile icon hiding rule');
  assert.equal(iconRule.style.width,'24px');
  assert.ok([...sheet.cssRules].some(rule=>rule.conditionText==='(prefers-reduced-motion: reduce)'));
});
