/**
 * XActions Archive Viewer Generator
 * Generates a self-contained HTML file that displays an exported Twitter account.
 * Single file, zero dependencies, works offline.
 * Dark theme, card-based tweet display, pagination, profile header with stats, search.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

/**
 * Generate a beautiful self-contained HTML archive viewer
 *
 * @param {object} data
 * @param {object} data.profile - Profile object
 * @param {object[]} data.tweets - Tweets array
 * @param {object[]} data.followers - Followers array
 * @param {object[]} data.following - Following array
 * @param {object[]} data.bookmarks - Bookmarks array
 * @param {object[]} data.likes - Likes array
 * @returns {string} Complete HTML document
 */
export function generateArchiveHTML(data) {
  const { profile = {}, tweets = [], followers = [], following = [], bookmarks = [], likes = [] } = data;

  const safeJSON = (obj) => JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  const displayName = profile.name || profile.username || 'Unknown';
  const handle = profile.username || 'unknown';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>@${handle} — XActions Archive</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#000;--surface:#16181c;--border:#2f3336;--text:#e7e9ea;--text2:#71767b;--accent:#1d9bf0;--green:#00ba7c;--red:#f4212e;--card:#16181c}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5;min-height:100vh}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}

/* Layout */
.container{max-width:700px;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--border);padding:24px 0}
.profile-header{text-align:center}
.avatar-placeholder{width:80px;height:80px;border-radius:50%;background:var(--accent);display:inline-flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;margin-bottom:12px}
.profile-name{font-size:24px;font-weight:700}
.profile-handle{color:var(--text2);font-size:15px}
.profile-bio{margin:8px 0;font-size:15px;max-width:500px;display:inline-block}
.stats-row{display:flex;gap:20px;justify-content:center;margin-top:12px;flex-wrap:wrap}
.stat{text-align:center}
.stat-val{font-weight:700;font-size:18px}
.stat-label{color:var(--text2);font-size:13px}
.meta-row{display:flex;gap:16px;justify-content:center;margin-top:8px;color:var(--text2);font-size:13px;flex-wrap:wrap}
.export-badge{display:inline-block;margin-top:16px;background:var(--surface);border:1px solid var(--border);border-radius:9999px;padding:4px 14px;font-size:12px;color:var(--text2)}

/* Navigation */
nav{position:sticky;top:0;z-index:100;background:rgba(0,0,0,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0}
nav .container{display:flex;overflow-x:auto;gap:0}
.nav-btn{background:none;border:none;color:var(--text2);font-size:14px;font-weight:600;padding:14px 18px;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:color .15s}
.nav-btn:hover{color:var(--text);background:rgba(255,255,255,.03)}
.nav-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
.nav-count{font-size:12px;font-weight:400;color:var(--text2);margin-left:4px}

/* Search */
.search-bar{padding:12px 0}
.search-input{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9999px;padding:10px 18px;color:var(--text);font-size:14px;outline:none;transition:border-color .15s}
.search-input:focus{border-color:var(--accent)}
.search-input::placeholder{color:var(--text2)}

/* Sections */
.section{display:none;padding:16px 0 60px}
.section.active{display:block}

/* Tweet card */
.tweet-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:12px;transition:background .15s}
.tweet-card:hover{background:#1e2024}
.tweet-author{font-weight:700;font-size:15px}
.tweet-handle{color:var(--text2);font-size:13px;margin-left:4px}
.tweet-time{color:var(--text2);font-size:13px;float:right}
.tweet-text{margin:8px 0;font-size:15px;white-space:pre-wrap;word-break:break-word}
.tweet-metrics{display:flex;gap:20px;color:var(--text2);font-size:13px}
.tweet-metric{display:flex;align-items:center;gap:4px}
.tweet-link{display:inline-block;margin-top:6px;font-size:13px}

/* User card */
.user-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start;transition:background .15s}
.user-card:hover{background:#1e2024}
.user-avatar{width:44px;height:44px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0;color:var(--text2)}
.user-info{flex:1;min-width:0}
.user-name{font-weight:700;font-size:15px}
.user-handle{color:var(--text2);font-size:13px}
.user-bio{color:var(--text2);font-size:13px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.user-badge{color:var(--accent);margin-left:4px;font-size:12px}

/* Pagination */
.pagination{display:flex;justify-content:center;gap:8px;padding:20px 0}
.page-btn{background:var(--surface);border:1px solid var(--border);border-radius:9999px;padding:8px 16px;color:var(--text);font-size:14px;cursor:pointer;transition:all .15s}
.page-btn:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.page-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}
.page-btn:disabled{opacity:.4;cursor:default;background:var(--surface);border-color:var(--border);color:var(--text2)}
.page-info{color:var(--text2);font-size:13px;align-self:center}

/* Empty */
.empty{text-align:center;padding:40px 0;color:var(--text2);font-size:15px}

/* Footer */
footer{text-align:center;padding:20px;color:var(--text2);font-size:12px;border-top:1px solid var(--border)}

/* Scrollbar */
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}

