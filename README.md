# Setup
1. @BotFather: /newbot -> BOT_TOKEN. Later /newapp (or Menu Button) -> APP_URL.
2. Supabase: new project -> SQL editor -> run supabase/schema.sql. Copy URL + service_role key.
3. Insert your creators (example at bottom of schema.sql).
4. Push to GitHub -> import in Vercel -> add every variable from .env.example.
5. Set webhook (replace values):
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<APP_URL>/api/bot&secret_token=<WEBHOOK_SECRET>
6. Admin group: enable Topics, add bot as admin, create topics "Trial verifications" and "Support". Get ids (topic id = message_thread_id) into TOPIC_*.
7. ADMIN_ID = your Telegram user id (use @userinfobot). ADMIN_CHAT_ID = group id (starts with -100).
8. Test: /start in bot -> share number -> open app -> apply -> approve in admin group.
Keep SUPABASE_SERVICE_KEY secret (never in client code).
