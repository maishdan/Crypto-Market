# NexsMarkets

NexsMarkets is a React, TypeScript, and Vite application. Supabase Auth provides email/password signup, login, session persistence, password reset, and sign-out. Supabase stores private profile photos and display names with per-user row-level security, and streams profile/account events through Realtime. No custody, investment account, market feed, order execution, or identity verification provider is connected.

## Run locally

On Windows PowerShell, use the `.cmd` npm shim:

```powershell
npm.cmd install
npm.cmd run dev
```

Vite prints the local URL when the development server starts. To create a production build, run `npm.cmd run build`.

## Connect your Supabase project

1. In the Supabase dashboard, create a project and open **Project Settings → API**. Copy the Project URL and the publishable/anon key. Never use a `service_role` key in this browser app or send keys in chat.
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `.env.local` is ignored by Git. Restart Vite after changing environment values.
3. In the Supabase SQL Editor, run `202610030001_profiles.sql`, `202610030002_account_activities.sql`, and `202610030003_profile_avatars.sql` from `supabase/migrations`. They set up the profile, activity, private avatar bucket, per-user row-level security, and Realtime.
4. In **Authentication → URL Configuration**, set the local site URL to `http://localhost:5173` and add it to allowed redirect URLs. For production, configure your real domain separately.
5. In **Authentication → Providers**, enable Email. Keep email confirmation enabled and configure SMTP before production; Supabase's default email service has low limits.
6. Start the app with `npm.cmd run dev`. Signup creates an Auth user and profile; users can update their own display name/email and upload a private avatar photo.

The app intentionally collects only a display name, email, and password for account creation. Profile photos are limited to JPG, PNG, or WebP up to 2 MB and are private to the account. Do not collect identity numbers, home addresses, face scans, or identity documents until an approved KYC provider and secure server-side workflow are selected.

## Current capabilities

- Informational allocation tiers: Satoshi ($50–$999), Hash ($1,000–$4,999), Node ($5,000–$19,999), Block ($20,000–$49,999), and Genesis ($50,000–$100,000). These ranges do not promise returns or activate investments.
- Planned minimum deposit and allocation: $50. Neither deposits nor allocations are connected to payment or custody services.
- Markets lets users choose a Forex or Deriv provider path for interface preference only; no market feed, broker session, or orders are active.
- Account creation and profile-name updates write real account activity in Supabase; the Activity view reads only the signed-in user's rows and listens for new events over Realtime.
- Users can update their display name/email and upload a private avatar from Profile. Email changes require confirmation; photos are JPG/PNG/WebP up to 2 MB.
- Balances, holdings, trade charts, deposits, withdrawals, face verification, and passkey enrollment are not enabled. Do not enter real identity data or send cryptocurrency.

## Not connected to financial services

Supabase provides real account authentication, profile persistence, private avatar storage, and account/profile activity, but this project has no custody, crypto address monitoring, payment rails, live market feed, order execution, passkeys, or identity-document processing. Before any live financial use, obtain jurisdiction-specific legal and compliance advice and integrate reviewed custody, payment, market-data, trading, passkey/WebAuthn, and KYC providers. Never store passwords, identity documents, private keys, or a Supabase service-role key in browser storage or source code.

## Funding guidelines

- A live deposit workflow needs custody-provider-generated addresses, deposit monitoring, confirmation rules, reconciliation, and a secure backend.
- Always match the asset and network exactly. USDT (ERC-20) and USDT (TRC-20) addresses are not interchangeable. Blockchain transfers are generally irreversible.
- Keep the $50 minimum deposit and allocation amount clear. Neither amount implies a return.
- Do not promise fixed returns. Explain volatility and the possibility of losing some or all invested funds.
