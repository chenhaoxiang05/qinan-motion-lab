import test from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient} from '../src/api-client.ts';
import {createTaskService,TaskError} from '../src/task-service.ts';
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
const textStream=(text,{split=false,onCancel}={})=>{
  const bytes=new TextEncoder().encode(text);
  const stream=new ReadableStream({start(controller){if(split){for(let i=0;i<bytes.length;i++)controller.enqueue(bytes.slice(i,i+1));}else controller.enqueue(bytes);controller.close();},cancel(){onCancel?.();}});
  return new Response(stream,{headers:{'content-type':'text/event-stream; charset=utf-8'}});
};

test('SSE handles split UTF-8/CRLF, status, replayed IDs and incremental plain text before the authoritative result',async()=>{
  const calls=[],deltas=[],statuses=[],transports=[];
  const stream=': heartbeat\r\n\r\nid: 1\r\nevent: status\r\ndata: {"status":"processing","message":"正在读取"}\r\n\r\nid: 2\r\nevent: delta\r\ndata: {"text":"你好 <b>"}\r\n\r\nid: 2\r\nevent: delta\r\ndata: {"text":"你好 <b>"}\r\n\r\nid: 3\r\nevent: delta\r\ndata: {"text":"世界"}\r\n\r\nid: 4\r\nevent: completed\r\ndata: {"result":{"id":"report","summary":"完整结果"}}\r\n\r\n';
  const api=createApiClient({baseUrl:'https://api.test/api',fetchImpl:async(url,options)=>{calls.push({url,options});return textStream(stream,{split:true});}});
  const service=createTaskService({api,delay:async()=>{}});
  const report=await service.watch('job',{eventsUrl:'/api/jobs/job/events',onDelta:text=>deltas.push(text),onStatus:text=>statuses.push(text),onTransport:mode=>transports.push(mode)});
  assert.equal(report.id,'report');assert.deepEqual(deltas,['你好 <b>','世界']);assert.deepEqual(statuses,['正在读取']);assert.deepEqual(transports,['stream']);
  assert.equal(calls.length,1);assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.credentials,'same-origin');
  service.destroy();api.destroy();
});

test('an advertised stream URL cannot escape its API origin or prefix, including encoded traversal',async()=>{
  const calls=[];const api=createApiClient({baseUrl:'https://api.test/root/api',fetchImpl:async url=>{calls.push(url);return json({status:'completed',result:{id:'r'}});}});
  for(const url of ['https://elsewhere.test/root/api/events','//elsewhere.test/root/api/events','../outside','/root/apix/events','/root/api/../../private','/root/api/%2e%2e/private','/root/api/%2Fprivate','https://u:p@api.test/root/api/events','/root/api/events#secret','/root/api\\other'])assert.equal(api.safeEventPath(url),null,url);
  assert.equal(api.safeEventPath('jobs/j/events'),'/jobs/j/events');assert.equal(api.safeEventPath('/root/api/jobs/j/events?format=sse'),'/jobs/j/events?format=sse');
  const service=createTaskService({api,delay:async()=>{}});
  assert.equal((await service.watch('j',{eventsUrl:'https://elsewhere.test/events'})).id,'r');
  assert.deepEqual(calls,['https://api.test/root/api/jobs/j']);service.destroy();api.destroy();
});

test('unsupported streams and incomplete EOF fall back to the same GET task without reupload or duplicated deltas',async()=>{
  for(const response of [()=>new Response('',{status:404}),()=>json({status:'processing'}),()=>textStream('id: one\nevent: delta\ndata: {"text":"partial"}\n\n'),()=>{throw new TypeError('offline');}]){
    const calls=[],deltas=[],transports=[];
    const api=createApiClient({fetchImpl:async(url,options)=>{calls.push({url,options});return url.endsWith('/events')?response():json({status:'completed',result:{id:'r',summary:'final'}});}});
    const service=createTaskService({api,delay:async()=>{}});
    assert.equal((await service.watch('j',{eventsUrl:'/api/jobs/j/events',onDelta:text=>deltas.push(text),onTransport:mode=>transports.push(mode)})).summary,'final');
    assert.equal(calls.length,2);assert.ok(calls.every(call=>call.options.method!=='POST'));assert.ok(deltas.length<=1);assert.deepEqual(transports,['stream','poll']);
    service.destroy();api.destroy();
  }
});

