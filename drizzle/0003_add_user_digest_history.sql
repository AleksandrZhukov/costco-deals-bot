CREATE TABLE IF NOT EXISTS "user_digest_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_telegram_id" bigint NOT NULL,
	"deal_id" integer,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_digest_history" ADD CONSTRAINT "user_digest_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_history_user" ON "user_digest_history" ("user_telegram_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_history_deal" ON "user_digest_history" ("deal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_history_sent_at" ON "user_digest_history" ("sent_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_deal_digest" ON "user_digest_history" ("user_telegram_id","deal_id");