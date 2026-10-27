# Security notes

- `.en/config.js` is loaded by the browser, so its contents are public even though the folder begins with a dot.
- The configured Supabase `sb_publishable_...` key is intended for client-side use. Keep database access, storage permissions, and administrative actions protected with correct Supabase RLS policies and server-side authorization.
- Never put a Supabase `service_role` key, private API token, SMTP password, or other secret in `index.html`, CSS, browser JavaScript, or any folder served by static hosting.
- If background-removal access needs a private credential or rate limiting, use a server-side proxy and set `MATTE_PROXY` to that proxy endpoint. Do not place the provider's private key in the browser.
- Review public repository history if a secret has ever been committed. Removing a key from the latest files does not remove it from Git history; rotate exposed secrets with their provider.
