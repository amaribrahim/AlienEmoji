import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaURL, enforcePlayback} from '../portfolio/portfolio-core.mjs';

test('local file punctuation is encoded while external URLs are preserved', () => {
 assert.equal(mediaURL('media/take#2?50%.mp3','https://example.com/portfolio/game/'), 'https://example.com/portfolio/game/media/take%232%3F50%25.mp3');
 assert.equal(mediaURL('https://cdn.example.com/a.mp3?token=1','https://example.com/'), 'https://cdn.example.com/a.mp3?token=1');
 assert.throws(()=>mediaURL('javascript:alert(1)','https://example.com/'));
});
test('a queued play event for an already-paused track does not stop the new track', () => {
 const a={paused:true,pause(){this.paused=true;}}, b={paused:false,pause(){this.paused=true;}};
 enforcePlayback(a,new Set([a,b]),false);
 assert.equal(b.paused,false);
 a.paused=false;
 enforcePlayback(a,new Set([a,b]),false);
 assert.equal(b.paused,true);
 enforcePlayback(a,new Set([a,b]),true);
 assert.equal(a.paused,true);
});
