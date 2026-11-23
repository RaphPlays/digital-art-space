const $ = (selector) => document.querySelector(selector);
const workspace = $('#admin-workspace');
const accessMessage = $('#access-message');
const identity = $('#admin-identity');
let state = { artworks: [], artists: [], applications: [] };
let blobClientPromise;

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function showAccessMessage(message) {
  accessMessage.hidden = false;
  accessMessage.textContent = message;
}

function escapeFileName(name) {
  const cleaned = String(name || 'image').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
  return cleaned || 'image';
}

async function uploadImage(kind) {
  const input = kind === 'artwork' ? $('#artwork-image-file') : $('#artist-image-file');
  const urlField = document.querySelector(`#${kind}-form [name="${kind === 'artwork' ? 'imageUrl' : 'portraitUrl'}"]`);
  const message = $(`#${kind}-message`);
  const file = input.files && input.files[0];
  if (!file) throw new Error('Choose an image file first.');
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (!allowed.includes(file.type)) throw new Error('Choose a JPEG, PNG, WebP, or AVIF image.');
  if (file.size > 8 * 1024 * 1024) throw new Error('That image is larger than 8 MB.');

  if (!blobClientPromise) {
    blobClientPromise = import('https://esm.sh/@vercel/blob@2.9.0/client');
  }
  const client = await blobClientPromise;
  const pathname = `digital-art-space/${kind === 'artwork' ? 'artworks' : 'artists'}/${Date.now()}-${escapeFileName(file.name)}`;
  const result = await client.upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/upload',
    multipart: file.size > 5 * 1024 * 1024
  });
  urlField.value = result.url;
  input.value = '';
  message.classList.remove('is-error');
  message.textContent = 'Image uploaded. Save the form to attach it to the record.';
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function actionButton(label, className, handler) {
  const button = element('button', `admin-action ${className || ''}`, label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function makeRecord(title, subtitle, actions) {
  const row = element('article', 'admin-record');
  const main = element('div', 'admin-record-main');
  main.append(element('strong', '', title), element('small', '', subtitle));
  const buttons = element('div', 'admin-record-actions');
  actions.forEach((action) => buttons.append(action));
  row.append(main, buttons);
  return row;
}

function clearForm(kind) {
  const form = $(`#${kind}-form`);
  form.reset();
  form.elements.id.value = '';
  if (kind === 'artwork') {
    $('#artwork-form-title').textContent = 'Add an artwork';
    form.elements.sortOrder.value = '100';
    form.elements.heroOrder.value = '';
  } else {
    $('#artist-form-title').textContent = 'Add an artist profile';
    form.elements.sortOrder.value = '100';
  }
  $(`#${kind}-message`).textContent = '';
  $(`#${kind}-message`).classList.remove('is-error');
}

function fillForm(kind, record) {
  const form = $(`#${kind}-form`);
  clearForm(kind);
  Object.entries(record).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value === null || value === undefined ? '' : String(value);
  });
  if (kind === 'artwork') $('#artwork-form-title').textContent = 'Edit artwork';
  else $('#artist-form-title').textContent = 'Edit artist profile';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderStats() {
  $('#stat-artworks').textContent = String(state.artworks.length);
  $('#stat-artists').textContent = String(state.artists.length);
  $('#stat-applications').textContent = String(state.applications.length);
}

function renderArtistOptions() {
  const select = $('#artwork-artist');
  const previous = select.value;
  select.replaceChildren();
  if (!state.artists.length) {
    const option = element('option', '', 'Create an artist profile first');
    option.value = '';
    select.append(option);
    return;
  }
  state.artists.forEach((artist) => {
    const option = element('option', '', `${artist.name} (${artist.slug})`);
    option.value = artist.slug;
    select.append(option);
  });
  if (state.artists.some((artist) => artist.slug === previous)) select.value = previous;
}

function renderApplications() {
  const list = $('#application-list');
  list.replaceChildren();
  if (!state.applications.length) {
    list.append(element('p', 'admin-empty', 'No pending artist applications.'));
    return;
  }
  const availableProfiles = state.artists.filter((artist) => !artist.ownerUserId);
  state.applications.forEach((app) => {
    const select = element('select', 'admin-app-select');
    select.setAttribute('aria-label', `Artist profile to link to ${app.displayName}`);
    const placeholder = element('option', '', availableProfiles.length ? 'Choose a profile to link' : 'Create an unassigned profile first');
    placeholder.value = '';
    select.append(placeholder);
    availableProfiles.forEach((artist) => {
      const option = element('option', '', `${artist.name} (${artist.slug})`);
      option.value = String(artist.id);
      select.append(option);
    });
    const approve = actionButton('Approve & link', 'admin-action--approve', () => decideApplication(app.id, 'approve', select.value));
    approve.disabled = availableProfiles.length === 0;
    select.addEventListener('change', () => { approve.disabled = !select.value; });
    const row = makeRecord(
      app.displayName,
      `${app.email} · Applied ${app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'date unavailable'}`,
      [select, approve, actionButton('Reject', 'admin-action--danger', () => decideApplication(app.id, 'reject'))]
    );
    const main = row.querySelector('.admin-record-main');
    if (app.artistBio) main.append(element('p', 'admin-application-detail', `Artist bio: ${app.artistBio}`));
    if (app.statement) main.append(element('p', 'admin-application-detail', `Application: ${app.statement}`));
    if (app.portfolioUrl) {
      const link = element('a', 'admin-application-link', 'Open portfolio ↗');
      link.href = app.portfolioUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      main.append(link);
    }
    list.append(row);
  });
}

function renderArtworks() {
  const list = $('#artwork-list');
  list.replaceChildren();
  if (!state.artworks.length) {
    list.append(element('p', 'admin-empty', 'No artworks in the database yet.'));
    return;
  }
  state.artworks.forEach((work) => {
    const feature = work.heroOrder ? ` · Hero ${work.heroOrder}` : '';
    list.append(makeRecord(
      work.cardTitle,
      `${work.artistSlug} · ${work.category} · ${work.slug}${feature}`,
      [
        actionButton('Edit', '', () => fillForm('artwork', work)),
        actionButton('Delete', 'admin-action--danger', () => deleteArtwork(work))
      ]
    ));
  });
}

function renderArtists() {
  const list = $('#artist-list');
  list.replaceChildren();
  if (!state.artists.length) {
    list.append(element('p', 'admin-empty', 'No artist profiles in the database yet.'));
    return;
  }
  state.artists.forEach((artist) => {
    const count = state.artworks.filter((work) => work.artistSlug === artist.slug).length;
    const owner = artist.ownerName ? ` · Linked account: ${artist.ownerName}` : ' · Unassigned';
    const actions = [actionButton('Edit', '', () => fillForm('artist', artist))];
    if (artist.ownerUserId) actions.push(actionButton('Unlink account', 'admin-action--danger', () => unlinkArtist(artist)));
    const remove = actionButton('Delete', 'admin-action--danger', () => deleteArtist(artist));
    remove.disabled = Boolean(artist.ownerUserId) || count > 0;
    remove.title = artist.ownerUserId ? 'Unlink the account first' : (count > 0 ? 'Reassign or delete the linked artworks first' : 'Delete artist profile');
    actions.push(remove);
    list.append(makeRecord(
      artist.name,
      `${artist.roleLabel} · ${artist.slug} · ${count} artwork(s)${owner}`,
      actions
    ));
  });
}

function renderAll() {
  renderStats();
  renderArtistOptions();
  renderApplications();
  renderArtworks();
  renderArtists();
}

async function loadData() {
  const [artworkData, artistData] = await Promise.all([
    request('/api/admin/artworks'),
    request('/api/admin/artists')
  ]);
  state.artworks = artworkData.artworks || [];
  state.artists = artistData.artists || [];
  state.applications = artistData.applications || [];
  renderAll();
}

async function decideApplication(userId, decision, artistId) {
  const label = decision === 'approve' ? 'approve this artist application' : 'reject this artist application';
  if (!window.confirm(`Are you sure you want to ${label}?`)) return;
  try {
    await request('/api/admin/applications', { method: 'PATCH', body: JSON.stringify({ userId, decision, artistId: decision === 'approve' ? Number(artistId) : null }) });
    await loadData();
    showAccessMessage(decision === 'approve' ? 'Application approved. This account is now a verified artist.' : 'Application rejected.');
  } catch (error) { showAccessMessage(error.message); }
}

async function deleteArtwork(work) {
  if (!window.confirm(`Delete “${work.cardTitle}” from the gallery? The uploaded image file will remain in Blob storage.`)) return;
  try {
    await request('/api/admin/artworks', { method: 'DELETE', body: JSON.stringify({ id: work.id }) });
    await loadData();
    showAccessMessage('Artwork deleted from the database. Its image file was left in storage.');
  } catch (error) { showAccessMessage(error.message); }
}

async function unlinkArtist(artist) {
  if (!window.confirm(`Unlink ${artist.ownerName} from “${artist.name}”? Their account will return to Viewer status.`)) return;
  try {
    await request('/api/admin/artist-link', { method: 'PATCH', body: JSON.stringify({ artistId: artist.id }) });
    await loadData();
    showAccessMessage('Artist account unlinked. The account is now a viewer.');
  } catch (error) { showAccessMessage(error.message); }
}

async function deleteArtist(artist) {
  if (!window.confirm(`Delete the profile “${artist.name}”? Profiles with linked artworks cannot be deleted.`)) return;
  try {
    await request('/api/admin/artists', { method: 'DELETE', body: JSON.stringify({ id: artist.id }) });
    await loadData();
    showAccessMessage('Artist profile deleted.');
  } catch (error) { showAccessMessage(error.message); }
}

function formData(form, keys) {
  const data = {};
  keys.forEach((key) => {
    const field = form.elements[key];
    if (!field) return;
    data[key] = field.type === 'checkbox' ? field.checked : field.value.trim();
  });
  return data;
}

$('#artwork-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $('#artwork-message');
  const id = form.elements.id.value;
  const keys = ['slug', 'artistSlug', 'cardTitle', 'dialogTitle', 'meta', 'description', 'category', 'orientation', 'wide', 'imageUrl', 'imageAlt', 'heroOrder', 'sortOrder'];
  const body = formData(form, keys);
  if (body.heroOrder === '') body.heroOrder = null;
  message.classList.remove('is-error');
  message.textContent = 'Saving…';
  try {
    await request('/api/admin/artworks', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(id ? { id: Number(id), ...body } : body) });
    clearForm('artwork');
    await loadData();
    message.textContent = 'Artwork saved.';
  } catch (error) {
    message.classList.add('is-error');
    message.textContent = error.message;
  }
});

