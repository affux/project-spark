
Goal: Video tutorials (including direct .mp4 URLs from your storage) are not showing for users and also not showing in preview. Fix the root cause so the frontend can actually read the `video_tutorials` / `user_dashboard_video_url` rows from the backend.

What I found (root cause)
- Your frontend correctly supports direct video URLs (it will render a `<video>` tag when the URL ends with .mp4/.webm/.ogg/.mov).
- Your `platform_settings` table has Row Level Security with a “public can read whitelisted settings only” policy.
- That whitelist does NOT include:
  - `video_tutorials`
  - `user_dashboard_video_url`
- Because of that, non-admin users (and the preview when not logged in as admin) cannot read those rows at all. The UI falls back to “Tutorial video coming soon”, so it looks like the video “is not showing” even though the URL is stored correctly.

Evidence
- In `COMPLETE_DATABASE_SCHEMA.sql`, the policy at lines ~2231-2254 whitelists many keys but does not include `video_tutorials` or `user_dashboard_video_url`.
- A direct database read shows `video_tutorials` is stored and includes your MP4 URL, so the data exists but is being blocked for public/user reads.

Implementation approach
1) Update the platform settings RLS whitelist to allow reading these two keys:
   - Add `video_tutorials`
   - Add `user_dashboard_video_url`
   This keeps security tight (still whitelist-based) while enabling the specific user-facing content.
2) (Optional but recommended) Also add any other “Help center” public keys you expect users to see, if you use them elsewhere. For this task, we will only add the two keys above to minimize scope.
3) Verify in the browser:
   - Logged-out preview: the `platform_settings` request should now include and return `video_tutorials` and/or `user_dashboard_video_url`.
   - Logged-in normal user: User Help page should populate tutorials and play the MP4.
4) If the video still doesn’t play after the settings appear:
   - Check the network request for the MP4 file itself (status, content-type, CORS).
   - But the first fix is to unblock the settings row access (currently the MP4 isn’t even being reached by the UI in many cases).

Concrete backend change (SQL migration)
- We’ll drop and recreate the policy “Public can read whitelisted settings only” on `public.platform_settings`, adding the missing keys to the `key = ANY(ARRAY[...])` list.
- This is a safe change: it does not open up the table; it only expands the whitelist by two specific keys.

Files/code expected to change
- Database migration only (RLS policy update).
- No frontend logic changes should be necessary because your `usePublicSettings` + `UserHelp.tsx` already expects these keys.

Testing checklist (what you will verify after the fix)
- Open the user Help page:
  - Confirm tutorials list appears (titles/topics visible).
  - Click a tutorial and confirm the `<video>` element appears for the MP4 URL and plays.
- Open the same page in preview / logged out:
  - Confirm it no longer shows “Tutorial video coming soon” if tutorials exist.
- Verify on mobile width as well (video elements often behave differently with autoplay/inline).

Edge cases / notes
- If the `video_tutorials` JSON is malformed, your hook already safely falls back to `[]`, so it won’t crash.
- If the MP4 still fails after this, the next likely cause is storage access/CORS or an incorrect URL, but we must first make sure the app can actually read the tutorial settings.

Next step after you approve
- I will implement the migration to update the RLS policy whitelist to include `video_tutorials` and `user_dashboard_video_url`, then guide you through a quick end-to-end check to confirm videos render and play.
