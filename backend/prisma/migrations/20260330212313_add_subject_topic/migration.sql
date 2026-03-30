-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_key_key" ON "Subject"("key");

-- CreateIndex
CREATE INDEX "Topic_subjectKey_idx" ON "Topic"("subjectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_subjectKey_value_key" ON "Topic"("subjectKey", "value");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectKey_fkey" FOREIGN KEY ("subjectKey") REFERENCES "Subject"("key") ON DELETE CASCADE ON UPDATE CASCADE;