$('#artist-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $('#artist-message');
  const id = form.elements.id.value;
  const body = formData(form, ['slug', 'name', 'roleLabel', 'bio', 'portraitUrl', 'portraitAlt', 'sortOrder']);
  message.classList.remove('is-error');
  message.textContent = 'Saving…';
  try {
    await request('/api/admin/artists', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(id ? { id: Number(id), ...body } : body) });
    clearForm('artist');
    await loadData();
    message.textContent = 'Artist profile saved.';
  } catch (error) {
    message.classList.add('is-error');
    message.textContent = error.message;
  }
});

document.querySelectorAll('[data-reset]').forEach((button) => {
  button.addEventListener('click', () => clearForm(button.dataset.reset));
});

document.querySelectorAll('[data-upload]').forEach((button) => {
  button.addEventListener('click', async () => {
    const kind = button.dataset.upload;
    const message = $(`#${kind}-message`);
    button.disabled = true;
    message.classList.remove('is-error');
    message.textContent = 'Uploading image…';
    try { await uploadImage(kind); }
    catch (error) { message.classList.add('is-error'); message.textContent = error.message; }
    finally { button.disabled = false; }
  });
});

async function initialise() {
  accessMessage.hidden = true;
  accessMessage.textContent = '';
  workspace.hidden = true;
  try {
    const session = await request('/api/me');
    if (!session.user) {
      identity.textContent = 'You are not signed in.';
      showAccessMessage('Sign in with the administrator account to use this page. The sign-in button is in the navigation bar.');
      return;
    }
    if (session.user.role !== 'admin') {
      identity.textContent = `Signed in as ${session.user.displayName} (${session.user.role}).`;
      showAccessMessage('This page is for administrators only. Your account does not have administrator access.');
      return;
    }
    identity.textContent = `Signed in as ${session.user.displayName} · Administrator`;
    await loadData();
    workspace.hidden = false;
  } catch (error) {
    identity.textContent = 'Could not verify administrator access.';
    showAccessMessage(error.message);
  }
}

document.addEventListener('auth:change', (event) => {
  const user = event.detail && event.detail.user;
  if (user && user.role === 'admin') {
    initialise();
  } else if (user) {
    workspace.hidden = true;
    identity.textContent = `Signed in as ${user.displayName} (${user.role}).`;
    showAccessMessage('This page is for administrators only. Your account does not have administrator access.');
  } else {
    workspace.hidden = true;
    identity.textContent = 'You are not signed in.';
    showAccessMessage('Sign in with the administrator account to use this page. The sign-in button is in the navigation bar.');
  }
});

initialise();