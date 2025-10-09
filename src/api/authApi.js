// src/api/authApi.js
const BASE_URL = "https://minifeed-back.onrender.com";

/* ---------- ME CACHE (ไม่พึ่ง /user/profile) ---------- */
let __cachedProfile = null;

function setCachedMe(me) {
  if (!me) return;
  const id = me._id || me.id;
  const name = me.name || me.username || me.displayName || null;
  if (id) {
    __cachedProfile = { _id: String(id), name };
    try { localStorage.setItem('me', JSON.stringify(__cachedProfile)); } catch {}
  }
}

export function getCachedMe() {
  if (__cachedProfile) return __cachedProfile;
  try {
    const raw = localStorage.getItem('me');
    if (raw) __cachedProfile = JSON.parse(raw);
  } catch {}
  return __cachedProfile;
}

function extractUser(out) {
  if (!out) return null;
  if (out.user) return out.user;                // { user: {...} }
  if (out.profile) return out.profile;          // { profile: {...} }
  if (out.data?.user) return out.data.user;     // { data: { user: {...} } }
  if (out.data?.profile) return out.data.profile;
  return {                                      // flat
    _id: out._id || out.id,
    name: out.name || out.username || out.displayName || null,
  };
}

/** =================== AUTH / USER =================== */
export async function registerUser(data) {
  const res = await fetch(`${BASE_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Register failed');
  const out = await res.json();
  setCachedMe(extractUser(out));    // เผื่อ API คืน user กลับมา
  return out;
}

export async function loginUser(data) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Login failed');
  const out = await res.json();
  setCachedMe(extractUser(out));    // เก็บ {_id,name} ไว้ใช้เทียบกับ post.userId
  return out;
}

export async function logoutUser() {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error('Logout failed');
  __cachedProfile = null;
  try { localStorage.removeItem('me'); } catch {}
  return res.json();
}

/** =================== POST AND UPLOAD =================== */

// ดึงโพสต์ทั้งหมด + เติมชื่อให้โพสต์ของเราเอง
export async function fetchPosts() {
  const res = await fetch(`${BASE_URL}/postandup`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error('Failed to fetch posts');
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [];

  const me = getCachedMe();                    // {_id, name} หรือ null
  const myId = me?._id ? String(me._id) : null;

  return arr.map((p) => {
    const nameFromApi =
      p.name ??
      p.user?.name ??
      p.author?.name ??
      p.createdBy?.name ??
      p.owner?.name ??
      null;

    const postUserId =
      p.userId ? String(p.userId)
               : (p.user ? String(p.user) : null);

    const isMine = !!(myId && postUserId && postUserId === myId);

    const name = nameFromApi ?? (isMine ? (me.name || 'You') : null);

    return { ...p, name };
  });
}

// สร้างโพสต์ใหม่ (แนบ name ไปด้วยถ้ามี)
export async function createPost({ content, image }) {
  const me = getCachedMe();
  const formData = new FormData();
  formData.append('content', content);
  if (image) formData.append('file', image);
  if (me?.name) formData.append('name', me.name); // ถ้า BE รองรับ field นี้

  const res = await fetch(`${BASE_URL}/postandup`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to create post');
  return await res.json();
}

export async function updatePost(id, { content, image }) {
  const formData = new FormData();
  if (content !== undefined) formData.append('content', content);
  if (image) formData.append('file', image);

  const res = await fetch(`${BASE_URL}/postandup/${id}`, {
    method: "PATCH",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to update post');
  return await res.json();
}

export async function deletePost(id) {
  const res = await fetch(`${BASE_URL}/postandup/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error('Failed to delete post');
  return await res.json();
}
