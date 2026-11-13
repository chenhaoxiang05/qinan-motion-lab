const FAMILY_CLASS = 'display-fonts-ready';
const FONT_REQUESTS = [
  ['400 80px "Qinan Display"', '先核实再放心，。'],
  ['500 12px "Qinan Signal"', 'QINAN 0123456789'],
];

/** Decide the display fonts once, before the homepage can become visible. */
export function createFontReadiness({document:doc=globalThis.document,timeoutMs=1800}={}) {
  const html=doc?.documentElement,fonts=doc?.fonts;
  let settled=false,destroyed=false,ownsClass=false,timer=null,result;
  let resolveReady;
  const ready=new Promise(resolve=>{resolveReady=resolve;});
  function finish(loaded) {
    if(settled)return result;
    settled=true;clearTimeout(timer);timer=null;
    if(loaded&&!destroyed&&html) {
      ownsClass=!html.classList.contains(FAMILY_CLASS);
      html.classList.add(FAMILY_CLASS);
      result={label:'字体已就绪'};
    } else result={fallback:true,label:'基础字体已就绪'};
    resolveReady(result);
    return result;
  }
  const finalize=()=>finish(false);
  const destroy=()=>{
    if(destroyed)return;
    destroyed=true;finalize();
    if(ownsClass)html?.classList.remove(FAMILY_CLASS);
    ownsClass=false;
  };
  if(!html||typeof fonts?.load!=='function'||typeof fonts?.check!=='function')finish(false);
  else {
    const deadline=Number.isFinite(timeoutMs)&&timeoutMs>=0?timeoutMs:1800;
    timer=setTimeout(finalize,deadline);
    // Promise.resolve observes both asynchronous rejections and synchronous
    // FontFaceSet errors; late loads never swap the visible homepage's font.
    Promise.all(FONT_REQUESTS.map(([font,text])=>Promise.resolve().then(()=>fonts.load(font,text))))
      .then(faces=>{
        if(settled||destroyed)return;
        const complete=faces.every(list=>list?.length>0&&[...list].every(face=>face.status==='loaded'));
        finish(complete&&FONT_REQUESTS.every(([font,text])=>fonts.check(font,text)));
      }).catch(()=>finish(false));
  }
  return {ready,finalize,destroy};
}
