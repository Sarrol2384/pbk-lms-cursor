# Complete email setup (Brevo + PBK LMS + Supabase)

This guide walks you through the **whole** email setup so that:

1. **App emails** (application received, welcome when approved, admin notifications) go through **Brevo**.
2. The **first email** (confirm your signup) is also sent **via Brevo** and uses **PBK branding** instead of “Supabase Auth”.

You’ll do a few steps **manually** in the Brevo and Supabase dashboards (we can’t log in for you), but everything is copy-paste where possible.

---

## Part 1: Brevo (one-time)

### 1.1 API key (for the app)

1. Go to [app.brevo.com](https://app.brevo.com) and log in.
2. **Settings** (gear) → **SMTP & API** → **API Keys**.
3. Create an API key (e.g. “PBK LMS”) and **copy it**. You’ll paste it in Part 2.

### 1.2 Sender (from address)

1. In Brevo: **Senders & IP** (or **Senders, Domains & Dedicated IPs**).
2. Add a sender:
   - **Email:** the address you want to send from (e.g. `noreply@yourdomain.com` or use Brevo’s default if you haven’t verified a domain).
   - **Name:** e.g. `PBK Memorial Leadership Institute`.
3. If you use your own domain, **verify it** (DNS) as Brevo instructs.

### 1.3 SMTP credentials (for Supabase “Confirm signup” emails)

1. In Brevo: **Settings** → **SMTP & API** → **SMTP**.
2. Note:
   - **Server:** `smtp-relay.brevo.com`
   - **Port:** `587` (TLS)
   - **Login:** your Brevo account email (or the SMTP login shown there).
   - **Password:** create/copy the **SMTP key** (not the HTTP API key). It’s often under “Generate SMTP key” or similar.

You’ll use these in Part 3 (Supabase).

---

## Part 2: PBK LMS `.env.local`

In your project root, create or edit `.env.local` and set (use your real values):

```env
# --- Brevo (required for app emails) ---
BREVO_API_KEY=your_brevo_api_key_from_part_1.1
BREVO_FROM_EMAIL=noreply@yourdomain.com
EMAIL_FROM_NAME=PBK Memorial Leadership Institute

# --- Optional: fallback and support ---
RESEND_API_KEY=
SUPPORT_EMAIL=support@pbkleadership.org.za
ADMIN_NOTIFY_EMAIL=ceesproductions@gmail.com

# --- App URL (used in links in emails) ---
NEXT_PUBLIC_APP_URL=https://your-pbk-lms-domain.com
```

- **BREVO_API_KEY:** from step 1.1.  
- **BREVO_FROM_EMAIL:** same address you added as sender in 1.2.  
- **EMAIL_FROM_NAME:** appears as “From” name in all app emails.  
- **ADMIN_NOTIFY_EMAIL:** where admin notifications (new application, proof uploaded) are sent.  
- **NEXT_PUBLIC_APP_URL:** your live site URL (e.g. `https://pbkleadership.org.za`); use `http://localhost:3000` only for local testing.

Restart the dev server after changing `.env.local`.

---

## Part 3: Supabase – use Brevo to send the “Confirm signup” email

So the **first** email (confirm your signup) is sent **by Brevo** and doesn’t say “Supabase Auth”.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your **PBK project**.
2. Go to **Authentication** → **Providers** → **Email**.
3. Under **SMTP Settings**, enable **Custom SMTP** and fill in:

| Field           | Value                          |
|----------------|---------------------------------|
| Sender email   | Same as `BREVO_FROM_EMAIL`      |
| Sender name    | Same as `EMAIL_FROM_NAME`       |
| Host           | `smtp-relay.brevo.com`         |
| Port           | `587`                          |
| Username       | Your Brevo SMTP login (1.3)    |
| Password       | Your Brevo SMTP key (1.3)      |

4. **Save**. New signup confirmation emails will be sent via Brevo.

---

## Part 4: Supabase – PBK-branded “Confirm signup” template

1. In the same Supabase project: **Authentication** → **Email Templates**.
2. Select the **Confirm signup** template.
3. Set **Subject** to:
   ```text
   Confirm your email – PBK Institute
   ```
4. Replace the **Body** with the template below (it uses Supabase’s variable `{{ .ConfirmationURL }}` for the link). You can copy from the file `docs/supabase-templates/confirm-signup.html` in this repo, or paste this:

```html
<h2>Confirm your email</h2>
<p>Thanks for signing up. Click the link below to confirm your email and activate your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>If you didn't sign up, you can ignore this email.</p>
<p>— PBK Memorial Leadership Institute</p>
```

5. **Save**.

After this, the first email new users get will be PBK-branded and sent via Brevo.

---

## Summary

| What                         | Where it’s set                          |
|-----------------------------|----------------------------------------|
| App emails (Brevo)          | `.env.local` (Part 2) + Brevo API (1.1) |
| Sender name/address         | Brevo Senders (1.2) + `.env.local`     |
| “Confirm signup” via Brevo  | Supabase Custom SMTP (Part 3)          |
| “Confirm signup” wording     | Supabase Email Templates (Part 4)      |

You only need to do the Brevo and Supabase steps once. If you later change sender name or support email, update `.env.local` and Supabase SMTP sender name to match.
