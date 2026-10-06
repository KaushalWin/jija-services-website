(() => {
  const section = document.querySelector('#reviews');
  if (!section) return;
  const list = section.querySelector('#review-list');
  const summary = section.querySelector('#review-summary');
  const more = section.querySelector('#reviews-more');
  const form = section.querySelector('#review-form');
  const status = section.querySelector('#review-status');
  const open = section.querySelector('#write-review');
  let nextCursor = null; let widgetId = null; let token = ''; let submissionKey = crypto.randomUUID();
  let widgetLoading = null; let submitting = false;
  function showStatus(message, kind = 'form') { status.textContent = message; status.dataset.kind = kind; }
  const element = (tag, value, className) => { const node = document.createElement(tag); if (value !== undefined) node.textContent = value; if (className) node.className = className; return node; };
  async function api(url, options) {
    let response; let data;
    try { response = await fetch(url, options); } catch { throw new Error('Could not connect. Please try again later.'); }
    try { data = await response.json(); } catch { throw new Error('Reviews are temporarily unavailable. Please try again later.'); }
    if (!response.ok) throw new Error(data.error || 'Reviews are temporarily unavailable.');
    return data;
  }
  function render(review) {
    const card = element('article', undefined, 'review-card');
    const heading = element('div', undefined, 'review-card-heading');
    heading.append(element('h3', review.display_name));
    const stars = element('p', '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars), 'review-stars');
    stars.setAttribute('aria-label', `${review.stars} out of 5 stars`);
    const date = element('time', new Date(review.created_at * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }));
    date.dateTime = new Date(review.created_at * 1000).toISOString();
    heading.append(date); card.append(heading, stars, element('p', review.comment, 'review-comment')); list.append(card);
  }
  async function load(reset = false) {
    more.disabled = true;
    try {
      const query = !reset && nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : '';
      const data = await api('/api/reviews' + query);
      if (reset) list.replaceChildren();
      data.reviews.forEach(render); nextCursor = data.nextCursor;
      summary.textContent = data.summary.count ? `${data.summary.average.toFixed(1)} out of 5 · ${data.summary.count} customer ${data.summary.count === 1 ? 'review' : 'reviews'}` : 'No reviews yet. Share your experience with JIJA Services.';
      more.hidden = !nextCursor;
    } catch (error) { summary.textContent = error.message; more.hidden = true; }
    finally { more.disabled = false; }
  }
  function loadScript() {
    return new Promise((resolve, reject) => {
      if (window.turnstile) { resolve(); return; }
      const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true; script.onload = resolve; script.onerror = () => { script.remove(); reject(new Error('Verification could not load. Please try again.')); };
      document.head.append(script);
    });
  }
  async function prepareWidget() {
    const { sitekey } = await api('/api/reviews/config');
    await loadScript();
    widgetId = window.turnstile.render('#review-verification', {
      sitekey, action: 'review', callback: value => { token = value; if (status.dataset.kind === 'verification') showStatus(''); },
      'expired-callback': () => { token = ''; showStatus('Verification expired. Please verify again before submitting.', 'verification'); },
      'error-callback': () => { token = ''; showStatus('Verification is unavailable. Please try again.', 'verification'); }
    });
  }
  open.addEventListener('click', async () => {
    form.hidden = false; open.hidden = true; form.querySelector('[name="name"]').focus();
    showStatus('Loading verification…', 'verification');
    try { widgetLoading ||= prepareWidget(); await widgetLoading; status.textContent = ''; }
    catch (error) { widgetLoading = null; status.textContent = error.message; open.hidden = false; open.textContent = 'Retry verification'; }
  });
  form.querySelectorAll('[name="name"], [name="stars"], [name="comment"]').forEach(field => field.addEventListener('input', () => { submissionKey = crypto.randomUUID(); }));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    if (!token) { showStatus('Complete the verification before submitting.', 'verification'); return; }
    const data = new FormData(form);
    submitting = true; const fields = [...form.elements]; const disabled = fields.map(field => field.disabled);
    fields.forEach(field => { field.disabled = true; }); showStatus('Submitting your review…');
    try {
      const result = await api('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': submissionKey },
        body: JSON.stringify({ name: data.get('name'), stars: Number(data.get('stars')), comment: data.get('comment'), company: data.get('company'), turnstileToken: token }) });
      form.reset(); submissionKey = crypto.randomUUID(); showStatus(result.replayed ? 'Thank you. Your review was already received.' : 'Thank you. Your review has been published.');
      await load(true);
    } catch (error) { showStatus(error.message); }
    finally { token = ''; if (widgetId !== null) window.turnstile.reset(widgetId); fields.forEach((field, index) => { field.disabled = disabled[index]; }); submitting = false; }
  });
  more.addEventListener('click', () => load());
  load(true);
})();
