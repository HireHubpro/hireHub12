// 1. Initialize Supabase Connection Client
const SUPABASE_URL = 'https://pviijtxomwdpsvamqpav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2aWlqdHhvbXdkcHN2YW1xcGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTU1NzYsImV4cCI6MjA5NDU5MTU3Nn0.BXq_-rxuu6Uu5J-D4Bmf9ycTOI9IVzFNmmI_wRfcUX8';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// 2. Check Authentication Session State
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error || !session) {
            console.log("No active session found, redirecting to login...");
            window.location.href = 'index.html';
            return null;
        }
        currentUser = session.user;
        return session.user;
    } catch (err) {
        console.error("Auth check failed:", err);
        window.location.href = 'index.html';
        return null;
    }
}

// 2b. Fetch Database Profile Details
async function fetchUserProfile(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return profile;
    } catch (err) {
        console.error("Error pulling profile info:", err.message);
        return null;
    }
}

// 2c. Save Profile Updates to Supabase
async function updateProfileColumn(columnName, value) {
    if (!currentUser) return;
    try {
        const updateData = {};
        updateData[columnName] = value;
        const { error } = await supabaseClient
            .from('profiles')
            .update(updateData)
            .eq('id', currentUser.id);
        if (error) throw error;
        return true;
    } catch (err) {
        alert("Error saving update: " + err.message);
        return false;
    }
}

