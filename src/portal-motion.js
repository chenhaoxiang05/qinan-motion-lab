const owners=new WeakMap();
const STATE_ATTRIBUTE='data-portal-motion';

/** A shared play-state for small decorative loops, independent of home entrance. */
export function createPortalMotion({root=globalThis.document}={}) {
  const host=root?.nodeType===9?root.documentElement:root;
  const doc=host?.ownerDocument;
  if(!host||!doc)throw new TypeError('Portal motion needs a document or element root.');
  owners.get(host)?.destroy();
  const previous=host.getAttribute(STATE_ATTRIBUTE);
  let ready=false,paused=false,covered=false,destroyed=false,media;
  try{media=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');}catch{/* CSS retains its own reduced-motion guard. */}
  function sync() {
    if(destroyed)return;
    const state=ready&&!paused&&!covered&&!doc.hidden&&!media?.matches?'running':'paused';
    if(host.getAttribute(STATE_ATTRIBUTE)!==state)host.setAttribute(STATE_ATTRIBUTE,state);
  }
  const controller={
    setReady(value){if(destroyed)return;ready=Boolean(value);sync();},
    setPaused(value){if(destroyed)return;paused=Boolean(value);sync();},
    setCovered(value){if(destroyed)return;covered=Boolean(value);sync();},
    destroy(){
      if(destroyed)return;destroyed=true;
      doc.removeEventListener('visibilitychange',sync);
      if(media?.removeEventListener)media.removeEventListener('change',sync);else media?.removeListener?.(sync);
      if(previous===null)host.removeAttribute(STATE_ATTRIBUTE);else host.setAttribute(STATE_ATTRIBUTE,previous);
      if(owners.get(host)===controller)owners.delete(host);
    },
  };
  owners.set(host,controller);
  doc.addEventListener('visibilitychange',sync);
  if(media?.addEventListener)media.addEventListener('change',sync);else media?.addListener?.(sync);
  sync();
  return controller;
}
