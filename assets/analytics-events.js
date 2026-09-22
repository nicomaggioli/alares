/* Track inquiry intent without sending names, email addresses, or form contents. */
(function () {
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a');
    if (!link || typeof window.gtag !== 'function') return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('tel:')) {
      window.gtag('event', 'phone_click', { contact_location: 'sarasota' });
    } else if (href.startsWith('mailto:')) {
      window.gtag('event', 'email_click', {
        contact_type: href.includes('careers@') ? 'careers' : 'business'
      });
    } else if (href.includes('#contact')) {
      window.gtag('event', 'contact_click', { link_text: link.textContent.trim() });
    }
  });
  if (window.location.pathname === '/capabilities/') {
    window.addEventListener('beforeprint', function () {
      if (typeof window.gtag === 'function') window.gtag('event', 'capability_print');
    });
  }
})();
