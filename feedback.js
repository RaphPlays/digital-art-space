(function () {
  var panel = document.querySelector('.feedback-panel');
  if (!panel) return;
  var form = document.getElementById('feedback-form');
  var list = document.getElementById('feedback-list');
  var summary = document.getElementById('feedback-summary');
  var message = document.getElementById('feedback-message');
  var activeSlug = '';
  var currentUser = null;

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function setMessage(text, error) {
    message.textContent = text;
    message.classList.toggle('is-error', Boolean(error));
  }
  function render(data) {
    list.replaceChildren();
    summary.textContent = data.ratingCount
      ? data.averageRating + ' / 5 · ' + data.ratingCount + ' rating(s)'
      : 'No approved ratings yet';
    if (!data.feedback.length) {
      list.append(node('p', 'feedback-muted', 'No approved comments yet. Be the first to share a thoughtful note.'));
      return;
    }
    data.feedback.forEach(function (item) {
      var card = node('article', 'feedback-item');
      var top = node('div', 'feedback-item-top');
      top.append(node('strong', '', item.displayName));
      if (item.rating) top.append(node('span', 'feedback-rating', '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating)));
      card.append(top);
      if (item.comment) card.append(node('p', '', item.comment));
      card.append(node('small', '', new Date(item.createdAt).toLocaleDateString()));
      list.append(card);
    });
  }
  function load(slug) {
    activeSlug = slug;
    list.replaceChildren(node('p', 'feedback-muted', 'Loading approved feedback…'));
    summary.textContent = 'Loading feedback…';
    fetch('/api/feedback/artwork?slug=' + encodeURIComponent(slug), { credentials: 'same-origin' })
      .then(function (res) { if (!res.ok) throw new Error('Could not load feedback.'); return res.json(); })
      .then(render)
      .catch(function () { list.replaceChildren(node('p', 'feedback-muted', 'Feedback is temporarily unavailable.')); summary.textContent = ''; });
    form.elements.rating.value = '';
    form.elements.comment.value = '';
    if (!currentUser) setMessage('Sign in to leave a rating or comment. New feedback appears after admin approval.');
    else setMessage('Your feedback will appear publicly after admin approval.');
  }
  document.addEventListener('artwork:opened', function (event) {
    if (event.detail && event.detail.slug) load(event.detail.slug);
  });
  document.addEventListener('auth:change', function (event) {
    currentUser = event.detail && event.detail.user || null;
    if (!currentUser) setMessage('Sign in to leave a rating or comment. New feedback appears after admin approval.');
    else setMessage('Your feedback will appear publicly after admin approval.');
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!currentUser) {
      setMessage('Please use the Sign in button in the site navigation first.', true);
      return;
    }
    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    fetch('/api/feedback/submit', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artworkSlug: activeSlug,
        rating: form.elements.rating.value || null,
        comment: form.elements.comment.value
      })
    }).then(function (res) {
      return res.json().then(function (data) { if (!res.ok) throw new Error(data.error || 'Could not submit feedback.'); return data; });
    }).then(function (data) {
      setMessage(data.message || 'Submitted for review.');
      form.elements.rating.value = '';
      form.elements.comment.value = '';
    }).catch(function (err) { setMessage(err.message, true); })
      .finally(function () { button.disabled = false; });
  });
})();
