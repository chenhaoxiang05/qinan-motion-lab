import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createInteractionFeedback} from '../src/interaction-feedback.js';

function fixture(t,{enabled=true,throws=false}={}){
  const dom=new JSDOM('<section><p style="opacity:.8;transform:rotate(2deg)">Readable content</p><button>Continue</button></section>',{pretendToBeVisual:true});
  const doc=dom.window.document,node=doc.querySelector('p'),jobs=[];
  const controller=createInteractionFeedback({root:doc,motionEnabled:()=>enabled,animate(target,params){
    if(throws)throw new Error('engine unavailable');const job={target,params,cancelled:false,cancel(){this.cancelled=true;}};jobs.push(job);return job;
  }});
  t.after(()=>{controller.destroy();dom.window.close();});return {dom,doc,node,jobs,controller};
}

test('feedback animates only local decoration while committed text and original opacity remain readable',t=>{
  const {node,jobs,controller}=fixture(t);controller.cue(node,{kind:'success'});
  assert.equal(node.textContent,'Readable content');assert.equal(node.style.opacity,'0.8');assert.equal(node.style.transform,'rotate(2deg)');
  assert.equal(node.dataset.feedbackKind,'success');jobs[0].target.feedbackProgress=.5;jobs[0].params.onUpdate();assert.equal(node.style.getPropertyValue('--feedback-shift'),'1.500px');
  jobs[0].params.onComplete();assert.equal(node.hasAttribute('data-feedback-kind'),false);assert.equal(node.style.getPropertyValue('--feedback-shift'),'');assert.equal(node.style.opacity,'0.8');
});

test('rapid feedback cancels the old cycle and stale callbacks never overwrite the newest state',t=>{
  const {node,jobs,controller}=fixture(t);controller.cue(node,{kind:'change'});controller.cue(node,{kind:'error'});
  assert.equal(jobs[0].cancelled,true);jobs[0].params.onComplete();jobs[0].target.feedbackProgress=.8;jobs[0].params.onUpdate();assert.equal(node.dataset.feedbackKind,'error');
  controller.settle(node.parentElement);assert.equal(jobs[1].cancelled,true);assert.equal(node.hasAttribute('data-feedback-kind'),false);
});

test('pause, hidden tabs and destroy settle feedback and pause request indicators without late writes',t=>{
  const {dom,doc,node,jobs,controller}=fixture(t);controller.cue(node);controller.setPaused(true);assert.equal(node.hasAttribute('data-feedback-kind'),false);assert.equal(doc.documentElement.dataset.feedbackMotion,'paused');
  controller.setPaused(false);controller.cue(node);Object.defineProperty(doc,'hidden',{value:true,configurable:true});doc.dispatchEvent(new dom.window.Event('visibilitychange'));
  assert.equal(node.style.getPropertyValue('--feedback-shift'),'');assert.equal(doc.documentElement.dataset.feedbackMotion,'paused');
  controller.destroy();jobs.at(-1).params.onComplete();assert.equal(doc.documentElement.hasAttribute('data-feedback-motion'),false);assert.equal(node.hasAttribute('data-feedback-kind'),false);
});

test('lost callbacks recover within a bounded duration and detached elements cannot acquire new motion',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const {node,controller,jobs}=fixture(t);controller.cue(node,{kind:'error'});t.mock.timers.tick(500);
  assert.equal(node.hasAttribute('data-feedback-kind'),false);node.remove();controller.cue(node);assert.equal(jobs.length,1);
});

test('reduced motion and driver failures preserve the final static view and original custom properties',t=>{
  const reduced=fixture(t,{enabled:false});reduced.controller.cue(reduced.node);assert.equal(reduced.jobs.length,0);assert.equal(reduced.doc.documentElement.dataset.feedbackMotion,'paused');
  const broken=fixture(t,{throws:true});broken.node.style.setProperty('--feedback-shift','2px');broken.controller.cue(broken.node);assert.equal(broken.node.style.getPropertyValue('--feedback-shift'),'2px');assert.equal(broken.node.style.opacity,'0.8');
});
