-- CS-34 (decisions log #17): a guardian books a visit for their child.
-- Additive only: a nullable column, its index and foreign key. The key is
-- RESTRICT so a child's visit records can't be orphaned by unlinking them.
-- Rollback: drop the column.

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "dependant_id" UUID;

-- CreateIndex
CREATE INDEX "appointments_dependant_id_idx" ON "appointments"("dependant_id");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dependant_id_fkey" FOREIGN KEY ("dependant_id") REFERENCES "dependants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

