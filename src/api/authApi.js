// authApi.js
const BASE_URL = "https://minifeed-back.onrender.com";

let __cachedProfile = null;
async function ensureProfile() {
  if (__cachedProfile) return __cachedProfile;
  const res = await fetch(`${BASE_URL}/user/profile`, { method: "GET", credentials: "include" });
  if (!res.ok) throw new Error('Unauthorized or failed to fetch profile');
  __cachedProfile = await res.json(); // คาดหวัง { name, email, ... }
  return __cachedProfile;
}

/** =================== AUTH / USER =================== */
export async function registerUser(data) { 
  const res = await fetch(`${BASE_URL}/user/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Register failed');
  return res.json();
}

export async function loginUser(data) { 
  const res = await fetch(`${BASE_URL}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Login failed');
  // ล้าง cache โปรไฟล์เผื่อ user เปลี่ยน
  __cachedProfile = null;
  return res.json();
}

export async function logoutUser() {
  const res = await fetch(`${BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error('Logout failed');
  __cachedProfile = null;
  return res.json();
}

export async function getUserProfile() {
  return ensureProfile();
}

/** =================== POST AND UPLOAD =================== */

// ดึงโพสต์ทั้งหมด + normalize ชื่อ
export async function fetchPosts() {
  const res = await fetch(`${BASE_URL}/postandup`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error('Failed to fetch posts');
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [];
  // กันเหนียว: ถ้า BE เคย populate user.name ก็ยกมาแปะที่ post.name ให้ FE ใช้ง่าย
  return arr.map(p => ({
    ...p,
    name: p.name ?? p.user?.name ?? p.author?.name ?? p.createdBy?.name ?? p.owner?.name ?? null,
  }));
}

// สร้างโพสต์ใหม่ (แนบ name ไปด้วย)
export async function createPost({ content, image }) {
  const me = await ensureProfile(); // ดึง { name } จาก profile
  const formData = new FormData();
  formData.append('content', content);
  if (image) formData.append('file', image);
  if (me?.name) formData.append('name', me.name); // << สำคัญ

  const res = await fetch(`${BASE_URL}/postandup`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to create post');
  return await res.json();
}

// อัพเดตโพสต์ (ไม่ต้องแตะ name)
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
