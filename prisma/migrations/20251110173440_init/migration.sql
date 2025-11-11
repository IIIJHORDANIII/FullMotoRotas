-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EstablishmentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "deliveryRadiusKm" REAL NOT NULL DEFAULT 5,
    "baseDeliveryFee" REAL NOT NULL DEFAULT 0,
    "additionalPerKm" REAL NOT NULL DEFAULT 0,
    "estimatedDeliveryTimeMinutes" INTEGER NOT NULL DEFAULT 30,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "lastBillingAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EstablishmentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MotoboyProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnhNumber" TEXT NOT NULL,
    "cnhCategory" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "phone" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" REAL,
    "currentLng" REAL,
    "workSchedule" JSONB,
    "verifiedAt" DATETIME,
    "hiredAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MotoboyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "establishmentId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryCode" TEXT NOT NULL,
    "notes" TEXT,
    "distanceKm" REAL,
    "deliveryFee" REAL,
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryOrder_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "EstablishmentProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "motoboyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "rejectionReason" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "DeliveryAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DeliveryOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryAssignment_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "MotoboyProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DeliveryOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DeliveryOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentProfile_userId_key" ON "EstablishmentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentProfile_cnpj_key" ON "EstablishmentProfile"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "MotoboyProfile_userId_key" ON "MotoboyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MotoboyProfile_cpf_key" ON "MotoboyProfile"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrder_deliveryCode_key" ON "DeliveryOrder"("deliveryCode");
