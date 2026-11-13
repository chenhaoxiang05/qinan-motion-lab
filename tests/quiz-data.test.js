import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quiz} from '../src/quiz.js';

test('six fictional cases retain their answers and provide matched evidence clues and unique review tips',()=>{
  assert.equal(quiz.length,6);assert.deepEqual(quiz.map(q=>q.correct),[1,2,0,1,2,0]);
  assert.equal(new Set(quiz.map(q=>q.id)).size,6);assert.equal(new Set(quiz.map(q=>q.reviewQA.id)).size,6);
  for(const q of quiz){
    assert.equal(q.answers.length,3);assert.ok(q.answers[q.correct]);assert.ok(q.shortLabel&&q.materialLabel&&q.sender&&q.senderMeta);
    assert.ok(q.reviewQA.question.length>8&&q.reviewQA.answer.length>30);
    const highlighted=new Set(q.bodySegments.filter(s=>s.clue).map(s=>s.clue));
    assert.ok(highlighted.size>0);assert.deepEqual(highlighted,new Set(q.keyClues.map(c=>c.id)),'visible clue labels match marked source text');
    assert.ok(q.bodySegments.every(segment=>typeof segment.text==='string'&&segment.text.length>0));
  }
});
