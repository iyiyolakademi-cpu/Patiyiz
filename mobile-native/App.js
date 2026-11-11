import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { db, displayHandle, readableError } from './src/client';
import {
  createPost, createQuestion, findProfiles, getCounts, getHome, getInbox,
  getNotifications, getProfilePosts, getProfiles, getReels, getSavedPosts,
  isPublicMediaUrl, sendMessage, setLike, setSave
} from './src/data';

const COLOR = {
  bg: '#f8f8fb', paper: '#ffffff', ink: '#17141f', muted: '#86818f',
  line: '#eeebf1', accent: '#7238e7', accentSoft: '#f4efff', black: '#16131f'
};
const time = d => {
  if (!d) return '';
  const delta = (Date.now() - new Date(d).getTime()) / 1000;
  if (delta < 60) return 'Şimdi';
  if (delta < 3600) return Math.floor(delta / 60) + ' dk';
  if (delta < 86400) return Math.floor(delta / 3600) + ' sa';
  return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};
const nameOf = p => p?.display_name || 'Buchee üyesi';
const compactText = (value, max = 250) => {
  const str = String(value || '');
  return str.length > max ? str.slice(0, max) + '…' : str;
};
function Icon({ name, size = 23, color = COLOR.ink }) {
  return <Ionicons name={name} size={size} color={color} />;
}
function Tap({ icon, label, onPress, active, danger, filled, small, disabled }) {
  return <Pressable
    accessibilityRole="button" accessibilityLabel={label}
    onPress={onPress} disabled={disabled}
    style={[s.tap, filled && s.tapFilled, active && s.tapActive, disabled && {opacity: .5}, small && {paddingVertical: 8, paddingHorizontal: 12}]}>
    {icon ? <Icon name={icon} size={small ? 17 : 20} color={filled ? '#fff' : danger ? '#d34655' : active ? COLOR.accent : COLOR.ink} /> : null}
    {label ? <Text style={[s.tapText, filled && {color: '#fff'}, danger && {color: '#d34655'}]}>{label}</Text> : null}
  </Pressable>;
}
function Avatar({ p, size = 43 }) {
  const uri = p?.avatar_url;
  return <View style={{width: size, height: size, borderRadius: size / 2, backgroundColor: '#ebe5fa', overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}}>
    {isPublicMediaUrl(uri) ?
      <Image source={{uri}} style={{width: size, height: size}} /> :
      <Icon name="person" size={size * .55} color="#aaa0c1" />}
  </View>;
}
function PersonLine({ p, subtitle, right, onPress }) {
  return <Pressable style={s.personLine} onPress={onPress}>
    <Avatar p={p} size={46}/>
    <View style={{flex: 1, paddingLeft: 11}}>
      <Text numberOfLines={1} style={s.personName}>{nameOf(p)} {p?.is_verified ? '✓' : ''}</Text>
      <Text numberOfLines={1} style={s.subtle}>{subtitle || '@' + displayHandle(p?.handle || 'buchee')}</Text>
    </View>
    {right || <Icon name="chevron-forward" size={18} color="#b5adbc"/>}
  </Pressable>;
}
function Empty({ title, body, icon = 'sparkles-outline' }) {
  return <View style={s.empty}>
    <Icon name={icon} size={39} color="#b0a2d2"/>
    <Text style={[s.h2, {marginTop: 13}]}>{title}</Text>
    <Text style={[s.subtle, {textAlign: 'center', marginTop: 7}]}>{body}</Text>
  </View>;
}
function PostCard({ post, person, liked, saved, onLike, onSave, onAuthor, onMessage }) {
  const uri = (Array.isArray(post.images) && post.images.find(isPublicMediaUrl)) ||
    (isPublicMediaUrl(post.image_url) ? post.image_url : null);
  return <View style={s.post}>
    <Pressable style={s.postHead} onPress={onAuthor}>
      <Avatar p={person} size={42}/>
      <View style={{flex:1, paddingLeft: 10}}>
        <Text style={s.personName} numberOfLines={1}>{nameOf(person)} {person?.is_verified ? '✓' : ''}</Text>
        <Text style={s.subtle}>@{displayHandle(person?.handle || 'buchee')} · {time(post.created_at)}</Text>
      </View>
      <Icon name="ellipsis-horizontal" size={20} color="#98909e"/>
    </Pressable>
    {!!post.body && <Text style={s.postBody}>{post.body}</Text>}
    {uri ? <Image source={{uri}} style={s.postPhoto} resizeMode="cover"/> : null}
    {post.video_url && !uri ? <View style={s.videoNotice}>
      <Icon name="play-circle-outline" size={32} color={COLOR.accent}/>
      <Text style={s.subtle}>Video · Reels sekmesinde oynat</Text>
    </View> : null}
    <View style={s.actions}>
      <Pressable accessibilityLabel={liked ? 'Beğeniyi kaldır' : 'Beğen'} style={s.action} onPress={onLike}>
        <Icon name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? '#ee496a' : COLOR.ink}/>
        <Text style={s.actionText}>Beğen</Text>
      </Pressable>
      <Pressable accessibilityLabel="Mesaj gönder" style={s.action} onPress={onMessage}>
        <Icon name="chatbubble-outline" size={22}/>
        <Text style={s.actionText}>Mesaj</Text>
      </Pressable>
      <View style={{flex:1}}/>
      <Pressable accessibilityLabel={saved ? 'Kaydetmeyi kaldır' : 'Kaydet'} onPress={onSave} style={s.action}>
        <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={23} color={saved ? COLOR.accent : COLOR.ink}/>
      </Pressable>
    </View>
  </View>;
}
function QuestionCard({ question, person, onAuthor }) {
  return <View style={s.question}>
    <View style={s.questionChip}><Icon name="help-circle" size={13} color={COLOR.accent}/><Text style={s.questionChipText}>SORU</Text></View>
    <Text style={s.h2}>{question.title}</Text>
    <Text style={[s.postBody, {fontSize: 14, marginTop: 5}]}>{compactText(question.body, 350)}</Text>
    <Pressable onPress={onAuthor} style={{flexDirection: 'row', alignItems: 'center', marginTop: 14}}>
      <Avatar p={person} size={27}/>
      <Text style={[s.subtle, {marginLeft: 8}]}>{nameOf(person)} · {time(question.created_at)}</Text>
    </Pressable>
  </View>;
}
function ReelPlayer({ post, person, muted, onToggleSound, onNext, onPrev, onAuthor }) {
  const url = isPublicMediaUrl(post?.video_url) ? post.video_url : '';
  const player = useVideoPlayer(url || null, p => { p.loop = true; p.muted = muted; if (url) p.play(); });
  const touchY = useRef(null);
  useEffect(() => { player.muted = muted; }, [player, muted]);
  useEffect(() => () => player.pause(), [player]);
  return <View style={s.reelCanvas}
    onTouchStart={e => {touchY.current = e.nativeEvent.pageY;}}
    onTouchEnd={e => {
      if (touchY.current === null) return;
      const distance = e.nativeEvent.pageY - touchY.current;
      touchY.current = null;
      if (distance < -65) onNext();
      if (distance > 65) onPrev();
    }}>
    {url ? <VideoView style={StyleSheet.absoluteFill} player={player} nativeControls={false} contentFit="cover"/> :
      <Empty title="Video kullanılamıyor" body="Özel medya bağlantısı henüz desteklenmiyor."/>}
    <View style={s.reelTop}><Text style={s.reelTitle}>Reels</Text><Tap icon={muted ? 'volume-mute' : 'volume-high'} onPress={onToggleSound}/></View>
    <Pressable style={s.reelFooter} onPress={onAuthor}>
      <Avatar p={person} size={38}/>
      <View style={{flex:1, marginLeft: 9}}>
        <Text style={{color: '#fff', fontWeight: '800'}}>{nameOf(person)}</Text>
        <Text style={{color: '#f7f0ff', marginTop: 3}} numberOfLines={3}>{post.body || 'Buchee Social'}</Text>
      </View>
      <Icon name="chevron-up" color="#fff" size={22}/>
    </Pressable>
  </View>;
}
function StoryViewer({ item, person, onClose, onNext, onPrev }) {
  const picture = isPublicMediaUrl(item?.image_url) ? item.image_url : null;
  return <Modal visible={!!item} animationType="fade" transparent onRequestClose={onClose}>
    <View style={s.storyCanvas}>
      {picture ? <Image source={{uri: picture}} resizeMode="contain" style={StyleSheet.absoluteFill}/> :
        <Text style={s.storyCaption}>{item?.caption || 'Hikâye'}</Text>}
      <View style={s.storyTop}>
        <Avatar p={person} size={34}/>
        <Text style={{color:'#fff', fontWeight:'700', flex:1, marginLeft:9}}>{nameOf(person)}</Text>
        <Pressable onPress={onClose}><Icon name="close" color="#fff" size={28}/></Pressable>
      </View>
      {!!picture && !!item?.caption && <Text style={[s.storyCaption, {position:'absolute',bottom:90,left:24,right:24}]}>{item.caption}</Text>}
      <View style={{flexDirection:'row', flex:1, width:'100%', marginTop:76}}>
        <Pressable style={{flex:1}} onPress={onPrev}/>
        <Pressable style={{flex:1}} onPress={onNext}/>
      </View>
    </View>
  </Modal>;
}
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (!email.includes('@')) throw Error('Geçerli bir e-posta adresi yaz.');
      if (mode === 'reset') {
        const result = await db.auth.resetPasswordForEmail(email.trim());
        if (result.error) throw result.error;
        Alert.alert('Kontrol et', 'Bu e-posta hesabı varsa şifre yenileme bağlantısı gönderilir.');
      } else if (mode === 'register') {
        if (password.length < 8) throw Error('Şifre en az 8 karakter olmalı.');
        if (displayName.trim().length < 2) throw Error('Ad en az 2 karakter olmalı.');
        const result = await db.auth.signUp({
          email: email.trim(), password,
          options: {data: {display_name: displayName.trim()}}
        });
        if (result.error) throw result.error;
        Alert.alert('Hesap oluşturuldu', 'E-posta doğrulaması istenirse gelen kutunu kontrol et.');
      } else {
        const result = await db.auth.signInWithPassword({email:email.trim(), password});
        if (result.error) throw result.error;
        onLogin();
      }
    } catch (error) { Alert.alert('İşlem tamamlanamadı', readableError(error)); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
    <ScrollView contentContainerStyle={s.authPage} keyboardShouldPersistTaps="handled">
      <View style={s.authMark}><Text style={s.authB}>B</Text></View>
      <Text style={s.authTitle}>Buchee Social</Text>
      <Text style={s.authSubtitle}>Paylaş. Keşfet. Bağlan.</Text>
      <View style={{width:'100%', marginTop:38}}>
        <Text style={s.fieldLabel}>E-posta</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="ornek@eposta.com" style={s.input}/>
        {mode === 'register' && <>
          <Text style={s.fieldLabel}>Görünen ad</Text>
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Adın" style={s.input}/>
        </>}
        {mode !== 'reset' && <>
          <Text style={s.fieldLabel}>Şifre</Text>
          <TextInput value={password} onChangeText={setPassword} placeholder="Şifren" secureTextEntry style={s.input}/>
        </>}
        <Pressable onPress={submit} disabled={busy} style={s.primary}>
          {busy ? <ActivityIndicator color="#fff"/> : <Text style={s.primaryText}>{mode === 'login' ? 'Giriş yap' : mode === 'reset' ? 'Bağlantı gönder' : 'Hesap oluştur'}</Text>}
        </Pressable>
        <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:21}}>
          <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}><Text style={s.link}>{mode === 'login' ? 'Hesap oluştur' : 'Giriş yap'}</Text></Pressable>
          <Pressable onPress={() => setMode(mode === 'reset' ? 'login' : 'reset')}><Text style={s.link}>{mode === 'reset' ? 'Geri' : 'Şifremi unuttum'}</Text></Pressable>
        </View>
      </View>
      <Text style={[s.subtle,{textAlign:'center',marginTop:36}]}>Buchee Social mobil · Güvenli hesap girişi</Text>
    </ScrollView>
  </SafeAreaView>;
}
function Composer({ visible, onClose, onPublish }) {
  const [type, setType] = useState('post');
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await onPublish(type, title, body);
      setBody(''); setTitle(''); onClose();
    } catch (error) { Alert.alert('Paylaşılamadı', readableError(error)); }
    finally { setBusy(false); }
  }
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
      <View style={s.modalHead}>
        <Pressable onPress={onClose}><Text style={s.link}>Vazgeç</Text></Pressable>
        <Text style={s.h2}>Yeni paylaşım</Text>
        <Pressable onPress={submit} disabled={busy}><Text style={s.link}>{busy ? '...' : 'Yayınla'}</Text></Pressable>
      </View>
      <View style={{flexDirection:'row',gap:9,margin:15}}>
        <Tap label="Yazı" filled={type==='post'} onPress={() => setType('post')}/>
        <Tap label="Soru" filled={type==='question'} onPress={() => setType('question')}/>
      </View>
      {type === 'question' && <TextInput placeholder="Sorunun başlığı" style={s.input} value={title} onChangeText={setTitle} maxLength={150}/>}
      <TextInput placeholder={type==='post'?'Ne düşünüyorsun?':'Sorunu ayrıntılı anlat...'}
        value={body} onChangeText={setBody} multiline autoFocus
        maxLength={type === 'post' ? 1500 : 2000}
        style={[s.input, {marginHorizontal:15, minHeight:210, textAlignVertical:'top', paddingTop:17}]}/>
      <Text style={[s.subtle,{textAlign:'right',marginRight:25}]}>{body.length} / {type==='post'?'1500':'2000'}</Text>
      <Text style={[s.subtle,{margin:20}]}>Fotoğraf, video ve Reels yayınlama; özel medya güvenliğiyle uyumlu sonraki native aşamada etkinleştirilecek.</Text>
    </SafeAreaView>
  </Modal>;
}
function AppContent() {
  const [session, setSession] = useState(null);
  const [boot, setBoot] = useState(true);
  const [tab, setTab] = useState('home');
  const [feedMode, setFeedMode] = useState('text');
  const [postList, setPostList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [stories, setStories] = useState([]);
  const [people, setPeople] = useState({});
  const [following, setFollowing] = useState(new Set());
  const [likes, setLikes] = useState(new Set());
  const [saves, setSaves] = useState(new Set());
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reels, setReels] = useState([]);
  const [reelIndex, setReelIndex] = useState(0);
  const [mute, setMute] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [storyIndex, setStoryIndex] = useState(-1);
  const [profileId, setProfileId] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [counts, setCounts] = useState([0,0,0]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savedPage, setSavedPage] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const userId = session?.user?.id || null;

  useEffect(() => {
    let live = true;
    db.auth.getSession().then(({data}) => {
      if (live) { setSession(data.session); setBoot(false); }
    }).catch(() => {if (live) setBoot(false);});
    const {data: {subscription}} = db.auth.onAuthStateChange((event, next) => {
      if (live && ['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)) setSession(next);
    });
    return () => {live = false; subscription.unsubscribe();};
  }, []);

  const mergePeople = useCallback(list => {
    setPeople(prev => {
      const next = {...prev};
      for (const p of list || []) next[p.id] = p;
      return next;
    });
  }, []);
  const refreshHome = useCallback(async () => {
    if (!userId) return;
    const result = await getHome(userId);
    setPostList(result.posts);
    setQuestions(result.questions);
    setStories(result.stories);
    setLikes(result.liked);
    setSaves(result.saved);
    setFollowing(result.following);
    mergePeople(result.profiles);
  }, [userId, mergePeople]);
  const refreshMessages = useCallback(async () => {
    if (!userId) return;
    const result = await getInbox(userId);
    setMessages(result.messages);
    mergePeople(result.profiles);
  }, [userId, mergePeople]);
  const refreshReels = useCallback(async () => {
    const result = await getReels();
    setReels(result);
    mergePeople(await getProfiles(result.map(x => x.author_id)));
  }, [mergePeople]);
  const refreshProfile = useCallback(async id => {
    if (!id) return;
    const [posts, stats, ps] = await Promise.all([getProfilePosts(id), getCounts(id), getProfiles([id])]);
    setProfilePosts(posts); setCounts(stats); mergePeople(ps);
  }, [mergePeople]);
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (tab === 'home' || tab === 'saved') await refreshHome();
      if (tab === 'reels') await refreshReels();
      if (tab === 'messages') await refreshMessages();
      if (tab === 'notifications') setNotifications(await getNotifications(userId));
      if (tab === 'profile') await refreshProfile(profileId || userId);
    } catch (error) { Alert.alert('Yüklenemedi', readableError(error)); }
    finally {setLoading(false);}
  }, [userId, tab, profileId, refreshHome, refreshReels, refreshMessages, refreshProfile]);
  useEffect(() => { if (userId) refresh(); else {
    setPostList([]);setQuestions([]);setStories([]);setMessages([]);
    setPeople({});setThreadId(null);setTab('home');
  } }, [userId, tab, profileId]); // screen-level loading; never reload on token refresh
  useEffect(() => {
    if (!userId) return;
    getProfiles([userId]).then(mergePeople).catch(() => {});
  }, [userId, mergePeople]);
  useEffect(() => {
    let alive = true;
    if (tab !== 'explore' || search.trim().length < 2) {setResults([]);return;}
    const timer = setTimeout(() => findProfiles(search).then(rows => {if (alive) setResults(rows);}).catch(() => {}), 320);
    return () => {alive = false;clearTimeout(timer);};
  }, [tab, search]);

  const openProfile = id => {setProfileId(id);setSavedPage(false);setTab('profile');};
  const openThread = id => {if(!id || id === userId) return;setThreadId(id);setTab('messages');};
  async function publish(type, title, body) {
    if (type === 'post') await createPost(userId, body);
    else await createQuestion(userId, title, body);
    setTab('home');setFeedMode('text');await refreshHome();
  }
  async function toggleLike(id) {
    const had = likes.has(id);
    setLikes(prev => { const copy = new Set(prev); had ? copy.delete(id) : copy.add(id); return copy; });
    try { await setLike(userId, id, had); }
    catch (err) {
      setLikes(prev => { const copy = new Set(prev); had ? copy.add(id) : copy.delete(id); return copy; });
      Alert.alert('Beğeni kaydedilemedi', readableError(err));
    }
  }
  async function toggleSave(id) {
    const had = saves.has(id);
    setSaves(prev => { const copy = new Set(prev); had ? copy.delete(id) : copy.add(id); return copy; });
    try { await setSave(userId, id, had); }
    catch (err) {
      setSaves(prev => { const copy = new Set(prev); had ? copy.add(id) : copy.delete(id); return copy; });
      Alert.alert('Kaydetme başarısız', readableError(err));
    }
  }
  async function send() {
    if (!messageText.trim() || !threadId) return;
    const text = messageText;setMessageText('');
    try { await sendMessage(userId, threadId, text);await refreshMessages(); }
    catch (error) {setMessageText(text);Alert.alert('Mesaj gönderilemedi', readableError(error));}
  }
  async function saveProfile() {
    const handle = editHandle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      Alert.alert('Kullanıcı adı', '3–24 karakter, sadece küçük harf, sayı ve alt çizgi.');return;
    }
    const result = await db.from('profiles').update({
      display_name: editName.trim(), handle, bio: editBio.trim()
    }).eq('id', userId).select('*').single();
    if (result.error) {Alert.alert('Kaydedilemedi', readableError(result.error));return;}
    mergePeople([result.data]);setEditing(false);
  }

  const myProfile = people[userId] || {id:userId, display_name: 'Buchee üyesi', handle:'buchee'};
  const targetId = profileId || userId;
  const targetProfile = people[targetId] || myProfile;
  const activeStory = storyIndex >= 0 ? stories[storyIndex] : null;
  const isOwnProfile = targetId === userId;
  const threadMessages = messages.filter(m =>
    (m.sender_id === userId && m.receiver_id === threadId) ||
    (m.sender_id === threadId && m.receiver_id === userId)
  ).slice().reverse();
  const peers = useMemo(() => {
    const seen = new Set();
    return messages.filter(m => {
      const peer = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (seen.has(peer)) return false;
      seen.add(peer);return true;
    });
  }, [messages, userId]);
  const feedRows = useMemo(() => {
    if (feedMode === 'posts') return postList.filter(p => p.image_url || p.images?.length || p.video_url).map(p => ({...p, kind:'post'}));
    if (feedMode === 'reels') return [];
    const plain = postList.filter(p => !p.image_url && !p.images?.length && !p.video_url).map(p => ({...p,kind:'post'}));
    const qs = questions.map(q => ({...q,kind:'question'}));
    return [...plain,...qs].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }, [feedMode, postList, questions]);
  if (boot) return <View style={s.boot}><ActivityIndicator size="large" color={COLOR.accent}/><Text style={[s.h2,{marginTop:15}]}>Buchee Social</Text></View>;
  if (!session) return <Login onLogin={() => setTab('home')}/>;

  return <SafeAreaView style={s.container} edges={['top','bottom']}>
    <StatusBar barStyle={tab === 'reels' ? 'light-content' : 'dark-content'} backgroundColor={tab==='reels'?'#000':'#fff'}/>
    {tab !== 'reels' && <View style={s.header}>
      <Pressable accessibilityLabel={tab==='profile' && !isOwnProfile ? 'Geri' : 'Yeni paylaşım'}
        style={s.headerButton} onPress={() => {
          if (tab==='profile' && !isOwnProfile) {setProfileId(null);} else setShowComposer(true);
        }}>
        <Icon name={tab==='profile' && !isOwnProfile ? 'arrow-back' : 'add'} size={27}/>
      </Pressable>
      <Text style={s.brand}>{tab === 'messages' ? 'Mesajlar' : tab === 'notifications' ? 'Bildirimler' : tab==='explore' ? 'Keşfet' : tab==='profile' && !isOwnProfile ? nameOf(targetProfile) : 'Buchee'}</Text>
      <Pressable accessibilityLabel="Bildirimler" style={s.headerButton} onPress={() => setTab('notifications')}>
        <Icon name="notifications-outline" size={23}/>
      </Pressable>
    </View>}

    {tab === 'home' && <>
      <View style={s.pills}>
        {[['text','Yazılar ve Sorular'],['posts','Gönderiler'],['reels','Reels']].map(([id,label]) =>
          <Pressable key={id} onPress={() => id === 'reels' ? setTab('reels') : setFeedMode(id)}
            style={[s.pill,feedMode===id && s.pillSelected]}>
            <Text style={[s.pillText,feedMode===id && {color:COLOR.accent}]}>{label}</Text>
          </Pressable>)}
      </View>
      <FlatList
        key={feedMode}
        data={feedRows} keyExtractor={x => x.kind + x.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={COLOR.accent}/>}
        contentContainerStyle={{paddingBottom:25}}
        ListHeaderComponent={<>
          {stories.length > 0 && <View style={s.storyStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stories.filter((item,i,arr) => arr.findIndex(x => x.author_id === item.author_id) === i)
                .map(st => <Pressable key={st.id} onPress={() => setStoryIndex(stories.findIndex(x => x.id === st.id))} style={s.storyBubble}>
                  <View style={s.storyRing}><Avatar p={people[st.author_id]} size={55}/></View>
                  <Text style={s.storyHandle} numberOfLines={1}>{nameOf(people[st.author_id]).split(' ')[0]}</Text>
                </Pressable>)}
            </ScrollView>
          </View>}
          <Pressable style={s.composerTeaser} onPress={() => setShowComposer(true)}>
            <Avatar p={myProfile} size={35}/><Text style={[s.subtle,{flex:1, marginLeft:12}]}>Bir şeyler paylaş...</Text>
            <Icon name="create-outline" color={COLOR.accent} size={22}/>
          </Pressable>
        </>}
        ListEmptyComponent={!loading ? <Empty title="Henüz paylaşım yok" body="İlk yazıyı sen paylaşabilirsin."/> : null}
        renderItem={({item}) => item.kind === 'question'
          ? <QuestionCard question={item} person={people[item.author_id]} onAuthor={() => openProfile(item.author_id)}/>
          : <PostCard post={item} person={people[item.author_id]} liked={likes.has(item.id)} saved={saves.has(item.id)}
              onLike={() => toggleLike(item.id)} onSave={() => toggleSave(item.id)}
              onAuthor={() => openProfile(item.author_id)} onMessage={() => openThread(item.author_id)}/>}
      />
    </>}

    {tab === 'explore' && <View style={{flex:1}}>
      <View style={s.searchBox}>
        <Icon name="search-outline" size={23} color={COLOR.muted}/>
        <TextInput style={{flex:1,marginLeft:10,fontSize:16,color:COLOR.ink}} placeholder="Kullanıcı ara..." value={search} onChangeText={setSearch} autoCapitalize="none"/>
        {!!search && <Pressable onPress={() => setSearch('')}><Icon name="close-circle" color={COLOR.muted}/></Pressable>}
      </View>
      <FlatList data={results} keyExtractor={x=>x.id} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{paddingHorizontal:14}}
        renderItem={({item}) => <PersonLine p={item} onPress={() => openProfile(item.id)}/>}
        ListEmptyComponent={<Empty icon="compass-outline" title={search.length<2?'Keşfet':'Sonuç bulunamadı'}
          body={search.length<2?'Kişi aramak için yukarı yaz.':'Başka bir kullanıcı adı dene.'}/>}
      />
    </View>}

    {tab === 'reels' && <>
      {reels.length > 0 ? <ReelPlayer key={reels[reelIndex]?.id}
        post={reels[reelIndex]} person={people[reels[reelIndex]?.author_id]}
        muted={mute} onToggleSound={() => setMute(!mute)}
        onNext={() => setReelIndex(i=>Math.min(reels.length-1,i+1))}
        onPrev={() => setReelIndex(i=>Math.max(0,i-1))}
        onAuthor={() => openProfile(reels[reelIndex].author_id)}/> :
        <View style={[s.reelCanvas,{justifyContent:'center'}]}><Empty title="Henüz Reels yok" body="Videolar burada görünecek."/></View>}
      <View style={{position:'absolute',top:15,left:15}}><Pressable onPress={() => setTab('home')}><Icon name="arrow-back" color="#fff" size={26}/></Pressable></View>
    </>}

    {tab === 'messages' && (threadId ? <>
      <View style={s.threadHeader}>
        <Pressable onPress={() => setThreadId(null)} style={{padding:8}}><Icon name="arrow-back" size={24}/></Pressable>
        <Avatar p={people[threadId]} size={38}/>
        <Text style={[s.personName,{marginLeft:10, flex:1}]}>{nameOf(people[threadId])}</Text>
      </View>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <FlatList data={threadMessages} keyExtractor={x=>x.id}
          contentContainerStyle={{padding:15,flexGrow:1,justifyContent:'flex-end'}}
          renderItem={({item}) => {
            const own = item.sender_id === userId;
            return <View style={[s.messageBubble,own?s.messageMine:s.messageOther]}>
              <Text style={[s.messageBody,own&&{color:'#fff'}]}>{item.body}</Text>
              <Text style={{fontSize:10,color:own?'#e4d5ff':COLOR.muted,textAlign:'right',marginTop:5}}>{time(item.created_at)}</Text>
            </View>;
          }}/>
        <View style={s.replyBox}>
          <TextInput placeholder="Mesaj gönder..." style={s.replyInput} value={messageText}
            onChangeText={setMessageText} multiline maxLength={1000}/>
          <Pressable disabled={!messageText.trim()} onPress={send} style={s.sendIcon}>
            <Icon name="send" color="#fff" size={19}/>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </> : <FlatList data={peers} keyExtractor={x=>x.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}
      renderItem={({item}) => {
        const peer = item.sender_id===userId?item.receiver_id:item.sender_id;
        return <PersonLine p={people[peer]} subtitle={compactText(item.body,60)}
          onPress={()=>setThreadId(peer)} right={<Text style={s.subtle}>{time(item.created_at)}</Text>}/>;
      }}
      ListEmptyComponent={!loading?<Empty icon="chatbubbles-outline" title="Mesajların burada" body="Bir profilden Mesaj seçerek sohbet başlat.":null}/>
    ) }

    {tab === 'notifications' && <FlatList data={notifications} keyExtractor={x=>x.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}
      renderItem={({item}) => <Pressable style={[s.notification,!item.read&&{backgroundColor:'#faf7ff'}]}
        onPress={async()=>{
          if (!item.read) {
            const r=await db.from('notifications').update({read:true}).eq('id',item.id).eq('owner_id',userId);
            if (!r.error) setNotifications(a=>a.map(n=>n.id===item.id?{...n,read:true}:n));
          }
          if(item.actor_id) openProfile(item.actor_id);
        }}>
        <View style={s.notifIcon}><Icon name="notifications-outline" color={COLOR.accent}/></View>
        <View style={{flex:1,marginLeft:12}}>
          <Text style={s.personName}>{item.text}</Text>
          <Text style={s.subtle}>{time(item.created_at)}</Text>
        </View>
        {!item.read&&<View style={{height:8,width:8,borderRadius:5,backgroundColor:COLOR.accent}}/>}
      </Pressable>}
      ListEmptyComponent={!loading?<Empty icon="notifications-outline" title="Bildirim yok" body="Yeni bildirimler burada görünecek.":null}/>
    />}

    {tab === 'profile' && <ScrollView contentContainerStyle={{paddingBottom:35}}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}>
      <View style={s.profileTop}>
        <Avatar p={targetProfile} size={82}/>
        <View style={{flex:1,marginLeft:16}}>
          <Text style={s.profileName}>{nameOf(targetProfile)} {targetProfile.is_verified?'✓':''}</Text>
          <Text style={[s.subtle,{marginTop:5}]}>@{displayHandle(targetProfile.handle)}</Text>
          <Text style={[s.postBody,{fontSize:13,marginTop:6}]}>{targetProfile.bio || ''}</Text>
        </View>
      </View>
      <View style={s.statBar}>
        {['Gönderi','Takipçi','Takip'].map((label,i) => <View style={s.stat} key={label}>
          <Text style={s.statNum}>{counts[i]}</Text><Text style={s.subtle}>{label}</Text>
        </View>)}
      </View>
      <View style={{flexDirection:'row',gap:9,paddingHorizontal:15,paddingTop:5}}>
        {isOwnProfile ? <>
          <View style={{flex:1}}><Tap label="Profili düzenle" onPress={() => {
            setEditName(myProfile.display_name||'');setEditHandle(displayHandle(myProfile.handle||''));
            setEditBio(myProfile.bio||'');setEditing(true);
          }}/></View>
          <View style={{flex:1}}><Tap label="İstatistikler" onPress={() => Alert.alert('İstatistikler',
            'Gönderi: '+counts[0]+'\nTakipçi: '+counts[1]+'\nTakip: '+counts[2])}/></View>
        </> : <Tap icon="chatbubble-outline" label="Mesaj gönder" filled onPress={() => openThread(targetId)}/>}
      </View>
      {isOwnProfile && <View style={{flexDirection:'row',justifyContent:'space-between',padding:15}}>
        <Pressable onPress={async()=>{setSavedPage(!savedPage);if(!savedPage) {
          try {const rows=await getSavedPosts(userId);setProfilePosts(rows);}
          catch(e){Alert.alert('Kaydedilenler',readableError(e));}
        } else refreshProfile(userId);}}>
          <Text style={[s.link,{fontSize:13}]}>{savedPage?'Paylaşımlarım':'Kaydedilenler'}</Text>
        </Pressable>
        <Pressable onPress={() => Alert.alert('Çıkış yap','Hesabından çıkmak istiyor musun?',[
          {text:'Vazgeç',style:'cancel'},
          {text:'Çıkış yap',style:'destructive',onPress:()=>db.auth.signOut()}
        ])}><Text style={[s.link,{fontSize:13,color:'#c74c67'}]}>Çıkış yap</Text></Pressable>
      </View>}
      <Text style={[s.sectionTitle,{marginHorizontal:15,marginBottom:10}]}>{savedPage ? 'Kaydedilenler' : 'Paylaşımlar'}</Text>
      {profilePosts.length ? profilePosts.map(p => <PostCard key={p.id} post={p}
        person={people[p.author_id]||targetProfile}
        liked={likes.has(p.id)} saved={saves.has(p.id)}
        onLike={()=>toggleLike(p.id)} onSave={()=>toggleSave(p.id)}
        onAuthor={()=>openProfile(p.author_id)} onMessage={()=>openThread(p.author_id)}/>) :
        !loading && <Empty title="Paylaşım yok" body="Burada henüz bir paylaşım bulunmuyor."/>}
    </ScrollView>}

    {tab !== 'reels' && <View style={s.bottomNav}>
      {[['home','home-outline','Ana sayfa'],['explore','search-outline','Keşfet'],
        ['reels','play-circle-outline','Reels'],['messages','chatbubble-outline','Mesajlar'],
        ['profile','person-circle-outline','Profil']].map(([id,icon,label]) =>
        <Pressable accessibilityLabel={label} key={id} onPress={() => {
          setThreadId(null);if(id==='profile')setProfileId(null);setTab(id);
        }} style={s.bottomItem}>
          <Icon name={tab===id?icon.replace('-outline',''):icon} size={25} color={tab===id?COLOR.accent:COLOR.muted}/>
          <Text style={[s.bottomLabel,tab===id&&{color:COLOR.accent,fontWeight:'800'}]}>{label}</Text>
        </Pressable>)}
    </View>}

    <Composer visible={showComposer} onClose={() => setShowComposer(false)} onPublish={publish}/>
    <StoryViewer item={activeStory} person={people[activeStory?.author_id]}
      onClose={() => setStoryIndex(-1)}
      onNext={() => setStoryIndex(i => i + 1 < stories.length ? i + 1 : -1)}
      onPrev={() => setStoryIndex(i => Math.max(i - 1, 0))}/>
    <Modal visible={editing} animationType="slide" onRequestClose={()=>setEditing(false)}>
      <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
        <View style={s.modalHead}>
          <Pressable onPress={()=>setEditing(false)}><Text style={s.link}>İptal</Text></Pressable>
          <Text style={s.h2}>Profili düzenle</Text>
          <Pressable onPress={saveProfile}><Text style={s.link}>Kaydet</Text></Pressable>
        </View>
        <View style={{padding:16}}>
          <Text style={s.fieldLabel}>Görünen ad</Text>
          <TextInput style={s.input} value={editName} onChangeText={setEditName} maxLength={70}/>
          <Text style={s.fieldLabel}>Kullanıcı adı</Text>
          <TextInput style={s.input} value={editHandle} onChangeText={setEditHandle} autoCapitalize="none" maxLength={24}/>
          <Text style={s.fieldLabel}>Biyografi</Text>
          <TextInput multiline style={[s.input,{height:110,textAlignVertical:'top'}]} value={editBio} onChangeText={setEditBio} maxLength={500}/>
        </View>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><AppContent/></SafeAreaProvider>;
}

