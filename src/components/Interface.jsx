// src/pages/Interface.jsx
import React, { useEffect, useRef, useState } from 'react';
import './css/Interface.css';
import {
  fetchPosts as apiFetchPosts,
  createPost as apiCreatePost,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
  logoutUser,
} from "../api/authApi";

const Interface = () => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [displayName, setDisplayName] = useState(''); // ✅ ชื่อผู้ใช้สำหรับหัว Welcome
  const fileInputRef = useRef(null);

  // ดึงชื่อจาก localStorage (ถูกเซ็ตตอน login)
  useEffect(() => {
    try {
      const meRaw = localStorage.getItem('me');
      if (meRaw) {
        const me = JSON.parse(meRaw);
        if (me?.name) setDisplayName(me.name);
      }
    } catch (e) {
      console.warn('Cannot load me from localStorage');
    }
  }, []);

  const getDisplayName = (post) => {
    if (post?.name) return post.name;  // ชื่อถูกเติมมาจาก fetchPosts แล้ว
    const u = post?.author || post?.user || post?.createdBy || post?.owner || null;
    if (typeof u === 'string') return u;
    if (u && (u.name || u.displayName || u.fullName || u.username)) {
      return u.name || u.displayName || u.fullName || u.username;
    }
    return post?.authorName || 'Anonymous';
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await apiFetchPosts();
      if (data?.length) console.log('[SAMPLE POST]', data[0]);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch posts failed', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) {
      alert("กรอกข้อความหรือเลือกรูปอย่างน้อย 1 อย่างก่อนโพสต์");
      return;
    }
    try {
      if (editingPost) {
        await apiUpdatePost(editingPost._id, { content, image });
        setEditingPost(null);
      } else {
        await apiCreatePost({ content, image });
      }
      setContent('');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      loadPosts();
    } catch (err) {
      console.error('Post failed', err);
      alert("โพสต์ไม่สำเร็จ");
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setContent(post.content || '');
    setImage(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ลบโพสต์นี้จริงหรือไม่?')) return;
    try {
      await apiDeletePost(id);
      loadPosts();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout failed', err);
    }
    window.location.href = '/';
  };

  return (
    <div className="interface-container">
      <div className="interface-box">
        {/* ✅ โชว์ชื่อผู้ใช้ตรงหัว */}
        <h1>Welcome 👋 {displayName || 'User'}</h1>
        <p>You have successfully logged in.</p>

        <form onSubmit={handleSubmit} className="post-form">
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={(e) =>
              setImage(e.target.files && e.target.files[0] ? e.target.files[0] : null)
            }
          />
          <button type="submit">{editingPost ? 'Update Post' : 'Post'}</button>
        </form>

        <div className="posts-list">
          {posts.map((post) => (
            <div key={post._id} className="post-card">
              <div className="post-header">
                <div className="avatar-circle" aria-hidden />
                <div className="post-meta">
                  <div className="post-author">{getDisplayName(post)}</div>
                </div>
              </div>

              {post.content && <p className="post-content">{post.content}</p>}

              {post.imageUrl && (
                <img
                  src={`https://minifeed-back.onrender.com/uploads/${post.imageUrl}`}
                  alt="post"
                  className="post-image"
                />
              )}
              {post.image && !post.imageUrl && (
                <img
                  src={`https://minifeed-back.onrender.com/${post.image}`}
                  alt="post"
                  className="post-image"
                />
              )}

              <div className="post-actions">
                <button className="edit-btn" onClick={() => handleEdit(post)}>Edit</button>
                <button className="delete-btn" onClick={() => handleDelete(post._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
};

export default Interface;
