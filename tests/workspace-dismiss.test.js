import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createWorkspaceDismiss} from '../src/workspace-dismiss.js';

function fixture(t){
  const dom=new JSDOM('<dialog open><section><p>Selectable content</p><button>Action</button></section></dialog>',{pretendToBeVisual:true});
  const {document}=dom.window,dialog=document.querySelector('dialog'),surface=document.querySelector('section'),button=document.querySelector('button');
  surface.getBoundingClientRect=()=>({left:100,top:100,right:700,bottom:600,width:600,height:500});
  let allowed=true,count=0;
  const dismiss=createWorkspaceDismiss({dialog,surface,canDismiss:()=>allowed,onDismiss:()=>count++});
  const pointer=(type,{target=dialog,x=40,y=200,id=1,button=0,primary=true}={})=>{
    const event=new dom.window.MouseEvent(type,{clientX:x,clientY:y,button,bubbles:true});
    Object.defineProperties(event,{pointerId:{value:id},isPrimary:{value:primary}});target.dispatchEvent(event);
  };
  t.after(()=>{dismiss.destroy();dom.window.close();});
  return {dom,document,dialog,surface,button,pointer,dismiss,get count(){return count;},allow(value){allowed=value;}};
}

test('primary down and up on outside blank area dismiss exactly once',t=>{
  const f=fixture(t);f.pointer('pointerdown');f.pointer('pointerup',{x:43,y:204});
  assert.equal(f.count,1);f.pointer('pointerup');assert.equal(f.count,1);
});

test('panel content, padding and panel boundary never count as outside blank area',t=>{
  const f=fixture(t);
  for(const target of [f.surface,f.button]){f.pointer('pointerdown',{target,x:120,y:120});f.pointer('pointerup',{target,x:120,y:120});}
  for(const [x,y] of [[120,120],[100,200],[700,200],[200,100],[200,600]]){
    f.pointer('pointerdown',{x,y});f.pointer('pointerup',{x,y});
  }
  assert.equal(f.count,0);
});

test('both endpoints must be outside and target the dialog',t=>{
  const f=fixture(t);
  f.pointer('pointerdown',{target:f.surface,x:110});f.pointer('pointerup');
  f.pointer('pointerdown');f.pointer('pointerup',{target:f.surface,x:110});
  f.pointer('pointerdown');f.pointer('pointerup',{target:f.button});
  assert.equal(f.count,0);
});

test('drags are rejected even if the pointer returns to its original position',t=>{
  const f=fixture(t);
  f.pointer('pointerdown');f.pointer('pointermove',{x:90});f.pointer('pointermove');f.pointer('pointerup');
  f.pointer('pointerdown');f.pointer('pointerup',{x:47});
  f.pointer('pointerdown');f.dialog.dispatchEvent(new f.dom.window.Event('dragstart',{bubbles:true}));f.pointer('pointerup');
  assert.equal(f.count,0);
});

test('selection and primary-pointer guards reject incidental releases',t=>{
  const f=fixture(t);
  for(const attributes of [{button:2},{primary:false}]){f.pointer('pointerdown',attributes);f.pointer('pointerup',attributes);}
  f.pointer('pointerdown',{id:1});f.pointer('pointerup',{id:2});
  const range=f.document.createRange();range.selectNodeContents(f.document.querySelector('p'));
  f.document.getSelection().addRange(range);f.pointer('pointerdown');f.pointer('pointerup');
  f.document.getSelection().removeAllRanges();f.pointer('pointerdown');f.document.getSelection().addRange(range);f.pointer('pointerup');
  assert.equal(f.count,0);
});

test('state, auxiliary modal and picker guards are checked on both press and release',t=>{
  const f=fixture(t);
  f.allow(false);f.pointer('pointerdown');f.allow(true);f.pointer('pointerup');
  f.pointer('pointerdown');f.allow(false);f.pointer('pointerup');
  f.allow(true);f.dialog.open=false;f.pointer('pointerdown');f.pointer('pointerup');
  assert.equal(f.count,0);
});

test('pointer cancel, blur, hidden tab and destroy clear armed outside presses',t=>{
  const f=fixture(t);
  f.pointer('pointerdown');f.pointer('pointercancel');f.pointer('pointerup');
  f.pointer('pointerdown');f.dom.window.dispatchEvent(new f.dom.window.Event('blur'));f.pointer('pointerup');
  f.pointer('pointerdown');f.document.dispatchEvent(new f.dom.window.Event('visibilitychange'));f.pointer('pointerup');
  f.pointer('pointerdown');f.dismiss.destroy();f.pointer('pointerup');
  f.pointer('pointerdown');f.pointer('pointerup');assert.equal(f.count,0);
});
