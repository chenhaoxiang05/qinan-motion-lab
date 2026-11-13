/** Request errors safe to show beside the action that failed. */
export class ApiError extends Error {
  readonly code: string; readonly status: number;
  constructor(message: string, {code='request_failed', status=0}: {code?: string; status?: number} = {}) {
    super(message); this.name='ApiError'; this.code=code; this.status=status;
  }
}
export interface ApiResponse {
  ok: boolean; status?: number; json(): Promise<unknown>; headers?: Pick<Headers, 'get'>;
  body?: ReadableStream<Uint8Array> | null;
}
export type ApiFetch = (url: string, options: RequestInit) => Promise<ApiResponse>;
export interface ServerEvent { type: string; data: string; id?: string; }
export interface EventOptions { signal?: AbortSignal; idleTimeout?: number; maxDuration?: number; }
export interface ApiClient {
  baseUrl: string; source: string;
  request(path: string, options?: RequestInit, signal?: AbortSignal | null, timeout?: number): Promise<unknown>;
  safeEventPath(advertisedUrl: string): string | null;
  events(path: string, onEvent: (event: ServerEvent) => void | boolean, options?: EventOptions): Promise<void>;
  destroy(): void;
}
export const abortError = () => new DOMException('请求已取消。', 'AbortError');
const invalidResponse = () => new ApiError('收到的核验结果格式有误，请稍后重试。', {code:'invalid_response'});
const isAbort = (error: unknown) => error instanceof Error && error.name === 'AbortError';
function normalizeBase(value: string) {
  const candidate = typeof value === 'string' ? value.trim() : '', input = candidate || '/api';
  if (/[?#\\]/.test(input)) throw new ApiError('核验服务地址配置有误。', {code:'configuration'});
  if (input.startsWith('/') && !input.startsWith('//')) return input.replace(/\/+$/, '') || '/';
  try {
    const url=new URL(input);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid base');
    return url.href.replace(/\/+$/, '');
  } catch { throw new ApiError('核验服务地址配置有误。', {code:'configuration'}); }
}
function sourceIdentity(baseUrl: string) {
  try { return new URL(baseUrl, globalThis.location?.href || globalThis.window?.location?.href).href.replace(/\/+$/, ''); }
  catch { return baseUrl; }
}
export function httpError(status: number): ApiError {
  const known: Record<number, [string, string]> = {
    400:['request_failed','请求未能提交，请检查材料后重试。'],401:['auth_required','请先登录，再继续核验。'],403:['forbidden','当前账号暂时无法使用此服务。'],404:['not_found','核验服务暂不可用，请稍后重试。'],408:['timeout','等待核验服务超时，请稍后重试。'],409:['conflict','任务状态已变化，请刷新后重试。'],413:['payload_too_large','材料超过服务允许的大小，请压缩后重试。'],415:['unsupported_media','暂不支持这份材料的格式，请更换文件。'],422:['invalid_material','材料无法处理，请检查格式后重试。'],429:['rate_limited','请求较多，请稍后再试。'],
  };
  const [code,message] = known[status] || (status>=500 ? ['service_unavailable','核验服务暂时繁忙，请稍后重试。'] : ['request_failed','请求未能完成，请稍后重试。']);
  return new ApiError(message, {code,status});
}
/** No automatic request retries; POST is never duplicated by this client. */
export function createApiClient({baseUrl='/api', fetchImpl=globalThis.fetch}: {baseUrl?: string; fetchImpl?: ApiFetch} = {}): ApiClient {
  const normalized=normalizeBase(baseUrl), source=sourceIdentity(normalized), active=new Set<AbortController>();
  let destroyed=false;
  if (typeof fetchImpl !== 'function') throw new ApiError('核验服务暂不可用。', {code:'configuration'});
  const transport = fetchImpl;
  function pathUrl(path: string) {
    if (typeof path !== 'string' || !path || path.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(path) || /[#\\]/.test(path)) throw new ApiError('核验请求地址有误。', {code:'configuration'});
    return `${normalized==='/' ? '' : normalized}/${path.replace(/^\/+/, '')}`;
  }
  function safeEventPath(advertisedUrl: string): string | null {
    try {
      if (!advertisedUrl || /[#\\]/.test(advertisedUrl) || advertisedUrl.startsWith('//') || /%(?:2e|2f|5c)/i.test(advertisedUrl)) return null;
      const base = new URL(source, 'http://qinan.invalid'), prefix=base.pathname.replace(/\/+$/, '') + '/';
      const resolved = new URL(advertisedUrl, base.href.replace(/\/+$/, '') + '/');
      if (resolved.origin !== base.origin || resolved.username || resolved.password || !resolved.pathname.startsWith(prefix)) return null;
      return resolved.pathname.slice(prefix.length-1) + resolved.search;
    } catch { return null; }
  }
  function lifecycle(signals: AbortSignal[], timeout: number) {
    if (destroyed || signals.some(signal => signal.aborted)) throw abortError();
    const controller=new AbortController(); active.add(controller);
    let timedOut=false, timer: ReturnType<typeof setTimeout> | undefined;
    let rejectAbort: (error: unknown) => void = () => {};
    const aborted=new Promise<never>((_,reject) => { rejectAbort=reject; });
    // Some callers may already finish before a later abort; always mark the rejection handled.
    void aborted.catch(() => {});
    const cancel=() => controller.abort();
    const onAbort=() => rejectAbort(timedOut ? new ApiError('等待核验服务超时，请稍后重试。', {code:'timeout'}) : abortError());
    controller.signal.addEventListener('abort',onAbort,{once:true}); signals.forEach(signal=>signal.addEventListener('abort',cancel,{once:true}));
    const reset=() => { clearTimeout(timer); if(Number.isFinite(timeout)&&timeout>0)timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout); };
    reset();
    return {controller,aborted,reset,
      error(error: unknown): Error {
        if(controller.signal.aborted)return timedOut ? new ApiError('等待核验服务超时，请稍后重试。',{code:'timeout'}) : abortError();
        if(error instanceof ApiError)return error;
        if(isAbort(error))return abortError();
        return new ApiError('暂时无法连接核验服务，请稍后重试。',{code:'network'});
      },
      dispose(){clearTimeout(timer);signals.forEach(signal=>signal.removeEventListener('abort',cancel));controller.signal.removeEventListener('abort',onAbort);active.delete(controller);}
    };
  }
  async function request(path: string, options: RequestInit={}, signal: AbortSignal | null=null, timeout=25000): Promise<unknown> {
    const signals=[...new Set([signal, options.signal].filter((value): value is AbortSignal=>!!value))];
    const state=lifecycle(signals,timeout);
    try {
      const url=pathUrl(path);
      const operation=(async()=>{
        const response=await transport(url,{...options,signal:state.controller.signal});
        if(!response || typeof response.ok!=='boolean' || typeof response.json!=='function')throw invalidResponse();
        if(!response.ok)throw httpError(Number(response.status)||0);
        const contentType=response.headers?.get?.('content-type');
        if(contentType&&!/\b(?:application|text)\/(?:[\w.-]+\+)?json\b/i.test(contentType))throw invalidResponse();
        try { return await response.json(); } catch { throw invalidResponse(); }
      })();
      return await Promise.race([operation,state.aborted]);
    } catch(error) { throw state.error(error); }
    finally { state.dispose(); }
  }
  async function events(path: string, onEvent: (event: ServerEvent)=>void | boolean, {signal,idleTimeout=25000,maxDuration=1200000}: EventOptions={}): Promise<void> {
    const state=lifecycle(signal?[signal]:[],idleTimeout);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let body: ReadableStream<Uint8Array> | null | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const opening=transport(pathUrl(path),{method:'GET',headers:{Accept:'text/event-stream'},credentials:'same-origin',redirect:'error',signal:state.controller.signal});
      void opening.then(response=>{if(state.controller.signal.aborted)void response.body?.cancel().catch(()=>{});},()=>{});
      const response=await Promise.race([opening,state.aborted]);
      body=response.body;
      if(!response.ok)throw httpError(Number(response.status)||0);
      if(!/^text\/event-stream(?:\s*;|\s*$)/i.test(response.headers?.get('content-type')||'') || !response.body)throw new ApiError('实时连接不可用，正在恢复普通进度。',{code:'stream_unavailable'});
      reader=response.body.getReader();
      if(Number.isFinite(maxDuration)&&maxDuration>0)deadline=setTimeout(()=>state.controller.abort(),maxDuration);
      const decoder=new TextDecoder('utf-8',{fatal:true});
      const decode=(chunk?:Uint8Array,stream=false)=>{try{return decoder.decode(chunk,{stream});}catch{throw invalidResponse();}};
      let buffer='', data: string[]=[], eventType='message', eventId: string | undefined, frameSize=0, done=false;
      const processLine=(line: string) => {
        if(!line){
          if(data.length && onEvent({type:eventType,data:data.join('\n'),...(eventId!==undefined?{id:eventId}:{})})===false)done=true;
          data=[];eventType='message';eventId=undefined;frameSize=0;return;
        }
        frameSize+=line.length;if(frameSize>1048576)throw new ApiError('实时数据超过读取限制，请恢复查看任务。',{code:'invalid_response'});
        if(line.startsWith(':'))return;
        const colon=line.indexOf(':'), field=colon<0?line:line.slice(0,colon); let value=colon<0?'':line.slice(colon+1);if(value.startsWith(' '))value=value.slice(1);
        if(field==='data')data.push(value);
        else if(field==='event')eventType=value||'message';
        else if(field==='id'&&!value.includes('\0')){if(value.length>256)throw invalidResponse();eventId=value;}
      };
      const consume=(flushing=false) => {
        let start=0;
        for(let i=0;i<buffer.length&&!done;i++){
          const char=buffer[i]; if(char!=='\n'&&char!=='\r')continue;
          if(char==='\r'&&i===buffer.length-1&&!flushing)break;
          processLine(buffer.slice(start,i));if(char==='\r'&&buffer[i+1]==='\n')i++;start=i+1;
        }
        buffer=buffer.slice(start);if(buffer.length>1048576)throw invalidResponse();
      };
      while(!done){
        const chunk=await Promise.race([reader.read(),state.aborted]);
        if(chunk.done){buffer+=decode();consume(true);break;}
        state.reset();buffer+=decode(chunk.value,true);consume();
      }
    } catch(error) { throw state.error(error); }
    finally {
      clearTimeout(deadline);
      if(reader){void reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{/* A transport may retain a pending read until abort. */}}
      else if(body)void body.cancel().catch(()=>{});
      state.dispose();
    }
  }
  return {baseUrl:normalized,source,request,safeEventPath,events,
    destroy(){if(destroyed)return;destroyed=true;active.forEach(controller=>controller.abort());active.clear();}
  };
}
