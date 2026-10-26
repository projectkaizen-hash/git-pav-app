-- CreateTable
CREATE TABLE "push_tickets" (
    "ticket_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tickets_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateIndex
CREATE INDEX "push_tickets_created_at_idx" ON "push_tickets"("created_at");

-- CreateIndex
CREATE INDEX "push_tickets_token_idx" ON "push_tickets"("token");

-- AddForeignKey
ALTER TABLE "push_tickets" ADD CONSTRAINT "push_tickets_token_fkey" FOREIGN KEY ("token") REFERENCES "push_tokens"("token") ON DELETE CASCADE ON UPDATE CASCADE;

