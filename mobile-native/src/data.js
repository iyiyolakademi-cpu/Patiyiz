import { db } from './client';

// Read through existing RLS policies. Do not use service_role or turn private
// storage paths into public URLs. This layer never bypasses server permissions.
const check = (result) => {
  if (result.error) throw result.error;
  return result.data || [];
};
export const isPublicMediaUrl = (value) =>
  typeof value === 'string' && /^https:\/\//i.test(value) &&
  !/\/storage\/v1\/object\/public\/patiyiz-private/i.test(value);

export async function getProfiles(ids) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 140);
  if (!unique.length) return [];
  return check(await db.from('profiles')
    .select('id,display_name,handle,avatar_url,bio,is_verified,is_private')
    .in('id', unique));
}

export async function getHome(userId) {
  const [p, q, saved, liked, following, blocks, stories] = await Promise.all([
    db.from('posts').select('*').order('created_at', { ascending: false }).limit(45),
    db.from('questions').select('*').order('created_at', { ascending: false }).limit(18),
    db.from('post_saves').select('post_id').eq('user_id', userId).limit(500),
    db.from('post_likes').select('post_id').eq('user_id', userId).limit(500),
    db.from('follows').select('followee_id').eq('follower_id', userId).limit(3000),
    db.from('user_blocks').select('blocked_id').eq('blocker_id', userId).limit(1000),
    db.from('patiyiz_stories').select('*').order('created_at', { ascending: false }).limit(70)
  ]);
  const posts = check(p);
  const questions = check(q);
  const follows = check(following);
  const blocked = new Set(check(blocks).map(x => x.blocked_id));
  const followingIds = new Set(follows.map(x => x.followee_id));
  const storyRows = stories.error ? [] : (stories.data || [])
    .filter(x => x.author_id === userId || followingIds.has(x.author_id))
    .filter(x => !x.expires_at || new Date(x.expires_at) > new Date());
  const visiblePosts = posts.filter(x => !blocked.has(x.author_id));
  const visibleQuestions = questions.filter(x => !blocked.has(x.author_id));
  const allIds = [
    userId,
    ...visiblePosts.map(x => x.author_id),
    ...visibleQuestions.map(x => x.author_id),
    ...storyRows.map(x => x.author_id),
  ];
  return {
    posts: visiblePosts, questions: visibleQuestions, stories: storyRows,
    profiles: await getProfiles(allIds),
    saved: new Set(check(saved).map(x => x.post_id)),
    liked: new Set(check(liked).map(x => x.post_id)),
    following: followingIds, blocked,
  };
}

export async function getReels() {
  return check(await db.from('posts').select('*')
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false }).limit(30));
}

export async function getInbox(userId) {
  const messages = check(await db.from('messages').select('*')
    .or('sender_id.eq.' + userId + ',receiver_id.eq.' + userId)
    .order('created_at', { ascending: false }).limit(150));
  const peers = [...new Set(messages.map(x => x.sender_id === userId
    ? x.receiver_id : x.sender_id))];
  return { messages, profiles: await getProfiles(peers) };
}

export async function getNotifications(userId) {
  return check(await db.from('notifications').select('*')
    .eq('owner_id', userId).order('created_at', { ascending: false }).limit(100));
}

export async function getProfilePosts(id) {
  return check(await db.from('posts').select('*')
    .eq('author_id', id).order('created_at', { ascending: false }).limit(80));
}

export async function getCounts(id) {
  const [posts, followers, following] = await Promise.all([
    db.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', id),
    db.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', id),
    db.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', id)
  ]);
  return [posts.count || 0, followers.count || 0, following.count || 0];
}

export async function getSavedPosts(userId) {
  const ids = check(await db.from('post_saves').select('post_id')
    .eq('user_id', userId).order('created_at', { ascending: false })
    .limit(100)).map(x => x.post_id);
  if (!ids.length) return [];
  const rows = check(await db.from('posts').select('*').in('id', ids));
  return ids.map(id => rows.find(row => row.id === id)).filter(Boolean);
}

export async function findProfiles(text) {
  const query = String(text || '').trim().replace(/[%_]/g, '');
  if (query.length < 2) return [];
  return check(await db.from('profiles')
    .select('id,display_name,handle,avatar_url,is_verified,is_private')
    .ilike('handle', '%' + query + '%')
    .limit(25));
}

export async function createPost(userId, body) {
  const text = body.trim();
  if (!text || text.length > 1500) throw Error('Gönderi 1–1500 karakter olmalı.');
  const response = await db.from('posts')
    .insert({ author_id: userId, body: text, species: 'Diğer', post_format: 'post' })
    .select('*').single();
  if (response.error) throw response.error;
  return response.data;
}

export async function createQuestion(userId, title, body) {
  if (title.trim().length < 5 || title.length > 150 ||
      body.trim().length < 5 || body.length > 2000)
    throw Error('Başlık 5–150, açıklama 5–2000 karakter olmalı.');
  const response = await db.from('questions').insert({
    author_id: userId, title: title.trim(), body: body.trim(), category: 'Genel'
  }).select('*').single();
  if (response.error) throw response.error;
  return response.data;
}

export async function setLike(userId, postId, liked) {
  const res = liked ? await db.from('post_likes')
    .delete().eq('user_id', userId).eq('post_id', postId)
    : await db.from('post_likes').insert({ user_id: userId, post_id: postId });
  if (res.error && res.error.code !== '23505') throw res.error;
}

export async function setSave(userId, postId, saved) {
  const res = saved ? await db.from('post_saves')
    .delete().eq('user_id', userId).eq('post_id', postId)
    : await db.from('post_saves').insert({ user_id: userId, post_id: postId });
  if (res.error && res.error.code !== '23505') throw res.error;
}

export async function sendMessage(userId, peerId, text) {
  const body = String(text || '').trim();
  if (!body || body.length > 1000 || userId === peerId)
    throw Error('Geçerli bir mesaj yaz.');
  const res = await db.from('messages').insert({
    sender_id: userId, receiver_id: peerId, body
  }).select('*').single();
  if (res.error) throw res.error;
  return res.data;
}
