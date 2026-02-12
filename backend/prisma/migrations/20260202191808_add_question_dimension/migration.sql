-- CreateTable
CREATE TABLE "QuestionDimension" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionDimensionOption" (
    "id" TEXT NOT NULL,
    "dimensionKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionDimensionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionDimension_key_key" ON "QuestionDimension"("key");

-- CreateIndex
CREATE INDEX "QuestionDimensionOption_dimensionKey_idx" ON "QuestionDimensionOption"("dimensionKey");

-- CreateIndex
CREATE INDEX "QuestionDimensionOption_value_idx" ON "QuestionDimensionOption"("value");

-- AddForeignKey
ALTER TABLE "QuestionDimensionOption" ADD CONSTRAINT "QuestionDimensionOption_dimensionKey_fkey" FOREIGN KEY ("dimensionKey") REFERENCES "QuestionDimension"("key") ON DELETE CASCADE ON UPDATE CASCADE;
