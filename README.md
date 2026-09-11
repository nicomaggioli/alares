# Alares website

Static HTML and CSS for Alares Architects & Engineers. This site has no package installation or build step. Serve this directory with a local HTTP server to preview it. Keep the existing custom domain and hosting configuration when releasing changes.

## Validation

Run `python3 tests/check_site.py` to check local links, fragments, image references, dimensions and structured data. Run `node --test tests/contact.test.cjs` to check the contact form's confirmed success, rejection, timeout, attachment and duplicate-submission behavior. The form tests use mocks and do not contact Web3Forms or send email.

## Shared behavior

`styles.css` provides the site theme. `assets/site.js` enhances navigation and the homepage inquiry form. Navigation remains available without JavaScript. The homepage photograph selector uses native radio controls and does not advance automatically.

Page images include responsive WebP sources and JPEG fallbacks. Keep both formats. `assets/media/sources.json` records the URLs of the pre-existing external images copied into this site. Social-preview images and metadata have been preserved.

## Contact form release check

The inquiry form retains its existing Web3Forms endpoint and public access key. Confirm the destination mailbox and run a real delivery test before release. Attachments require a paid Web3Forms plan; the current basic uploader accepts one file up to 5 MB. Text-only submissions omit the empty attachment field. If the account has no paid upload support, disable the attachment field before release. To support larger or multiple attachments, use Web3Forms' documented advanced uploader after confirming the account supports it.

The Careers form opens a visitor's email client, as its button and helper text explain. It does not submit applications to a server.
