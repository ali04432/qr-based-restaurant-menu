# Testing AR on a Real Phone — Step-by-Step Guide

AR (Augmented Reality) requires a **secure context (HTTPS)**. Your PC's
`localhost:3000` is not reachable from a phone. This guide shows you how
to expose your local app over a temporary HTTPS tunnel so you can test
AR on a real Android or iPhone.

> ⚠️ **Tunnel URLs are temporary (reset every time you restart).
> Use a real domain with a valid TLS certificate for production.**

---

## Architecture (Single Tunnel)

```
Your Phone  ──HTTPS──►  Cloudflare Tunnel  ──HTTP──►  Next.js :3000
                                                              │
                                              Next.js /api rewrite
                                                              │
                                                    Express API :4000
```

The Next.js `/api` rewrite (configured in `next.config.js`) proxies
all `/api/*` calls to the Express backend. This means **one tunnel URL**
covers both the frontend and the API — your phone only needs one link.

---

## Option A — Cloudflare Tunnel (Recommended, No Account Needed)

### 1. Install `cloudflared`

**Windows (winget):**
```powershell
winget install Cloudflare.cloudflared
```

**Windows (manual download):**
Download from https://github.com/cloudflare/cloudflared/releases
and put `cloudflared.exe` somewhere in your PATH.

### 2. Start Both Dev Servers

Open **two terminals** in the repo root:

**Terminal 1 — API server:**
```powershell
cmd /c "npm run dev:api"
```

**Terminal 2 — Web server (use the same origin for API):**
```powershell
cmd /c "set NEXT_PUBLIC_API_URL=http://localhost:3000 && npm run dev:web"
```

The Next.js rewrite will forward `/api/*` to the Express server on port 4000.

### 3. Start the Tunnel (Third Terminal)

```powershell
cloudflared tunnel --url http://localhost:3000
```

You will see output like:
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://random-words-123.trycloudflare.com
```

### 4. Set the Public URL for the Web Server

Stop the web server (Ctrl+C in Terminal 2) and restart with the tunnel URL:

```powershell
cmd /c "set NEXT_PUBLIC_API_URL=https://random-words-123.trycloudflare.com && npm run dev:web"
```

**Why?** `NEXT_PUBLIC_API_URL` is baked into the browser bundle. The phone
browser fetches from the tunnel URL, so the API calls must also point there
(they are proxied by Next.js via the rewrite rule).

### 5. Open on Your Phone

1. Open Safari (iPhone) or Chrome (Android).
2. Navigate to: `https://random-words-123.trycloudflare.com`
3. Proceed with the AR test checklist below.

---

## Option B — ngrok

### 1. Install ngrok

Download from https://ngrok.com/download and add to PATH.

### 2. Sign Up and Authenticate (Free Account Required)

```powershell
ngrok config add-authtoken YOUR_TOKEN_HERE
```

Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken

### 3. Start Dev Servers (same as Option A, steps 1–2)

### 4. Start the Tunnel

```powershell
ngrok http 3000
```

You will see:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

### 5. Set Public URL and Restart Web Server

```powershell
cmd /c "set NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app && npm run dev:web"
```

---

## Convenience npm Script

Add this to your shell session before running:

```powershell
# PowerShell
$env:NEXT_PUBLIC_API_URL = "https://YOUR-TUNNEL-URL"
npm run dev:web
```

Or create a `.env.local.tunnel` file (do NOT commit it):
```
NEXT_PUBLIC_API_URL=https://YOUR-TUNNEL-URL
```

---

## Phone AR Test Checklist

Run this checklist **on the actual phone** (not the PC browser):

### Setup
- [ ] Dev servers are running (API on :4000, web on :3000)
- [ ] Tunnel is running and URL noted
- [ ] `NEXT_PUBLIC_API_URL` is set to the tunnel URL
- [ ] Web server restarted after setting the env var

### 3D Viewer Test
- [ ] Open the tunnel URL in **Chrome (Android)** or **Safari (iPhone)**
- [ ] Navigate to any food item detail page
- [ ] Verify the "View in 3D (360°)" button appears (item must have a 3D model assigned in Admin)
- [ ] Tap "View in 3D" — the 3D viewer opens and the model loads
- [ ] Drag to rotate the model (360° rotation works)
- [ ] Pinch to zoom in/out
- [ ] Tap fullscreen button — fullscreen mode opens
- [ ] Close the viewer

### AR Test (Android — Chrome + Scene Viewer)
- [ ] In the 3D viewer, tap **"View in Your Space"** button
- [ ] Allow camera permission if asked
- [ ] Scene Viewer opens — move phone slowly around the room
- [ ] Surface detection indicator appears (dots/plane)
- [ ] Tap to place the dish on the surface
- [ ] Dish appears at roughly real plate size (not the size of a building or a crumb)
- [ ] Walk around the table — model stays in place
- [ ] Tap the back/exit button — returns to the app

### AR Test (iPhone — Safari + Quick Look)
- [ ] Open the same food item in **Safari** on iPhone
- [ ] Tap "View in 3D" then "View in Your Space"
- [ ] Quick Look launches (requires a `.usdz` model — GLB-only items will fall back to 3D view)
- [ ] Surface detection works
- [ ] Place the dish

### Fallback States (Test These Too)
- [ ] Open an item with **no 3D model assigned** — "3D view coming soon" message shows (no broken button)
- [ ] Deny camera permission — friendly error message shown, 3D viewer still works
- [ ] Test on a non-AR-capable device — "AR not supported on this device" message shown

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Page loads but API calls return 404 | Check that `NEXT_PUBLIC_API_URL` is set to the tunnel URL and the web server was restarted |
| CORS error in console | The API allows `*.trycloudflare.com` and `*.ngrok-free.app` — check `apps/api/src/app.ts` |
| Model doesn't load | Check the model URL in Admin → AR / 3D Assets. It should be `/models/avocado.glb` (relative) |
| AR button doesn't appear (Android) | Try Chrome — AR Core requires Chrome on Android |
| Quick Look doesn't open (iPhone) | USDZ file required for iOS AR. GLB-only shows 3D viewer only |
| "3D view coming soon" shows for all items | Run the seed script: `cd apps/api && npm run seed:ar` (DB must be reachable) |

---

## Notes

- Tunnel URLs change every time you restart `cloudflared` or `ngrok`.
- For persistent testing URLs, use ngrok's paid plan with a reserved domain.
- For production: use a real domain (e.g. `yourdomain.com`) with a valid TLS certificate.
  Do NOT use tunnel URLs in production.
