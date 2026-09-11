/* Shared, progressively enhanced navigation and inquiry handling. */
(() => {
  const header = document.querySelector('.head');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!header || !toggle || !nav) return;

  const mobile = window.matchMedia('(max-width: 880px)');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  header.classList.add('nav-ready');
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
  header.addEventListener('focusout', (event) => {
    if (!header.contains(event.relatedTarget)) setOpen(false);
  });
  mobile.addEventListener('change', () => setOpen(false));
})();

(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const success = document.getElementById('contact-success');
  const error = document.getElementById('contact-error');
  const button = form.querySelector('button[type="submit"]');
  const attachment = document.getElementById('contact-attachment');
  const defaultError = error.textContent;
  let sending = false;

  const showError = (message) => {
    error.textContent = message;
    error.hidden = false;
    error.focus();
  };

  document.getElementById('contact-another').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    document.getElementById('contact-name').focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    error.hidden = true;

    const files = attachment?.files;
    if (files?.length && (files.length > 1 || files[0].size > 5 * 1024 * 1024)) {
      showError('Please attach one file up to 5 MB, or send your inquiry without an attachment. We can arrange to receive larger files when we follow up.');
      return;
    }

    sending = true;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Sending inquiry…';
    form.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    try {
      const body = new FormData(form);
      // An empty file part can trigger paid-upload validation for a text-only inquiry.
      if (!files?.length) body.delete('attachment');
      const response = await fetch(form.action, {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error('Submission not confirmed');

      form.reset();
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (failure) {
      showError(failure.name === 'AbortError'
        ? 'The connection timed out, so we could not confirm your submission. Your details are still here. Please call 941.444.0477 if you need to confirm receipt before trying again.'
        : defaultError);
    } finally {
      window.clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      button.textContent = originalText;
      form.removeAttribute('aria-busy');
    }
  });
})();