const s = StyleSheet.create({
  boot:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},
  container:{flex:1,backgroundColor:COLOR.bg},
  header:{height:54,backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:COLOR.line,paddingHorizontal:13},
  headerButton:{width:38,height:44,alignItems:'center',justifyContent:'center'},
  brand:{fontSize:25,fontWeight:'900',color:COLOR.black,letterSpacing:-1.1},
  pills:{backgroundColor:'#fff',flexDirection:'row',paddingHorizontal:10,paddingVertical:9,gap:7,borderBottomWidth:1,borderColor:COLOR.line},
  pill:{flex:1,paddingVertical:9,paddingHorizontal:4,alignItems:'center',borderRadius:10},
  pillSelected:{backgroundColor:COLOR.accentSoft},
  pillText:{fontSize:12,fontWeight:'800',color:COLOR.muted},
  storyStrip:{backgroundColor:'#fff',paddingHorizontal:8,paddingVertical:15,borderBottomWidth:1,borderColor:COLOR.line},
  storyBubble:{alignItems:'center',width:78},
  storyRing:{borderRadius:40,borderWidth:2,borderColor:COLOR.accent,padding:3},
  storyHandle:{fontSize:11,marginTop:6,fontWeight:'600',color:COLOR.ink,maxWidth:75},
  composerTeaser:{backgroundColor:'#fff',flexDirection:'row',alignItems:'center',paddingHorizontal:18,paddingVertical:12,marginBottom:7,borderBottomWidth:1,borderColor:COLOR.line},
  post:{backgroundColor:'#fff',marginBottom:7,paddingHorizontal:15,paddingTop:14,borderBottomWidth:1,borderColor:COLOR.line},
  postHead:{flexDirection:'row',alignItems:'center',marginBottom:10},
  personName:{fontSize:14,fontWeight:'800',color:COLOR.ink},
  subtle:{fontSize:12,color:COLOR.muted,lineHeight:18},
  postBody:{fontSize:15.5,color:COLOR.ink,lineHeight:23,marginBottom:10},
  postPhoto:{width:'100%',height:340,borderRadius:14,backgroundColor:'#f2eff6',marginBottom:14},
  videoNotice:{height:120,backgroundColor:COLOR.accentSoft,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:12},
  actions:{height:49,flexDirection:'row',alignItems:'center',gap:22,borderTopWidth:.5,borderColor:COLOR.line},
  action:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:8},
  actionText:{color:COLOR.muted,fontSize:12},
  question:{backgroundColor:'#fff',marginBottom:7,padding:18,borderBottomWidth:1,borderColor:COLOR.line},
  questionChip:{flexDirection:'row',alignItems:'center',gap:5,marginBottom:9},
  questionChipText:{color:COLOR.accent,fontWeight:'900',fontSize:10,letterSpacing:1.2},
  h2:{fontSize:17,fontWeight:'800',color:COLOR.ink},
  personLine:{paddingHorizontal:17,paddingVertical:12,backgroundColor:'#fff',flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:COLOR.line},
  empty:{alignItems:'center',justifyContent:'center',paddingHorizontal:25,paddingVertical:75},
  tap:{flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:COLOR.line,paddingHorizontal:15,paddingVertical:11,backgroundColor:'#fff'},
  tapActive:{borderColor:COLOR.accent},
  tapFilled:{backgroundColor:COLOR.accent,borderColor:COLOR.accent},
  tapText:{fontSize:13,fontWeight:'800',color:COLOR.ink},
  searchBox:{margin:13,paddingHorizontal:14,backgroundColor:'#fff',borderWidth:1,borderColor:COLOR.line,borderRadius:14,height:50,flexDirection:'row',alignItems:'center'},
  bottomNav:{height:61,flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderColor:COLOR.line,paddingTop:6},
  bottomItem:{flex:1,alignItems:'center',justifyContent:'center'},
  bottomLabel:{fontSize:10,fontWeight:'600',color:COLOR.muted,marginTop:4},
  reelCanvas:{flex:1,backgroundColor:'#050506',overflow:'hidden'},
  reelTop:{position:'absolute',top:23,left:18,right:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  reelTitle:{fontSize:20,color:'#fff',fontWeight:'900'},
  reelFooter:{position:'absolute',bottom:35,left:18,right:18,flexDirection:'row',alignItems:'center',padding:12,backgroundColor:'#00000044',borderRadius:14},
  storyCanvas:{flex:1,backgroundColor:'#06020b',justifyContent:'center',alignItems:'center'},
  storyTop:{position:'absolute',top:52,left:18,right:18,flexDirection:'row',alignItems:'center',zIndex:3},
  storyCaption:{color:'#fff',fontSize:18,fontWeight:'700',textAlign:'center',paddingHorizontal:30},
  authPage:{paddingHorizontal:30,paddingTop:90,alignItems:'center',paddingBottom:35},
  authMark:{height:82,width:82,borderRadius:24,backgroundColor:COLOR.black,alignItems:'center',justifyContent:'center'},
  authB:{fontSize:57,fontWeight:'900',color:'#fff'},
  authTitle:{fontSize:34,fontWeight:'900',color:COLOR.ink,marginTop:23,letterSpacing:-1.2},
  authSubtitle:{fontSize:15,color:COLOR.muted,marginTop:7},
  fieldLabel:{fontSize:13,color:COLOR.ink,fontWeight:'800',marginBottom:8,marginTop:13},
  input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e3e0e9',borderRadius:12,paddingHorizontal:15,paddingVertical:13,fontSize:15,color:COLOR.ink},
  primary:{height:53,borderRadius:13,backgroundColor:COLOR.accent,alignItems:'center',justifyContent:'center',marginTop:22},
  primaryText:{color:'#fff',fontWeight:'900',fontSize:16},
  link:{color:COLOR.accent,fontWeight:'800',fontSize:14},
  modalHead:{height:60,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:COLOR.line},
  notification:{padding:15,flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderBottomWidth:1,borderColor:COLOR.line},
  notifIcon:{width:41,height:41,borderRadius:20,backgroundColor:COLOR.accentSoft,alignItems:'center',justifyContent:'center'},
  threadHeader:{backgroundColor:'#fff',height:56,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:COLOR.line,paddingHorizontal:10},
  replyBox:{flexDirection:'row',backgroundColor:'#fff',alignItems:'center',padding:11,borderTopWidth:1,borderColor:COLOR.line},
  replyInput:{backgroundColor:COLOR.bg,flex:1,paddingHorizontal:13,minHeight:44,maxHeight:110,borderRadius:22,color:COLOR.ink},
  sendIcon:{height:42,width:42,backgroundColor:COLOR.accent,borderRadius:21,alignItems:'center',justifyContent:'center',marginLeft:9},
  messageBubble:{maxWidth:'83%',borderRadius:17,paddingVertical:10,paddingHorizontal:13,marginVertical:4},
  messageMine:{backgroundColor:COLOR.accent,alignSelf:'flex-end',borderBottomRightRadius:5},
  messageOther:{backgroundColor:'#fff',alignSelf:'flex-start',borderBottomLeftRadius:5},
  messageBody:{fontSize:14,color:COLOR.ink,lineHeight:20},
  profileTop:{flexDirection:'row',alignItems:'center',padding:19,backgroundColor:'#fff'},
  profileName:{fontSize:18,fontWeight:'900',color:COLOR.ink},
  statBar:{backgroundColor:'#fff',flexDirection:'row',justifyContent:'space-around',paddingBottom:15},
  stat:{alignItems:'center'},
  statNum:{color:COLOR.ink,fontWeight:'900',fontSize:18},
  sectionTitle:{color:COLOR.ink,fontWeight:'800',fontSize:15}
});
