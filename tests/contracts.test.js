import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReport,parseCaseList,parseAnalyzeResponse,parseJob,ContractError} from '../src/contracts.ts';

test('report parsing validates nested fields while preserving documented variants and unknown extensions',()=>{
  const input={id:'report',demo:true,summary:'<b>plain text</b>',model_version:'v1',modules:{audio:{status:'completed',score:0,threshold:.5,segments:[{start:0,end:2,score:.2}],secondary_check:{score:.3,threshold:.4}}},next_steps:['verify'],chat_analysis:{assessment:{title:'note',summary:'text'},signals:[{title:'signal',quote:'quote'}]},ocr:{text:'material'}};
  const result=parseReport(input);
  assert.equal(result.demo,false);assert.equal(result.model_version,'v1');assert.equal(result.modules.audio.score,0);assert.equal(result.summary,input.summary);
  assert.notEqual(result,input);assert.notEqual(result.modules,input.modules);assert.equal(input.demo,true);
  assert.deepEqual(parseReport({id:'partial',modules:[{type:'video',status:'unavailable'}]}).modules,[{type:'video',status:'unavailable'}]);
  assert.deepEqual(parseReport({id:'partial',modules:null,ocr:null,chat_analysis:null}),{id:'partial',demo:false});
});

test('malformed report fields fail at the boundary instead of reaching number formatting or templates',()=>{
  for(const value of [null,[],{}, {id:''},{id:42},{id:'r',summary:{}},{id:'r',next_steps:[42]},{id:'r',modules:'wrong'},{id:'r',modules:{audio:null}},{id:'r',modules:{audio:{score:'0.8'}}},{id:'r',modules:{audio:{threshold:Infinity}}},{id:'r',modules:{audio:{segments:[{score:NaN}]}}},{id:'r',modules:{audio:{secondary_check:[]}}},{id:'r',ocr:{text:3}},{id:'r',chat_analysis:{signals:['wrong']}},{id:'r',chat_analysis:{assessment:{title:4}}}])assert.throws(()=>parseReport(value),ContractError);
});

test('case lists and upload receipts accept existing wrappers but require useful string identifiers',()=>{
  const rows=[{id:'r',filename:'file.mp3'}];
  for(const data of [rows,{items:rows},{cases:rows}])assert.deepEqual(parseCaseList(data),rows);
  for(const data of [{items:{}},[null],[{id:''}],[{id:12}],[{id:'r',filename:{}}]])assert.throws(()=>parseCaseList(data),ContractError);
  assert.deepEqual(parseAnalyzeResponse({job_id:'j'}),{job_id:'j'});
  assert.deepEqual(parseAnalyzeResponse({job_id:'j',events_url:'/api/jobs/j/events'}),{job_id:'j',events_url:'/api/jobs/j/events'});
  for(const data of [{job_id:''},{job_id:12},{job_id:'j',events_url:{}}])assert.throws(()=>parseAnalyzeResponse(data),ContractError);
});

test('job parsing normalizes agreed aliases and rejects unknown states rather than polling forever',()=>{
  assert.equal(parseJob({status:'pending'}).status,'queued');assert.equal(parseJob({status:'running'}).status,'processing');
  assert.equal(parseJob({status:'canceled'}).status,'cancelled');assert.equal(parseJob({status:'expired'}).status,'expired');
  assert.equal(parseJob({status:'succeeded',result:{id:'r'}}).result.id,'r');
  for(const data of [{status:'unknown'},{status:''},{status:'constructor'},{status:'completed'},{status:'completed',result:{id:'r',summary:[]}}])assert.throws(()=>parseJob(data),ContractError);
});

test('opaque identifiers cannot normalize into parent endpoints or carry control characters',()=>{
  for(const id of ['.','..',' padded','padded ','bad\nidentifier']){
    assert.throws(()=>parseAnalyzeResponse({job_id:id}),ContractError);
    assert.throws(()=>parseReport({id}),ContractError);
    assert.throws(()=>parseCaseList([{id}]),ContractError);
  }
  assert.equal(parseReport({id:'报告-opaque/123'}).id,'报告-opaque/123');
  assert.equal(parseReport({id:'r',modules:{audio:{secondary_check:null}}}).modules.audio.secondary_check,undefined);
});