test('malformed or unidentifiable delta frames cannot append text and recover through polling',async()=>{
  for(const frame of ['event: delta\ndata: {"text":"not deduplicable"}\n\n','id: 1\nevent: delta\ndata: {"text":42}\n\n','id: 1\nevent: status\ndata: {"status":"not-a-state"}\n\n','id: 1\nevent: completed\ndata: {"result":{"id":"r","modules":{"audio":{"score":"bad"}}}}\n\n']){
    const deltas=[];let polls=0;
    const api=createApiClient({fetchImpl:async url=>url.endsWith('/events')?textStream(frame):(polls++,json({status:'completed',result:{id:'r'}}))});
    const service=createTaskService({api,delay:async()=>{}});
    assert.equal((await service.watch('j',{eventsUrl:'/api/jobs/j/events',onDelta:value=>deltas.push(value)})).id,'r');assert.deepEqual(deltas,[]);assert.equal(polls,1);
    service.destroy();api.destroy();
  }
});

test('failed, cancelled and expired tasks terminate with an explicit pending-storage policy in both transports',async()=>{
  for(const status of ['failed','cancelled','expired'])for(const streaming of [false,true]){
    let calls=0;const api=createApiClient({fetchImpl:async()=>{calls++;return streaming?textStream(`event: ${status}\ndata: {}\n\n`):json({status});}});
    const service=createTaskService({api,delay:async()=>{}});
    await assert.rejects(service.watch('j',{eventsUrl:streaming?'/api/jobs/j/events':undefined}),error=>error instanceof TaskError&&error.clearPending&&error.code===status);
    assert.equal(calls,1);service.destroy();api.destroy();
  }
});

test('stream authentication errors do not silently switch transports, while polling 404 clears the task',async()=>{
  for(const status of [401,403]){
    let calls=0;const api=createApiClient({fetchImpl:async()=>{calls++;return new Response('',{status});}}),service=createTaskService({api,delay:async()=>{}});
    await assert.rejects(service.watch('j',{eventsUrl:'/api/jobs/j/events'}),error=>error.status===status&&!error.clearPending);assert.equal(calls,1);service.destroy();api.destroy();
  }
  const api=createApiClient({fetchImpl:async()=>new Response('',{status:404})}),service=createTaskService({api,delay:async()=>{}});
  await assert.rejects(service.watch('j'),error=>error.status===404&&error.clearPending);service.destroy();api.destroy();
});

test('stream cancellation releases the reader and prevents late output or fallback polling',async()=>{
  let streamController,cancelled=false,calls=0;const deltas=[];
  const api=createApiClient({fetchImpl:async()=>{calls++;return new Response(new ReadableStream({start(controller){streamController=controller;},cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}});}});
  const service=createTaskService({api,delay:async()=>{}}),controller=new AbortController();
  const task=service.watch('j',{eventsUrl:'/api/jobs/j/events',signal:controller.signal,onDelta:value=>deltas.push(value)});
  await new Promise(resolve=>setTimeout(resolve,0));controller.abort();await assert.rejects(task,{name:'AbortError'});
  assert.equal(cancelled,true);assert.equal(calls,1);assert.deepEqual(deltas,[]);assert.throws(()=>streamController.enqueue(new Uint8Array([1])));
  service.destroy();api.destroy();
});

test('idle streams and oversized frames settle rather than hanging or buffering without a bound',async()=>{
  let cancelled=false;
  const idle=createApiClient({fetchImpl:async()=>new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}})});
  await assert.rejects(idle.events('/jobs/j/events',()=>{},{idleTimeout:5}),{code:'timeout'});assert.equal(cancelled,true);idle.destroy();
  const huge=createApiClient({fetchImpl:async()=>textStream('data: '+'a'.repeat(1048577))});
  await assert.rejects(huge.events('/jobs/j/events',()=>{}),{code:'invalid_response'});huge.destroy();
});

test('destroy interrupts a polling wait and three network failures retain the task for recovery',async()=>{
  let reads=0;const api=createApiClient({fetchImpl:async()=>{reads++;throw new TypeError('offline');}}),service=createTaskService({api,delay:async()=>{}});
  await assert.rejects(service.watch('j'),error=>error.code==='network'&&!error.clearPending);assert.equal(reads,3);service.destroy();api.destroy();
  const another=createApiClient({fetchImpl:async()=>{throw new Error('must not read');}}),waiting=createTaskService({api:another,interval:10000});
  const task=waiting.watch('j');waiting.destroy();await assert.rejects(task,{name:'AbortError'});await assert.rejects(waiting.watch('j'),{name:'AbortError'});another.destroy();
});

