-- DropIndex
DROP INDEX "categories_user_id_name_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_name_key" ON "categories"("user_id", "name") WHERE ("deleted_at" IS NULL);
