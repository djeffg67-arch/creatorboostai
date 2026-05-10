# Avatar CDN Setup · jsDelivr

Goal: serve the 5 avatar MP4s + posters from edge-cached jsDelivr CDN
instead of from the deployed app pod.

The frontend already supports this — set ONE env var and you're done.

## Step 1 · Push the avatar assets to GitHub

The 10 files at:
```
/app/frontend/public/avatars/master/
├── master-intro-opt.mp4              (4.2 MB)
├── master-intro-poster.jpg
├── master-command-center-opt.mp4     (2.9 MB)
├── master-command-center-poster.jpg
├── master-security-opt.mp4           (2.9 MB)
├── master-security-poster.jpg
├── master-execution-layer-opt.mp4    (8.6 MB)
├── master-execution-layer-poster.jpg
├── master-industries-opt.mp4         (2.2 MB)
└── master-industries-poster.jpg
```

…must be in your **public** GitHub repo. Two options:

### Option A · Use Emergent's "Save to Github" feature (easiest)
Click the "Save to GitHub" button in the Emergent chat input. The whole
repo (including `frontend/public/avatars/master/`) is pushed. Done.

### Option B · Manual push
```
cd /app
git init && git remote add origin https://github.com/<USER>/<REPO>.git
git add frontend/public/avatars/master/
git commit -m "Add avatar MP4s + posters"
git push -u origin main
```

## Step 2 · Set the CDN env var

Open `/app/frontend/.env` and set:

```
REACT_APP_AVATAR_CDN_BASE=https://cdn.jsdelivr.net/gh/<USER>/<REPO>@main/frontend/public
```

For example, if your repo is `j-davidg67/creatorboostai`:

```
REACT_APP_AVATAR_CDN_BASE=https://cdn.jsdelivr.net/gh/j-davidg67/creatorboostai@main/frontend/public
```

Note the `frontend/public` path — that's because in your repo the file
lives at `frontend/public/avatars/master/master-intro-opt.mp4`. The
final URL becomes:

```
https://cdn.jsdelivr.net/gh/j-davidg67/creatorboostai@main/frontend/public/avatars/master/master-intro-opt.mp4
```

## Step 3 · Restart the frontend

```
sudo supervisorctl restart frontend
```

## Step 4 · Verify

Open `https://bodyiq-training.preview.emergentagent.com/?debugVideo=true`
and check the debug overlay's `src:` line — it should show the full
jsDelivr URL, not a local path.

Also `curl -I` the CDN URL to confirm:
```
curl -I https://cdn.jsdelivr.net/gh/<USER>/<REPO>@main/frontend/public/avatars/master/master-intro-opt.mp4
```
You should see:
```
HTTP/2 200
cache-control: public, max-age=604800   ← jsDelivr edge cache
content-type: video/mp4
accept-ranges: bytes
```

## Step 5 · Production
Click **Deploy** on Emergent. The same env var is read at build time, so
production at creatorboostai.com will use the CDN automatically.

## Why jsDelivr
- Free, no account, no credentials needed
- Global edge network (similar to Cloudflare)
- Honors Range requests (essential for video streaming)
- Cache-Control: public, max-age=604800 (7 days)
- Frees the 250m/512Mi pod from serving static MP4s
- Frontend gracefully falls back to local `/avatars/master/*` if env var
  is unset, so the dev pod still works

## Pinning a version
Once stable, swap `@main` for a commit SHA so cache busts are explicit:
```
REACT_APP_AVATAR_CDN_BASE=https://cdn.jsdelivr.net/gh/<USER>/<REPO>@abc1234/frontend/public
```
