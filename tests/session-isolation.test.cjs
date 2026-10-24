const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');
const gallery = fs.readFileSync('gallery-picker.js', 'utf8');
function segment(begin, end) {
  const a = app.indexOf(begin), b = app.indexOf(end, a + begin.length);
  assert.ok(a >= 0 && b > a, 'Missing source segment: ' + begin);
  return app.slice(a, b);
}

test('Oturum kapanırken önceki hesaba ait veriler, medya bağlantıları ve sohbet seçimi temizlenir', () => {
  let pickerClosed = 0, editorDisposed = 0, mediaCleared = 0, stopTracks = 0;
  const ctx = {
    patiyizLoadToken: 1, patiyizLoadedTables: new Set(['messages']),
    patiyizDeferredLoading: Promise.resolve(),
    data: { messages: [{ id: 'private' }], profiles: [{ id: 'old' }], posts: [{ id: 'oldpost' }] },
    favorites: new Set(['secret']), followed: new Set(['old']), liked: new Set(['old']),
    saved: new Set(['old']), voted: new Set(['old']), blocked: new Set(['old']),
    blockedProfiles: [{ id: 'old' }], patiDmSignedCache: new Map([['old', 'url']]),
    profileCountCache: new Map([['old', 10]]), profileCountInFlight: new Set(['old']),
    personId: 'old', profileId: 'old', selectedPostId: 'old',
    followListId: 'old', search: 'old', view: 'messages', chatFilter: 'requests',
    mobileChatOpen: true, isAdmin: true,
    storyItems: [{ id: 'old' }], storyLikes: ['old'], storyIndex: 1, storyTimer: null,
    lastPhotoTap: { id: 'old', time: 100 },
    document: { getElementById: () => null, body: { classList: { remove() {} } } },
    window: {
      PatiyizGalleryPicker: { close() { pickerClosed++; } },
      PatiyizReelsEditor: { dispose() { editorDisposed++; } }
    },
    clearPatiMediaUrls() { mediaCleared++; },
    dmCancel: false, dmRecorder: null, dmStream: { getTracks() { return [{ stop() { stopTracks++; } }]; } },
    dmRecipient: 'old', dmParts: [1], dmMediaSending: true,
    clearTimeout, console
  };
  const fn = vm.runInNewContext(segment('function resetSessionState(){', 'async function boot(){') + '\nresetSessionState', ctx);
  fn();
  assert.equal(ctx.patiyizLoadToken, 2);
  assert.equal(ctx.data.messages.length, 0);
  assert.equal(ctx.data.profiles.length, 0);
  assert.equal(ctx.patiyizLoadedTables.size, 0);
  assert.equal(ctx.patiDmSignedCache.size, 0);
  assert.equal(ctx.personId, '');
  assert.equal(ctx.profileId, '');
  assert.equal(ctx.view, 'home');
  assert.equal(ctx.isAdmin, false);
  assert.equal(ctx.blocked.size, 0);
  assert.equal(ctx.dmRecipient, null);
  assert.equal(stopTracks, 1);
  assert.equal(pickerClosed, 1);
  assert.equal(editorDisposed, 1);
  assert.equal(mediaCleared, 1);
});

test('Eski hesaptan kalan gecikmiş mesaj sorgusu yeni hesabın verilerini değiştirmez', async () => {
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  let renders = 0;
  const ctx = {
    me: { id: 'first' }, patiyizLoadToken: 0, data: { messages: [{ id: 'first-message' }] },
    sb: { from() { return { select() { return this; }, order() { return this; }, limit() { return gate; } }; } },
    navRender() { renders++; }, render() { renders++; }
  };
  const fn = vm.runInNewContext(segment('async function refreshKeys(specs){', 'async function refresh(){') + '\nrefreshKeys', ctx);
  const pending = fn([['messages', 'messages']]);
  ctx.me = { id: 'second' }; ctx.patiyizLoadToken++;
  finish({ data: [{ id: 'first-account-result' }], error: null });
  await pending;
  assert.equal(ctx.data.messages[0].id, 'first-message');
  assert.equal(renders, 0);
});

test('Realtime verisi de oturum değiştiğinde uygulanmaz', async () => {
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const ctx = {
    me: { id: 'first' }, patiyizLoadToken: 3,
    data: { messages: [{ id: 'safe' }], notifications: [] },
    pageLimits: { messages: 150, notifications: 150 },
    sb: { from() { return { select() { return this; }, order() { return this; }, limit() { return gate; } }; } }
  };
  const fn = vm.runInNewContext(segment('async function refreshLiveTables(){', 'function queueLiveUpdate(){') + '\nrefreshLiveTables', ctx);
  const promise = fn();
  ctx.me = { id: 'second' };
  finish({ error: null, data: [{ id: 'stale' }] });
  assert.equal(await promise, false);
  assert.equal(ctx.data.messages[0].id, 'safe');
});

test('Özel mesaj kaydı reddedilirse yüklenen dosya sunucudan temizlenir', async () => {
  const removed = [];
  const ctx = {
    me: { id: 'author' },
    crypto: { randomUUID: () => 'random-key' },
    sb: {
      storage: { from() { return {
        async upload() { return { error: null }; },
        async remove(paths) { removed.push(...paths); return { error: null }; }
      }; } },
      from() { return { insert() { return { select() { return { async single() { return { error: { message: 'write failed' } }; } }; } }; } }; }
    },
    console
  };
  const fn = vm.runInNewContext(segment('async function uploadDmFile(', 'const patiDmSignedCache=new Map();') + '\nuploadDmFile', ctx);
  await assert.rejects(() => fn({ size: 350, type: 'image/jpeg', name: 'photo.jpg' }, 'image', 'friend'), err => err?.message === 'write failed');
  assert.deepEqual(removed, ['author/random-key.jpg']);
});

test('Galeri boşken sahte birinci seçim bulunmaz ve önceki asenkron seçim yeni ekranı kapatamaz', () => {
  assert.match(gallery, /items\.length\?\[0\]:\[\]/);
  assert.match(gallery, /const openedSession=session/);
  assert.match(gallery, /if\(session!==openedSession\)return/);
  assert.match(app, /if\(me\?\.id!==userId\|\|patiyizLoadToken!==loadToken\)return/);
});
