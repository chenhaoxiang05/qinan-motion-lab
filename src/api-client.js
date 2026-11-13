/** Request errors safe to show beside the action that failed. */
export class ApiError extends Error {
  constructor(message,{code='request_failed',status=0}={}){
    super(message);this.name='ApiError';this.code=code;this.status=status;
  }
}

const abortError=()=>new DOMException('请求已取消。','AbortError');
const invalidResponse=()=>new ApiError('收到的核验结果格式有误，请稍后重试。',{code:'invalid_response'});

function normalizeBase(value){
  const candidate=typeof value==='string'?value.trim():'';
  const input=candidate||'/api';
  if(/[?#\\]/.test(input))throw new ApiError('核验服务地址配置有误。',{code:'configuration'});
  if(input.startsWith('/')&&!input.startsWith('//'))return input.replace(/\/+$/,'')||'/';
  try{
    const url=new URL(input);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid base');
    return url.href.replace(/\/+$/,'');
  }catch{throw new ApiError('核验服务地址配置有误。',{code:'configuration'});}
}

function sourceIdentity(baseUrl){
  try{
    const origin=globalThis.location?.href||globalThis.window?.location?.href;
    return new URL(baseUrl,origin).href.replace(/\/+$/,'');
  }catch{return baseUrl;}
}

function httpError(status){
  const known={
    400:['request_failed','请求未能提交，请检查材料后重试。'],
    401:['auth_required','请先登录，再继续核验。'],
    403:['forbidden','当前账号暂时无法使用此服务。'],
    404:['not_found','核验服务暂不可用，请稍后重试。'],
    408:['timeout','等待核验服务超时，请稍后重试。'],
    409:['conflict','任务状态已变化，请刷新后重试。'],
    413:['payload_too_large','材料超过服务允许的大小，请压缩后重试。'],
    415:['unsupported_media','暂不支持这份材料的格式，请更换文件。'],
    422:['invalid_material','材料无法处理，请检查格式后重试。'],
    429:['rate_limited','请求较多，请稍后再试。'],
  };
  const [code,message]=known[status]||(status>=500?['service_unavailable','核验服务暂时繁忙，请稍后重试。']:['request_failed','请求未能完成，请稍后重试。']);
  return new ApiError(message,{code,status});
}

/**
 * Paths are relative to baseUrl: request('/analyze', ...), not '/api/analyze'.
 * The client never retries. In particular, a failed POST must not upload twice.
 */
export function createApiClient({baseUrl='/api',fetchImpl=globalThis.fetch}={}){
  const normalized=normalizeBase(baseUrl),source=sourceIdentity(normalized),active=new Set();
  let destroyed=false;
  if(typeof fetchImpl!=='function')throw new ApiError('核验服务暂不可用。',{code:'configuration'});

  async function request(path,options={},signal=null,timeout=25000){
    const signals=[...new Set([signal,options.signal].filter(Boolean))];
    if(destroyed||signals.some(item=>item.aborted))throw abortError();
    if(typeof path!=='string'||!path||path.startsWith('//')||/^[a-z][a-z\d+.-]*:/i.test(path)||/[#\\]/.test(path))throw new ApiError('核验请求地址有误。',{code:'configuration'});
    const url=`${normalized==='/'?'':normalized}/${path.replace(/^\/+/, '')}`;
    const controller=new AbortController();active.add(controller);
    let timedOut=false,timer=null;
    const cancel=()=>controller.abort();
    let rejectAbort;
    const aborted=new Promise((_,reject)=>{rejectAbort=reject;});
    const onAbort=()=>rejectAbort(timedOut?new ApiError('等待核验服务超时，请稍后重试。',{code:'timeout'}):abortError());
    controller.signal.addEventListener('abort',onAbort,{once:true});
    signals.forEach(item=>item.addEventListener('abort',cancel,{once:true}));
    if(Number.isFinite(timeout)&&timeout>0)timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout);
    try{
      const operation=(async()=>{
        const response=await fetchImpl(url,{...options,signal:controller.signal});
        if(!response||typeof response.ok!=='boolean'||typeof response.json!=='function')throw invalidResponse();
        if(!response.ok)throw httpError(Number(response.status)||0);
        const contentType=response.headers?.get?.('content-type');
        if(contentType&&!/\b(?:application|text)\/(?:[\w.-]+\+)?json\b/i.test(contentType))throw invalidResponse();
        try{return await response.json();}catch{throw invalidResponse();}
      })();
      return await Promise.race([operation,aborted]);
    }catch(error){
      if(controller.signal.aborted){if(timedOut)throw new ApiError('等待核验服务超时，请稍后重试。',{code:'timeout'});throw abortError();}
      if(error instanceof ApiError)throw error;
      if(error?.name==='AbortError')throw abortError();
      throw new ApiError('暂时无法连接核验服务，请稍后重试。',{code:'network'});
    }finally{
      clearTimeout(timer);signals.forEach(item=>item.removeEventListener('abort',cancel));
      controller.signal.removeEventListener('abort',onAbort);active.delete(controller);
    }
  }

  return {
    baseUrl:normalized,source,request,
    destroy(){if(destroyed)return;destroyed=true;active.forEach(controller=>controller.abort());active.clear();},
  };
}
