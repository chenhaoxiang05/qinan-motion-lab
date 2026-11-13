import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient,ApiError} from '../src/api-client.js';

const success=value=>({ok:true,status:200,json:async()=>value});

test('API-relative requests preserve multipart bodies and normalize configured service paths',async()=>{
  const calls=[],body=new FormData();body.append('scene','chat');body.append('context','');
  const api=createApiClient({baseUrl:'https://detector.test/v1/api///',fetchImpl:async(url,options)=>{calls.push({url,options});return success({job_id:'job-1'});}});
  assert.equal(api.baseUrl,'https://detector.test/v1/api');assert.equal(api.source,api.baseUrl);
  assert.deepEqual(await api.request('/analyze',{method:'POST',body}),{job_id:'job-1'});
  assert.equal(calls[0].url,'https://detector.test/v1/api/analyze');assert.strictEqual(calls[0].options.body,body);
  assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.headers,undefined,'the browser must set the multipart boundary');
  await api.request('jobs/job-1');assert.equal(calls[1].url,'https://detector.test/v1/api/jobs/job-1');api.destroy();
});

test('default service identity includes the current origin for safe task recovery',t=>{
  const original=globalThis.location;globalThis.location={href:'https://qinan.test/app#check'};
  t.after(()=>{if(original===undefined)delete globalThis.location;else globalThis.location=original;});
  const api=createApiClient({fetchImpl:async()=>success({})});
  assert.equal(api.baseUrl,'/api');assert.equal(api.source,'https://qinan.test/api');api.destroy();
  const other=createApiClient({baseUrl:'/other-api/',fetchImpl:async()=>success({})});assert.notEqual(api.source,other.source);other.destroy();
});

test('invalid service configuration cannot redirect an API path to a different host',async()=>{
  for(const baseUrl of ['//other.test/api','javascript:alert(1)','https://user:password@host.test/api','/api?token=x'])assert.throws(()=>createApiClient({baseUrl}),{code:'configuration'});
  let calls=0;const api=createApiClient({fetchImpl:async()=>{calls++;return success({});}});
  await assert.rejects(api.request('https://other.test/analyze'),{code:'configuration'});
  await assert.rejects(api.request('//other.test/analyze'),{code:'configuration'});assert.equal(calls,0);api.destroy();
});

test('HTTP failures provide concise actionable messages without returning server traces',async()=>{
  const expected=new Map([[401,'auth_required'],[403,'forbidden'],[404,'not_found'],[413,'payload_too_large'],[415,'unsupported_media'],[422,'invalid_material'],[429,'rate_limited'],[503,'service_unavailable']]);
  for(const [status,code] of expected){
    let readBody=false;const api=createApiClient({fetchImpl:async()=>({ok:false,status,json:async()=>{readBody=true;return {detail:'private traceback token=secret'};}})});
    await assert.rejects(api.request('/analyze',{method:'POST'}),error=>error instanceof ApiError&&error.code===code&&error.status===status&&!/traceback|secret/.test(error.message));
    assert.equal(readBody,false);api.destroy();
  }
});

test('a network failure does not retry a material upload',async()=>{
  let attempts=0;const api=createApiClient({fetchImpl:async()=>{attempts++;throw new TypeError('Failed to fetch secret URL');}});
  await assert.rejects(api.request('/analyze',{method:'POST',body:new FormData()}),error=>error.code==='network'&&!error.message.includes('secret'));
  assert.equal(attempts,1);api.destroy();
});

test('invalid JSON and an HTML fallback are errors, while JSON response variants remain usable',async()=>{
  const malformed=createApiClient({fetchImpl:async()=>({ok:true,json:async()=>{throw new SyntaxError('<html>');}})});
  await assert.rejects(malformed.request('/cases'),{code:'invalid_response'});malformed.destroy();
  let decoded=false;const html=createApiClient({fetchImpl:async()=>({ok:true,headers:new Headers({'content-type':'text/html'}),json:async()=>{decoded=true;return {};}})});
  await assert.rejects(html.request('/cases'),{code:'invalid_response'});assert.equal(decoded,false);html.destroy();
  const json=createApiClient({fetchImpl:async()=>({ok:true,headers:new Headers({'content-type':'application/problem+json; charset=utf-8'}),json:async()=>({items:[]})})});
  assert.deepEqual(await json.request('/cases'),{items:[]});json.destroy();
});

test('timeout aborts the request and settles even when a transport ignores its signal',async()=>{
  let requestSignal;const api=createApiClient({fetchImpl:(_,options)=>{requestSignal=options.signal;return new Promise(()=>{});}});
  await assert.rejects(api.request('/jobs/job-1',{},null,5),{code:'timeout'});
  assert.equal(requestSignal.aborted,true);api.destroy();
});

test('external abort and client destruction retain AbortError semantics',async()=>{
  let calls=0;const signals=[];const api=createApiClient({fetchImpl:(_,options)=>{calls++;signals.push(options.signal);return new Promise(()=>{});}});
  const already=new AbortController();already.abort();await assert.rejects(api.request('/cases',{},already.signal),{name:'AbortError'});assert.equal(calls,0);
  const external=new AbortController();const request=api.request('/cases',{},external.signal);external.abort();await assert.rejects(request,{name:'AbortError'});assert.equal(signals[0].aborted,true);
  const one=api.request('/jobs/one'),two=api.request('/jobs/two');api.destroy();await assert.rejects(one,{name:'AbortError'});await assert.rejects(two,{name:'AbortError'});
  assert.equal(signals.slice(1).every(signal=>signal.aborted),true);await assert.rejects(api.request('/cases'),{name:'AbortError'});assert.equal(calls,3);
});

test('a completed request detaches its caller abort listener and clears its timeout',async()=>{
  const external=new AbortController();let captured;
  const api=createApiClient({fetchImpl:async(_,options)=>{captured=options.signal;return success({ready:true});}});
  assert.deepEqual(await api.request('/health',{signal:external.signal},null,5),{ready:true});
  external.abort();await new Promise(resolve=>setTimeout(resolve,12));assert.equal(captured.aborted,false);api.destroy();assert.equal(captured.aborted,false);
});