// 3. Load and Display Feed Posts Elements (With Likes, Comments & Dynamic Images)
async function loadFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return; 

    console.log("Fetching posts from database...");
    const { data: posts, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            profiles (display_name, avatar_url, role),
            likes (user_id),
            comments (
                id, content, created_at,
                profiles (display_name, avatar_url)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error pulling posts:", error.message);
        feedContainer.innerHTML = '<p style="padding: 2rem; text-align: center; color: red;">Error loading posts.</p>';
        return;
    }

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = '<p style="padding: 2rem; text-align: center; color: gray;">No posts yet. Be the first to post!</p>';
    } else {
        feedContainer.innerHTML = posts.map(post => {
            const authorName = post.profiles?.display_name || 'Anonymous User';
            const authorRole = post.profiles?.role === 'hire' ? 'Hirer / Recruiter' : 'Applicant';
            
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=f0f7ff&color=0a66c2&bold=true`;
            const avatarSrc = post.profiles?.avatar_url || fallbackAvatar;

            // Conditional check: Render an image tag if an attachment URL exists inside the row
            const postImageHtml = post.image_url 
                ? `<div style="padding: 0 1rem 0 4rem; margin-top: 0.5rem;"><img src="${post.image_url}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; border: 1px solid #f0f2f5;"></div>` 
                : '';

            const likeCount = post.likes ? post.likes.length : 0;
            const hasLiked = post.likes ? post.likes.some(l => l.user_id === currentUser.id) : false;
            const commentCount = post.comments ? post.comments.length : 0;

            const commentsHtml = post.comments ? post.comments.map(c => {
                const cName = c.profiles?.display_name || 'User';
                const cAvatar = c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=f8fafc&color=0a66c2`;
                return `
                    <div class="comment-box">
                        <img src="${cAvatar}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">
                        <div>
                            <strong>${cName}:</strong> <span>${c.content}</span>
                        </div>
                    </div>
                `;
            }).join('') : '';

            return `
                <div class="post" id="post-${post.id}" style="border-bottom: 1px solid #eef0f3; padding: 1.5rem 0;">
                    <div class="post-meta" style="display: flex; align-items: center; justify-content: flex-start; width: 100%; gap: 1rem; margin-bottom: 0.75rem;">
                        <img src="${avatarSrc}" class="avatar-sm" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1px solid #eef0f3;">
                        <div style="display: flex; flex-direction: column; text-align: left;">
                            <h4 style="margin: 0; font-size: 1rem; color: #111;">${authorName}</h4>
                            <p style="margin: 0; font-size: 0.85rem; color: #666;">${authorRole}</p>
                            <p style="margin: 0; font-size: 0.75rem; color: #999;">${new Date(post.created_at).toLocaleDateString()} • <i class="fa-solid fa-earth-americas"></i></p>
                        </div>
                    </div>
                    <div class="post-content" style="text-align: left; padding-left: 4rem;">
                        <p style="margin: 0; font-size: 0.95rem; color: #111; line-height: 1.5;">${post.content}</p>
                    </div>
                    ${postImageHtml}

                    <div class="post-actions-bar">
                        <button class="action-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike(${post.id}, ${hasLiked})">
                            <i class="${hasLiked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i> <span>${likeCount} Likes</span>
                        </button>
                        <button class="action-btn" onclick="toggleCommentsView(${post.id})">
                            <i class="fa-regular fa-comment"></i> <span>${commentCount} Comments</span>
                        </button>
                    </div>

                    <div class="comments-section" id="comments-section-${post.id}">
                        <div class="comments-list" id="comments-list-${post.id}">
                            ${commentsHtml}
                        </div>
                        <div class="comment-input-area">
                            <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment...">
                            <button class="comment-submit-btn" onclick="submitComment(${post.id})">Send</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Window Operations Actions for Likes/Comments
window.toggleLike = async (postId, alreadyLiked) => {
    if (!currentUser) return;
    if (alreadyLiked) {
        await supabaseClient.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
    } else {
        await supabaseClient.from('likes').insert([{ post_id: postId, user_id: currentUser.id }]);
    }
    loadFeed();
};

window.toggleCommentsView = (postId) => {
    const el = document.getElementById(`comments-section-${postId}`);
    if(el) el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'flex' : 'none';
};

window.submitComment = async (postId) => {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input || !input.value.trim()) return;

    const { error } = await supabaseClient.from('comments').insert([
        { post_id: postId, user_id: currentUser.id, content: input.value.trim() }
    ]);

    if (!error) { input.value = ''; loadFeed(); }
};

// 4. Handle Post Creation Actions (Storage Engine Integration)
function setupCreatePost() {
    const postBtn = document.getElementById('create-post-btn');
    const postInput = document.getElementById('new-post-input');
    const imageInput = document.getElementById('post-image-input');
    const imagePreview = document.getElementById('post-image-preview');

    if (!postInput || !postBtn) return;

    // Listens for a chosen file to render a dynamic display preview
    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (file) {
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.style.display = 'block';
            }
        });
    }

    const handlePostSubmission = async () => {
        const content = postInput.value.trim();
        if (!content) {
            alert("Please type something before posting!");
            return;
        }

        postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
        postBtn.disabled = true;
        let uploadedImageUrl = null;

        // Process file injection streaming if a file is uploaded
        if (imageInput && imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const fileExtension = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

            const { data, error: uploadError } = await supabaseClient.storage
                .from('post-images')
                .upload(fileName, file);

            if (!uploadError) {
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                uploadedImageUrl = publicUrl;
            } else {
                console.error("Storage upload failed:", uploadError.message);
            }
        }

        const { error } = await supabaseClient.from('posts').insert([
            { user_id: currentUser.id, content: content, image_url: uploadedImageUrl }
        ]);

        if (error) {
            alert("Error creating post: " + error.message);
            postBtn.innerHTML = 'Share Post';
            postBtn.disabled = false;
        } else {
            postInput.value = ''; 
            window.location.href = 'feed.html';
        }
    };

    const freshBtn = postBtn.cloneNode(true);
    postBtn.parentNode.replaceChild(freshBtn, postBtn);
    freshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handlePostSubmission();
    });
}

// Helper setup to handle profile inline edits
function setupEditableSection(editBtnId, modeViewId, modeEditId, inputId, saveBtnId, columnName, profileFieldId) {
    const editBtn = document.getElementById(editBtnId);
    const viewMode = document.getElementById(modeViewId);
    const editMode = document.getElementById(modeEditId);
    const input = document.getElementById(inputId);
    const saveBtn = document.getElementById(saveBtnId);

    if (!editBtn || !saveBtn) return;

    editBtn.addEventListener('click', () => {
        const isEditing = editMode.style.display === 'flex' || editMode.style.display === 'block';
        if (isEditing) {
            editMode.style.display = 'none';
            if(viewMode) viewMode.style.display = 'block';
            editBtn.textContent = 'Edit';
        } else {
            editMode.style.display = 'flex';
            if(viewMode) viewMode.style.display = 'none';
            editBtn.textContent = 'Cancel';
            input.value = document.getElementById(profileFieldId)?.textContent || '';
        }
    });

    saveBtn.addEventListener('click', async () => {
        const newValue = input.value.trim();
        saveBtn.disabled = true;
        const success = await updateProfileColumn(columnName, newValue);
        if (success) {
            if (document.getElementById(profileFieldId)) document.getElementById(profileFieldId).textContent = newValue;
            editMode.style.display = 'none';
            if(viewMode) viewMode.style.display = 'block';
            editBtn.textContent = 'Edit';
            if (columnName === 'display_name') window.location.reload();
        }
        saveBtn.disabled = false;
    });
}

// 5. Initialize Page Sequence Lifecycle Events
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing page scripts...");
    const user = await checkAuth();
    
    if (user) {
        await loadFeed();
        setupCreatePost();

        const profile = await fetchUserProfile(user.id);
        if (profile) {
            if (document.getElementById('profile-display-name')) document.getElementById('profile-display-name').textContent = profile.display_name;
            if (document.getElementById('profile-headline')) document.getElementById('profile-headline').textContent = profile.headline || 'Computer Science Student & Full-Stack Developer';
            if (document.getElementById('profile-location')) document.getElementById('profile-location').textContent = profile.location || 'Bengaluru, India';
            if (document.getElementById('profile-about')) document.getElementById('profile-about').textContent = profile.bio || 'Add a bio about yourself...';
            if (document.getElementById('profile-resume-name')) document.getElementById('profile-resume-name').textContent = profile.resume_url || 'Adithya_Shenoy_Resume.pdf';
            if (document.getElementById('profile-experience')) document.getElementById('profile-experience').textContent = profile.experience || 'No experience added yet.';
            if (document.getElementById('profile-education')) document.getElementById('profile-education').textContent = profile.education || 'No education details added yet.';

            const roleEl = document.getElementById('profile-role-badge');
            if (roleEl) {
                roleEl.textContent = profile.role === 'hire' ? 'Hirer / Recruiter' : 'Applicant';
                roleEl.style.backgroundColor = profile.role === 'hire' ? '#dcfce7' : '#e0f2fe';
                roleEl.style.color = profile.role === 'hire' ? '#15803d' : '#0369a1';
            }

            const authorName = profile.display_name || 'User';
            const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=f0f7ff&color=0a66c2&bold=true`;
            document.querySelectorAll('#current-user-avatar').forEach(img => { img.src = profile.avatar_url || fallbackAvatarUrl; });

            const badgeAvatar = document.getElementById('profile-avatar-badge');
            if (badgeAvatar) {
                if (profile.avatar_url) {
                    badgeAvatar.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
                } else if (profile.display_name) {
                    const initials = profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase();
                    badgeAvatar.textContent = initials.substring(0, 2);
                }
            }

            const avatarInput = document.getElementById('avatar-file-input');
            if (avatarInput) {
                avatarInput.addEventListener('change', async () => {
                    const file = avatarInput.files[0];
                    if (!file) return;
                    badgeAvatar.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;"></i>';
                    const fileExtension = file.name.split('.').pop();
                    const fileName = `${user.id}-${Date.now()}.${fileExtension}`;

                    const { data, error: uploadError } = await supabaseClient.storage
                        .from('avatars')
                        .upload(fileName, file, { cacheControl: '3600', upsert: true });

                    if (uploadError) { window.location.reload(); return; }

                    const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
                    if (await updateProfileColumn('avatar_url', publicUrl)) window.location.reload();
                });
            }

            setupEditableSection('edit-about-btn', 'profile-about', 'about-edit-mode', 'edit-about-input', 'save-about-btn', 'bio', 'profile-about');
            setupEditableSection('edit-resume-btn', 'profile-resume-name', 'resume-edit-mode', 'edit-resume-input', 'save-resume-btn', 'resume-url', 'profile-resume-name');
            setupEditableSection('edit-exp-btn', 'profile-experience', 'exp-edit-mode', 'edit-exp-input', 'save-exp-btn', 'experience', 'profile-experience');
            setupEditableSection('edit-edu-btn', 'profile-education', 'edu-edit-mode', 'edit-edu-input', 'save-edu-btn', 'education', 'profile-education');

            const editIdBtn = document.getElementById('edit-identity-btn');
            if (editIdBtn) {
                editIdBtn.addEventListener('click', () => {
                    const em = document.getElementById('identity-edit-mode');
                    const vm = document.getElementById('identity-view-mode');
                    if (em.style.display === 'none') {
                        em.style.display = 'flex'; vm.style.display = 'none'; editIdBtn.textContent = 'Cancel';
                        document.getElementById('edit-name-input').value = document.getElementById('profile-display-name').textContent;
                        document.getElementById('edit-headline-input').value = document.getElementById('profile-headline').textContent;
                        document.getElementById('edit-location-input').value = document.getElementById('profile-location').textContent;
                    } else {
                        em.style.display = 'none'; vm.style.display = 'block'; editIdBtn.textContent = 'Edit';
                    }
                });

                document.getElementById('save-identity-btn').addEventListener('click', async () => {
                    await updateProfileColumn('display_name', document.getElementById('edit-name-input').value.trim());
                    await updateProfileColumn('headline', document.getElementById('edit-headline-input').value.trim());
                    await updateProfileColumn('location', document.getElementById('edit-location-input').value.trim());
                    window.location.reload();
                });
            }
        }
    }
});