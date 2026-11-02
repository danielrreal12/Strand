# Optimum Nodes

Board for the Optimum production week. Each node pays $350. Rows stay empty until they come from Anthoney’s emails: when you can start, the due date, the map, and coordinates.

## Run locally

```bash
npm install
npm run dev -- --port 3847
```

Open [http://localhost:3847](http://localhost:3847) and enter PIN **4826**.

## Gmail, read-only

Mail is off on public tunnel links. It runs on localhost, or on a host you name in `GMAIL_ALLOWED_HOSTS`, and only after you sign in with Google.

1. In a Google Cloud project you control, enable the Gmail API.
2. OAuth consent screen: External, stay in Testing, and add your Gmail address as a test user.
3. Add the scope `https://www.googleapis.com/auth/gmail.readonly` and no other Gmail scope.
4. Create a Web application client. Authorized redirect URI: `http://localhost:3847/api/gmail/callback` (or the same path on your private host).
5. Copy `.env.example` to `.env.local` and fill in the client id, client secret, and a long `GMAIL_TOKEN_SECRET`.
6. Restart the server and use **Connect Gmail**. Optimum reads messages from Anthoney and does not send, delete, or change mail.

`gmail.readonly` is a restricted Google scope. Leaving the app in Testing keeps it limited to the test users you add. The refresh token stays in an encrypted httpOnly cookie on that private host.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