/* Responsive */
@media(max-width:600px){
  .container{padding:0 10px}
  .nav-btn{padding:12px 12px;font-size:13px}
  .stats-row{gap:12px}
  .tweet-metrics{gap:12px}
}
</style>
</head>
<body>

<header>
  <div class="container">
    <div class="profile-header">
      <div class="avatar-placeholder">${(displayName[0] || '?').toUpperCase()}</div>
      <div class="profile-name">${esc(displayName)}</div>
      <div class="profile-handle">@${esc(handle)}</div>
      ${profile.bio ? `<div class="profile-bio">${esc(profile.bio)}</div>` : ''}
      <div class="stats-row">
        <div class="stat"><div class="stat-val">${fmt(tweets.length)}</div><div class="stat-label">Tweets</div></div>
        <div class="stat"><div class="stat-val">${fmt(followers.length)}</div><div class="stat-label">Followers</div></div>
        <div class="stat"><div class="stat-val">${fmt(following.length)}</div><div class="stat-label">Following</div></div>
        ${bookmarks.length ? `<div class="stat"><div class="stat-val">${fmt(bookmarks.length)}</div><div class="stat-label">Bookmarks</div></div>` : ''}
        ${likes.length ? `<div class="stat"><div class="stat-val">${fmt(likes.length)}</div><div class="stat-label">Likes</div></div>` : ''}
      </div>
      <div class="meta-row">
        ${profile.location ? `<span>📍 ${esc(profile.location)}</span>` : ''}
        ${profile.website ? `<span>🔗 ${esc(profile.website)}</span>` : ''}
        ${profile.joined ? `<span>📅 ${esc(profile.joined)}</span>` : ''}
      </div>
      <div class="export-badge">Exported via XActions · ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
</header>

<nav>
  <div class="container">
    <button class="nav-btn active" data-tab="tweets">Tweets<span class="nav-count">${fmt(tweets.length)}</span></button>
    <button class="nav-btn" data-tab="followers">Followers<span class="nav-count">${fmt(followers.length)}</span></button>
    <button class="nav-btn" data-tab="following">Following<span class="nav-count">${fmt(following.length)}</span></button>
    ${bookmarks.length ? `<button class="nav-btn" data-tab="bookmarks">Bookmarks<span class="nav-count">${fmt(bookmarks.length)}</span></button>` : ''}
    ${likes.length ? `<button class="nav-btn" data-tab="likes">Likes<span class="nav-count">${fmt(likes.length)}</span></button>` : ''}
  </div>
</nav>

<main class="container">
  <div class="search-bar">
    <input type="text" class="search-input" placeholder="Search archive..." id="searchInput">
  </div>

  <div class="section active" id="sec-tweets"></div>
  <div class="section" id="sec-followers"></div>
  <div class="section" id="sec-following"></div>
  <div class="section" id="sec-bookmarks"></div>
  <div class="section" id="sec-likes"></div>
</main>

<footer>
  <a href="https://github.com/nirholas/XActions" target="_blank">⚡ XActions</a> — Open-source X/Twitter toolkit · by <a href="https://x.com/nichxbt" target="_blank">@nichxbt</a>
</footer>

