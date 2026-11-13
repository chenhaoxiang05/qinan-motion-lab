import { ApiError, abortError, type ApiClient, type ServerEvent } from './api-client.ts';
import { ContractError, parseIdentifier, parseJob, parseReport, type Job, type Report } from './contracts.ts';

export class TaskError extends ApiError {
  readonly clearPending: boolean;
  constructor(message: string, {code='task_failed', status=0, clearPending=false}: {code?: string; status?: number; clearPending?: boolean}={}) {
    super(message,{code,status}); this.name='TaskError'; this.clearPending=clearPending;
  }
}
export interface WatchOptions {
  eventsUrl?: string; signal?: AbortSignal;
  onStatus?: (message: string, state: 'loading' | 'analyzing')=>void;
  onDelta?: (delta: string)=>void;
  onTransport?: (mode: 'stream' | 'poll')=>void;
}
export interface TaskService {
  watch(jobId: string, options?: WatchOptions): Promise<Report>;
  destroy(): void;
}
interface ServiceOptions {
  api: ApiClient; delay?: (ms: number)=>Promise<unknown>; interval?: number; maxPolls?: number;
}
function terminal(job: Job): Report | null {
  if(job.status==='completed'){
    if(!job.result)throw new ContractError();
    return job.result;
  }
  const failures = {
    failed:'本次核验未能完成，请重试或更换材料。',
    cancelled:'核验任务已取消，可以重新选择材料。',
    expired:'核验任务已过期，请先查看核验记录后再提交。',
  };
  if(job.status==='failed'||job.status==='cancelled'||job.status==='expired')throw new TaskError(failures[job.status],{code:job.status,clearPending:true});
  return null;
}
/** A single owner for each task's stream/poll lifetime. It never uploads files. */
export function createTaskService({api,delay,interval=1500,maxPolls=800}: ServiceOptions): TaskService {
  const active=new Set<AbortController>(); let destroyed=false;
  async function watch(jobId: string, options: WatchOptions={}): Promise<Report> {
    if(destroyed||options.signal?.aborted)throw abortError();
    parseIdentifier(jobId);
    const controller=new AbortController(); active.add(controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel=()=>controller.abort(); options.signal?.addEventListener('abort',cancel,{once:true});
    let rejectAbort:(reason: unknown)=>void=()=>{};
    const aborted=new Promise<never>((_,reject)=>{rejectAbort=reject;});void aborted.catch(()=>{});
    const onAbort=()=>{clearTimeout(timer);rejectAbort(abortError());};controller.signal.addEventListener('abort',onAbort,{once:true});
    const pause=()=>Promise.race([delay?delay(interval):new Promise<void>(resolve=>{timer=setTimeout(resolve,interval);}),aborted]);
    const status=(job:Job)=>options.onStatus?.(job.message||(job.status==='queued'?'材料已排队，正在等待核验…':'正在核验材料…'),'analyzing');
    try {
      const eventPath=options.eventsUrl?api.safeEventPath(options.eventsUrl):null;
      if(eventPath){
        let result:Report|null=null,characters=0;
        const seen=new Set<string>();
        const receive=(event:ServerEvent):boolean|void=>{
          if(controller.signal.aborted)return false;
          if(event.type==='ping'||event.type==='heartbeat')return;
          if(event.id){if(seen.has(event.id))return; if(seen.size>=10000)throw new ApiError('实时数据过多，正在恢复普通进度。',{code:'stream_limit'});seen.add(event.id);}
          let payload:unknown;
          try{payload=JSON.parse(event.data);}catch{throw new ApiError('实时数据格式有误，正在恢复普通进度。',{code:'invalid_response'});}
          if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new ApiError('实时数据格式有误，正在恢复普通进度。',{code:'invalid_response'});
          const body=payload as Record<string,unknown>;
          try{
            if(event.type==='delta'){
              // An event ID is required for incremental text so replayed frames
              // cannot append duplicate output. Status/final records stay usable.
              if(!event.id||typeof body.text!=='string')throw new ContractError();
              characters+=body.text.length;if(characters>262144)throw new ContractError();
              options.onDelta?.(body.text);return;
            }
            if(event.type==='completed'){
              result=parseReport(body.result);return false;
            }
            if(event.type==='failed'||event.type==='cancelled'||event.type==='expired'){
              terminal(parseJob({status:event.type}));return false;
            }
            if(event.type==='status'||event.type==='message'){
              const job=parseJob(payload);result=terminal(job);if(result)return false;status(job);return;
            }
            throw new ContractError();
          }catch(error){
            if(error instanceof TaskError)throw error;
            if(error instanceof ContractError)throw new ApiError(error.message,{code:error.code});
            throw error;
          }
        };
        try{
          options.onTransport?.('stream');
          await api.events(eventPath,receive,{signal:controller.signal});
          if(result)return result;
        }catch(error){
          if(controller.signal.aborted)throw abortError();
          if(error instanceof TaskError)throw error;
          if(error instanceof ApiError&&(error.status===401||error.status===403))throw new TaskError(error.message,{code:error.code,status:error.status});
          // Unsupported streams, incomplete EOF and transient failures recover
          // by querying the same task, never by submitting the material again.
        }
      }
      options.onTransport?.('poll');
      let failures=0;
      for(let index=0;index<maxPolls;index++){
        await pause();if(controller.signal.aborted)throw abortError();
        let data:unknown;
        try { data=await api.request(`/jobs/${encodeURIComponent(jobId)}`,{},controller.signal); failures=0; }
        catch(error){
          if(controller.signal.aborted)throw abortError();
          if(error instanceof ApiError&&error.status===404)throw new TaskError('这项任务已无法恢复，请先查看核验记录。',{code:'not_found',status:404,clearPending:true});
          if(error instanceof ApiError&&(error.status===401||error.status===403))throw new TaskError(error.message,{code:error.code,status:error.status});
          if(++failures>=3)throw new TaskError('连接中断，任务已保留。请稍后恢复查看，无需重新上传。',{code:'network'});
          continue;
        }
        const job=parseJob(data), result=terminal(job);if(result)return result;status(job);
      }
      throw new TaskError('核验仍在进行，任务已保留。请稍后恢复查看。',{code:'pending'});
    } finally {
      clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',onAbort);active.delete(controller);
    }
  }
  return {watch,destroy(){if(destroyed)return;destroyed=true;active.forEach(controller=>controller.abort());active.clear();}};
}