test('local HTTP fixture advertises a real SSE transport and malformed terminal data cannot become a report',async t=>{
  // Transport fixture only: no model is invoked and these are not safety results.
  const {createServer}=await import('node:http');
  const received=[],timers=new Set();
  const server=createServer((req,res)=>{
    received.push(`${req.method} ${req.url}`);
    if(req.url==='/api/analyze'&&req.method==='POST'){
      req.resume();req.on('end',()=>{res.writeHead(202,{'content-type':'application/json'});res.end(JSON.stringify({job_id:'fixture',events_url:'/api/jobs/fixture/events'}));});return;
    }
    if(req.url==='/api/jobs/fixture/events'){
      res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache'});res.flushHeaders();
      const data=Buffer.from('id: 1\r\nevent: status\r\ndata: {"status":"processing","message":"测试夹具：正在读取"}\r\n\r\nid: 2\r\nevent: delta\r\ndata: {"text":"中文增量：仅协议测试"}\r\n\r\nid: 3\r\nevent: completed\r\ndata: {"result":{"id":"fixture-report","summary":"仅为传输协议测试，不是检测结论"}}\r\n\r\n');
      let index=0;const timer=setInterval(()=>{if(index>=data.length){clearInterval(timer);timers.delete(timer);res.end();return;}res.write(data.subarray(index,index+7));index+=7;},1);timers.add(timer);res.on('close',()=>{clearInterval(timer);timers.delete(timer);});return;
    }
    if(req.url==='/api/jobs/malformed/events'){
      res.writeHead(200,{'content-type':'text/event-stream'});res.end('event: completed\ndata: {"result":{}}\n\n');return;
    }
    if(req.url==='/api/jobs/malformed'){
      res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'completed',result:{id:'bad',modules:{audio:{score:'wrong'}}}}));return;
    }
    res.writeHead(404,{'content-type':'application/json'});res.end('{}');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{for(const timer of timers)clearInterval(timer);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  const address=server.address(),api=createApiClient({baseUrl:`http://127.0.0.1:${address.port}/api`}),service=createTaskService({api,delay:async()=>{}});
  t.after(()=>{service.destroy();api.destroy();});
  const form=new FormData();form.append('file',new Blob(['fixture content'],{type:'audio/wav'}),'fixture.wav');form.append('scene','general');form.append('context','');
  const receipt=await api.request('/analyze',{method:'POST',body:form});
  const deltas=[],statuses=[];let resolved=false;
  const report=await service.watch(receipt.job_id,{eventsUrl:receipt.events_url,onDelta:delta=>{assert.equal(resolved,false);deltas.push(delta);},onStatus:status=>statuses.push(status)});resolved=true;
  assert.equal(report.id,'fixture-report');assert.deepEqual(deltas,['中文增量：仅协议测试']);assert.deepEqual(statuses,['测试夹具：正在读取']);
  assert.deepEqual(received,['POST /api/analyze','GET /api/jobs/fixture/events']);
  await assert.rejects(service.watch('malformed',{eventsUrl:'/api/jobs/malformed/events'}),{code:'invalid_response'});
  assert.deepEqual(received.slice(2),['GET /api/jobs/malformed/events','GET /api/jobs/malformed']);
});

test('invalid direct job identifiers never reach the network',async()=>{
  let calls=0;const api=createApiClient({fetchImpl:async()=>{calls++;return json({});}}),service=createTaskService({api,delay:async()=>{}});
  for(const id of ['.','..',' bad'])await assert.rejects(service.watch(id),{code:'invalid_response'});
  assert.equal(calls,0);service.destroy();api.destroy();
});

test('unread non-SSE and late-aborted response bodies are released, and invalid UTF-8 is rejected',async()=>{
  let released=false;const nonSse=createApiClient({fetchImpl:async()=>new Response(new ReadableStream({cancel(){released=true;}}),{headers:{'content-type':'application/json'}})});
  await assert.rejects(nonSse.events('/events',()=>{}),{code:'stream_unavailable'});assert.equal(released,true);nonSse.destroy();
  let resolveFetch,lateReleased=false;const late=createApiClient({fetchImpl:()=>new Promise(resolve=>{resolveFetch=resolve;})});
  const controller=new AbortController(),request=late.events('/events',()=>{},{signal:controller.signal});controller.abort();await assert.rejects(request,{name:'AbortError'});
  resolveFetch(new Response(new ReadableStream({cancel(){lateReleased=true;}}),{headers:{'content-type':'text/event-stream'}}));await new Promise(resolve=>setTimeout(resolve,0));assert.equal(lateReleased,true);late.destroy();
  const invalid=createApiClient({fetchImpl:async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array([0xff,0xff]));controller.close();}}),{headers:{'content-type':'text/event-stream'}})});
  await assert.rejects(invalid.events('/events',()=>{}),{code:'invalid_response'});invalid.destroy();
});
