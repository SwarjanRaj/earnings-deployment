-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'BLOCKED', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT,
    "sector" TEXT,
    "marketCap" TEXT,
    "revenue" TEXT,
    "eps" TEXT,
    "earningsDate" TIMESTAMP(3),
    "fiscalYear" INTEGER NOT NULL,
    "fiscalQuarter" TEXT NOT NULL,
    "reportTime" TEXT,
    "peRatio" TEXT,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastLogin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "dob" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRecord_ticker_fiscalYear_fiscalQuarter_key" ON "FinancialRecord"("ticker", "fiscalYear", "fiscalQuarter");

-- CreateIndex
CREATE UNIQUE INDEX "LoginActivity_userId_key" ON "LoginActivity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "LoginActivity" ADD CONSTRAINT "LoginActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
