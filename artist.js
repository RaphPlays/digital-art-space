const $ = (selector) => document.querySelector(selector);
const workspace = $('#artist-workspace');
const message = $('#artist-message');
const identity = $('#artist-identity');
let profile = null;
let artworks = [];
let blobClientPromise;

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin', ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
function showMessage(text) { message.hidden = false; message.textContent = text; }
function setFormMessage(selector, text, error) {
  const node = $(selector); node.textContent = text || ''; node.classList.toggle('is-error', Boolean(error));
}
function safeFileName(name) {
  return String(name || 'image').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'image';
}
async function uploadImage(kind) {
  const input = kind === 'portrait' ? $('#portrait-file') : $('#artwork-file');
  const field = kind === 'portrait' ? $('#profile-form [name="portraitUrl"]') : $('#artwork-form [name="imageUrl"]');
  const file = input.files && input.files[0];
  if (!file) throw new Error('Choose an image file first.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP, or AVIF image.');
  if (file.size > 8 * 1024 * 1024) throw new Error('That image is larger than 8 MB.');
  if (!blobClientPromise) blobClientPromise = import('https://esm.sh/@vercel/blob@2.9.0/client');
  const client = await blobClientPromise;
  if (!profile || !profile.id) throw new Error('Your artist profile has not loaded yet.');
  const folder = kind === 'portrait' ? 'artists' : 'artworks';
  const pathname = `digital-art-space/${folder}/artist-${profile.id}-${Date.now()}-${safeFileName(file.name)}`;
  const result = await client.upload(pathname, file, {
    access: 'public', handleUploadUrl: '/api/admin/upload', multipart: file.size > 5 * 1024 * 1024
  });
  field.value = result.url;
  input.value = '';
  setFormMessage(kind === 'portrait' ? '#profile-message' : '#artwork-message', 'Image uploaded. Save the form to attach it to your record.', false);
}
function formValues(form, keys) {
  const result = {};
  keys.forEach(key => {
    const field = form.elements[key];
    result[key] = field.type === 'checkbox' ? field.checked : field.value.trim();
  });
  return result;
}
function fillProfile() {
  const form = $('#profile-form');
  ['name', 'roleLabel', 'bio', 'portraitUrl', 'portraitAlt'].forEach(key => { form.elements[key].value = profile[key] || ''; });
}
function clearArtworkForm() {
  const form = $('#artwork-form'); form.reset(); form.elements.id.value = '';
  form.elements.sortOrder.value = '100'; $('#artwork-form-title').textContent = 'Add an artwork';
  setFormMessage('#artwork-message', '', false);
}
function fillArtwork(work) {
  const form = $('#artwork-form'); clearArtworkForm();
  Object.entries(work).forEach(([key, value]) => {
    const field = form.elements[key]; if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value == null ? '' : String(value);
  });
  $('#artwork-form-title').textContent = 'Edit artwork';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function makeAction(label, danger, callback) {
  const button = document.createElement('button'); button.type = 'button';
  button.className = `artist-action${danger ? ' artist-action--danger' : ''}`;
  button.textContent = label; button.addEventListener('click', callback); return button;
}
function renderArtworks() {
  const list = $('#my-artworks'); list.replaceChildren();
  if (!artworks.length) { const empty = document.createElement('p'); empty.className = 'artist-muted'; empty.textContent = 'You have not added any artworks yet.'; list.append(empty); return; }
  artworks.forEach(work => {
    const card = document.createElement('article'); card.className = 'artist-record';
    const copy = document.createElement('div'); copy.className = 'artist-record-copy';
    const title = document.createElement('strong'); title.textContent = work.cardTitle;
    const detail = document.createElement('small'); detail.textContent = `${work.slug} · ${work.category} · ${work.orientation}`;
    copy.append(title, detail);
    const actions = document.createElement('div'); actions.className = 'artist-record-actions';
    actions.append(makeAction('Edit', false, () => fillArtwork(work)), makeAction('Delete', true, () => deleteArtwork(work)));
    card.append(copy, actions); list.append(card);
  });
}
async function loadData() {
  const [profileData, artworkData] = await Promise.all([request('/api/artist/profile'), request('/api/artist/artworks')]);
  profile = profileData.artist; artworks = artworkData.artworks || [];
  fillProfile(); renderArtworks();
  identity.textContent = `${profile.name} · Verified artist · @${profile.slug}`;
}
async function deleteArtwork(work) {
  if (!window.confirm(`Delete “${work.cardTitle}” from your collection? The uploaded image file will remain in storage.`)) return;
  try { await request('/api/artist/artworks', { method: 'DELETE', body: JSON.stringify({ id: work.id }) }); await loadData(); showMessage('Artwork deleted from your collection.'); }
  catch (error) { showMessage(error.message); }
}

$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true;
  setFormMessage('#profile-message', 'Saving profile…', false);
  try {
    await request('/api/artist/profile', { method: 'PATCH', body: JSON.stringify(formValues(event.currentTarget, ['name', 'roleLabel', 'bio', 'portraitUrl', 'portraitAlt'])) });
    await loadData(); setFormMessage('#profile-message', 'Profile saved.', false);
  } catch (error) { setFormMessage('#profile-message', error.message, true); }
  finally { button.disabled = false; }
});
$('#artwork-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); button.disabled = true;
  const id = form.elements.id.value;
  const body = formValues(form, ['slug', 'cardTitle', 'dialogTitle', 'meta', 'description', 'category', 'orientation', 'wide', 'imageUrl', 'imageAlt', 'sortOrder']);
  setFormMessage('#artwork-message', 'Saving artwork…', false);
  try {
    await request('/api/artist/artworks', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(id ? { id: Number(id), ...body } : body) });
    clearArtworkForm(); await loadData(); setFormMessage('#artwork-message', 'Artwork saved.', false);
  } catch (error) { setFormMessage('#artwork-message', error.message, true); }
  finally { button.disabled = false; }
});
$('.artist-reset').addEventListener('click', clearArtworkForm);
document.querySelectorAll('[data-upload]').forEach(button => button.addEventListener('click', async () => {
  const kind = button.dataset.upload; button.disabled = true;
  setFormMessage(kind === 'portrait' ? '#profile-message' : '#artwork-message', 'Uploading image…', false);
  try { await uploadImage(kind); }
  catch (error) { setFormMessage(kind === 'portrait' ? '#profile-message' : '#artwork-message', error.message, true); }
  finally { button.disabled = false; }
}));

async function initialise() {
  workspace.hidden = true; message.hidden = true;
  try {
    const session = await request('/api/me');
    if (!session.user) { identity.textContent = 'You are not signed in.'; showMessage('Sign in with your verified artist account to access Artist Studio.'); return; }
    if (session.user.role !== 'artist' || session.user.artistStatus !== 'verified') {
      identity.textContent = `Signed in as ${session.user.displayName} · ${session.user.artistStatus || session.user.role}`;
      showMessage('Artist Studio is available only to approved, verified artist accounts.'); return;
    }
    await loadData(); workspace.hidden = false;
  } catch (error) { identity.textContent = 'Could not verify artist access.'; showMessage(error.message); }
}
document.addEventListener('auth:change', event => {
  const user = event.detail && event.detail.user;
  if (user && user.role === 'artist' && user.artistStatus === 'verified') initialise();
  else { workspace.hidden = true; identity.textContent = user ? `Signed in as ${user.displayName}` : 'You are not signed in.'; showMessage(user ? 'Artist Studio requires a verified artist account.' : 'Sign in with your verified artist account to access Artist Studio.'); }
});
initialise();