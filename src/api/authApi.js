const BASE_URL = "https://minifeed-back.onrender.com";

/* ---------- ME CACHE (ไม่พึ่ง /user/profile) ---------- */
let __cachedProfile = null;

function setCachedMe(me) {
  if (me && (me._id || me.id)) {
    __cachedProfile = { _id: me._id || me.id, name: me.name };
    try { localStorage.setItem('me', JSON.stringify(__cachedProfile)); } catch {}
  }
}

function getCachedMe() {
  if (__cachedProfile) return __cachedProfile;
  try {
    const raw = localStorage.getItem('me');
    if (raw) { __cachedProfile = JSON.parse(raw); }
  } catch {}
  return __cachedProfile;
}

/** =================== AUTH / USER =================== */
export async function registerUser(data) {
  const res = await fetch(`${BASE_URL}/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Register failed');
  const out = await res.json();
  // ถ้า API register ตอบกลับ user ให้ cache ไว้เลย (เผื่อบางระบบล็อกอินอัตโนมัติ)
  if (out?.user || out?._id || out?.id) setCachedMe(out.user ?? out);
  return out;
}

export async function loginUser(data) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Login failed');
  const out = await res.json();
  // ⬅️ สำคัญ: เก็บโปรไฟล์จาก response (ปรับให้ตรงกับรูปแบบของคุณ)
  // ตัวอย่างที่พบบ่อย: { user: { _id, name, ... }, token: ... }
  if (out?.user || out?._id || out?.id) setCachedMe(out.user ?? out);
  return out;
}

export async function logoutUser() {
  const res = await fetch(`${BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error('Logout failed');
  __cachedProfile = null;
  try { localStorage.removeItem('me'); } catch {}
  return res.json();
}

/** =================== POST AND UPLOAD =================== */

// ดึงโพสต์ทั้งหมด + เติมชื่อของ "ฉัน" ให้โพสต์ที่เป็นของฉัน
export async function fetchPosts() {
  const res = await fetch(`${BASE_URL}/postandup`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error('Failed to fetch posts');
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [];

  const me = getCachedMe(); // {_id, name} หรือ null

  return arr.map(p => {
    const nameFromApi =
      p.name ??
      p.user?.name ??
      p.author?.name ??
      p.createdBy?.name ??
      p.owner?.name ??
      null;

    // ถ้า API ไม่ส่งชื่อมา แต่เป็นโพสต์ของฉัน → เติมชื่อฉันให้
    const name =
      nameFromApi ??
      ((me && (p.userId === me._id || p.user === me._id)) ? me.name : null);

    return { ...p, name };
  });
}

// สร้างโพสต์ใหม่ (แนบ name จาก cache — ไม่เรียก /user/profile)
export async function createPost({ content, image }) {
  const me = getCachedMe();
  const formData = new FormData();
  formData.append('content', content);
  if (image) formData.append('file', image);
  if (me?.name) formData.append('name', me.name); // แนบชื่อไปให้ BE เก็บเลย (ถ้า BE รับฟิลด์นี้)

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
