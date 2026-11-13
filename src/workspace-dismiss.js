/** Dismiss only deliberate clicks in the blank space around a workspace panel. */
export function createWorkspaceDismiss({dialog,surface,canDismiss,onDismiss}) {
  const document=dialog.ownerDocument,view=document.defaultView;
  let press=null,destroyed=false;
  const reset=()=>{press=null;};
  const hasSelection=()=>{const selection=document.getSelection?.();return Boolean(selection&&!selection.isCollapsed);};
  const primary=event=>event.isPrimary!==false&&event.button===0;
  const outside=event=>{
    if(event.target!==dialog)return false;
    const rect=surface.getBoundingClientRect();
    // Inclusive edges belong to the panel, including its unfilled padding.
    return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
  };
  const ready=()=>!destroyed&&dialog.open&&canDismiss()&&!hasSelection();
  function down(event){
    reset();
    if(primary(event)&&ready()&&outside(event))press={id:event.pointerId,x:event.clientX,y:event.clientY};
  }
  function move(event){
    if(!press||event.pointerId!==press.id)return;
    // Crossing the limit once cancels even if the pointer later returns to its start.
    if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>6||hasSelection())reset();
  }
  function up(event){
    const started=press;reset();
    if(!started||event.pointerId!==started.id||!primary(event)||!ready()||!outside(event))return;
    if(Math.hypot(event.clientX-started.x,event.clientY-started.y)>6)return;
    onDismiss();
  }
  dialog.addEventListener('pointerdown',down);
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerup',up);
  document.addEventListener('pointercancel',reset);
  dialog.addEventListener('dragstart',reset);
  document.addEventListener('visibilitychange',reset);
  view.addEventListener('blur',reset);
  return {destroy(){
    if(destroyed)return;destroyed=true;reset();
    dialog.removeEventListener('pointerdown',down);
    document.removeEventListener('pointermove',move);
    document.removeEventListener('pointerup',up);
    document.removeEventListener('pointercancel',reset);
    dialog.removeEventListener('dragstart',reset);
    document.removeEventListener('visibilitychange',reset);
    view.removeEventListener('blur',reset);
  }};
}
