# 📷 How to enable Photo Scanning in the AI Waste Assistant

The chatbot can **identify waste from a photo** (e.g. blood-soaked cotton → Yellow bin). This uses Google's free **Gemini** AI, so it needs an API key. Text and voice already work without it.

If you see this yellow bar in the chatbot, photo scanning is not yet enabled:

> ⚠️ *Photo scanning is off — add GEMINI_API_KEY to the backend .env to enable it. Text and voice work normally.*

Follow the 4 steps below. It takes about **3 minutes** and is **free**.

---

## Step 1 — Get a free Gemini API key

1. Open **https://aistudio.google.com/app/apikey** in your browser.
2. Sign in with any Google account (Gmail).
3. Click the blue **＋ Create API key** button.
   - If it asks to choose a project, pick **"Create API key in new project"**.
4. A key appears that looks like `AIzaSy…………………………………` (39 characters).
5. Click the **copy** icon next to it. Keep this window open until Step 2 is done.

> 🔒 Treat the key like a password. Don't share it or post it online.

---

## Step 2 — Put the key in the backend `.env` file

1. Open the project folder on your computer, then open the folder **`hospital-waste-backend`**.
2. Open the file named **`.env`** with Notepad, VS Code, or any text editor.
   - Don't see a `.env` file? Create it by copying the template:
     - **Windows PowerShell:** `Copy-Item .env.example .env`
     - **Mac / Linux:** `cp .env.example .env`
3. Find this line:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Replace `your_gemini_api_key_here` with the key you copied, so it looks like:

   ```
   GEMINI_API_KEY=AIzaSyB1234567890abcdefghijklmnopqrstuvw
   ```

   ✅ No spaces, no quotes, nothing after the key.

5. Leave the next line as it is:

   ```
   GEMINI_MODEL=gemini-2.5-flash
   ```

6. **Save** the file.

---

## Step 3 — Restart the backend

The backend only reads `.env` when it starts, so restart it:

1. Go to the terminal window where the backend is running.
2. Press **Ctrl + C** to stop it.
3. Start it again:

   ```bash
   npm run dev
   ```
   (or `npm run dev:memory` if you use the no-database option)

4. Wait for: `Backend server is running on http://localhost:5000`

---

## Step 4 — Check that it works

1. In your browser, **refresh** the website (http://localhost:5173).
2. Log in as staff (`staff001` / `Password123`) → **Add Waste Record**.
3. In the chatbot on the right, the yellow "Photo scanning is off" bar should be **gone**.
4. Click the **📷 camera button**, choose a photo of some waste (or a sample image), press **Send ➤**.
5. The assistant replies with the detected items, their category and the correct bin — for example:

   > I analysed the photo and found 1 item:
   > • **Blood-soaked cotton swabs** → Infectious Waste → **Yellow Bin** (96 %)

6. Click **Apply Category & Bin to Form** to fill the waste form automatically.

Optional check from a terminal (replace the token step by just logging in on the website): open  
**http://localhost:5000/api/ai/status** after logging in — it should say `"configured": true`.

---

## ❓ Problems

| What you see | Why | Fix |
|---|---|---|
| Yellow bar still says "Photo scanning is off" | Backend not restarted, or key still equals the placeholder | Check `.env` has your real key, save, restart backend, refresh browser |
| "Gemini API key is invalid or lacks access" | Key copied incompletely, or extra spaces/quotes | Re-copy the full key; the line must be exactly `GEMINI_API_KEY=AIza…` |
| "AI service is temporarily busy (rate limit)" | Free tier allows a limited number of requests per minute | Wait 30–60 seconds and try again |
| "Gemini model … is unavailable" | Model name wrong or retired | Make sure `.env` has `GEMINI_MODEL=gemini-2.5-flash` |
| "Only JPEG, PNG, and WebP images are accepted" / "Image must be 5 MB or smaller" | Wrong file type or too large | Use a JPG/PNG under 5 MB (phone photos are fine) |
| "I could not identify the waste in this photo with confidence" | Blurry, dark, or not medical waste | Retake the photo closer and well-lit, or type a description instead |

---

## 🧠 Good to know

- **Each computer running the backend needs its own `.env`** — the file is deliberately **not** uploaded to GitHub (so your key stays private). If a friend forks the project, they add their own key the same way.
- Photos are sent **only** to Google's Gemini API using your key; nothing is stored on the server.
- The server always double-checks the AI's answer against the BMW Rules 2016 mapping (e.g. it will never let "Infectious Waste" be assigned to a White bin).
- Free tier limits (as of 2026): roughly 10–15 photo requests per minute and a daily cap — more than enough for a hospital ward. Check your usage at https://aistudio.google.com.
- To turn photo scanning off again, set the line back to `GEMINI_API_KEY=your_gemini_api_key_here` and restart.