<script>
(function(){
  // Embedded data
  const DATA={
    tweets:${safeJSON(tweets)},
    followers:${safeJSON(followers)},
    following:${safeJSON(following)},
    bookmarks:${safeJSON(bookmarks)},
    likes:${safeJSON(likes)}
  };

  const PAGE_SIZE=25;
  const state={tab:'tweets',page:0,query:'',filtered:{}};

  // Utils
  const $=s=>document.querySelector(s);
  const $$=s=>document.querySelectorAll(s);
  const esc=s=>{const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;};
  const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n);

  // Filter data by search query
  function filter(){
    const q=state.query.toLowerCase();
    for(const key of Object.keys(DATA)){
      if(!q){state.filtered[key]=DATA[key];continue;}
      state.filtered[key]=DATA[key].filter(item=>{
        const searchable=[item.text,item.name,item.username,item.handle,item.bio,item.author].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }
  }

  // Render tweet card
  function tweetHTML(t){
    return '<div class="tweet-card">'+
      '<span class="tweet-author">'+(esc(t.author)||'@${esc(handle)}')+'</span>'+
      (t.timestamp?'<span class="tweet-time">'+esc(t.timestamp)+'</span>':'')+
      '<div class="tweet-text">'+esc(t.text)+'</div>'+
      '<div class="tweet-metrics">'+
        (t.likes!=null?'<span class="tweet-metric">❤️ '+fmt(t.likes)+'</span>':'')+
        (t.retweets!=null?'<span class="tweet-metric">🔁 '+fmt(t.retweets)+'</span>':'')+
        (t.replies!=null?'<span class="tweet-metric">💬 '+fmt(t.replies)+'</span>':'')+
        (t.views!=null?'<span class="tweet-metric">👁️ '+fmt(t.views)+'</span>':'')+
      '</div>'+
      (t.url?'<a class="tweet-link" href="'+esc(t.url)+'" target="_blank" rel="noopener">View on X ↗</a>':
        (t.link?'<a class="tweet-link" href="'+esc(t.link)+'" target="_blank" rel="noopener">View on X ↗</a>':''))+
    '</div>';
  }

  // Render user card
  function userHTML(u){
    const name=u.name||u.username||u.handle||'Unknown';
    const handle=u.username||u.handle||'unknown';
    return '<div class="user-card">'+
      '<div class="user-avatar">'+name[0].toUpperCase()+'</div>'+
      '<div class="user-info">'+
        '<span class="user-name">'+esc(name)+'</span>'+
        (u.verified?'<span class="user-badge">✓</span>':'')+
        '<div class="user-handle">@'+esc(handle)+'</div>'+
        (u.bio?'<div class="user-bio">'+esc(u.bio)+'</div>':'')+
      '</div>'+
    '</div>';
  }

  // Pagination controls
  function paginationHTML(total){
    const pages=Math.ceil(total/PAGE_SIZE);
    if(pages<=1)return '';
    let h='<div class="pagination">';
    h+='<button class="page-btn" data-p="prev" '+(state.page===0?'disabled':'')+'>← Prev</button>';
    const start=Math.max(0,state.page-2);
    const end=Math.min(pages,start+5);
    for(let i=start;i<end;i++){
      h+='<button class="page-btn'+(i===state.page?' active':'')+'" data-p="'+i+'">'+(i+1)+'</button>';
    }
    h+='<span class="page-info">'+(state.page+1)+'/'+pages+'</span>';
    h+='<button class="page-btn" data-p="next" '+(state.page>=pages-1?'disabled':'')+'>Next →</button>';
    h+='</div>';
    return h;
  }

  // Render current tab
  function render(){
    filter();
    const items=state.filtered[state.tab]||[];
    const sec=$('#sec-'+state.tab);
    if(!sec)return;
    if(items.length===0){
      sec.innerHTML='<div class="empty">No '+(state.query?'matching ':'')+state.tab+' found</div>';
      return;
    }

    const start=state.page*PAGE_SIZE;
    const slice=items.slice(start,start+PAGE_SIZE);
    const isUser=state.tab==='followers'||state.tab==='following';
    let html='';
    for(const item of slice){
      html+=isUser?userHTML(item):tweetHTML(item);
    }
    html+=paginationHTML(items.length);
    sec.innerHTML=html;

    // Bind pagination
    sec.querySelectorAll('.page-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const p=btn.dataset.p;
        const pages=Math.ceil(items.length/PAGE_SIZE);
        if(p==='prev')state.page=Math.max(0,state.page-1);
        else if(p==='next')state.page=Math.min(pages-1,state.page+1);
        else state.page=parseInt(p);
        render();
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });
  }

  // Tab switching
  $$('.nav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $$('.section').forEach(s=>s.classList.remove('active'));
      state.tab=btn.dataset.tab;
      state.page=0;
      $('#sec-'+state.tab).classList.add('active');
      render();
    });
  });

  // Search
  let searchTimer;
  $('#searchInput').addEventListener('input',(e)=>{
    clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>{
      state.query=e.target.value.trim();
      state.page=0;
      render();
    },200);
  });

  // Initial render
  render();
})();
</script>
</body>
</html>`;
}

// Helpers used in template literal
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

export default generateArchiveHTML;
