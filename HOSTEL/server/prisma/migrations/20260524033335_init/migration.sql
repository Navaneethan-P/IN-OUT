-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('WARDEN', 'HOD', 'PLACEMENT', 'SECURITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('OUTING', 'LEAVE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'PENDING_WARDEN', 'PARENT_VERIFICATION', 'PENDING_HOD', 'PENDING_PLACEMENT', 'APPROVED', 'OUT_CONFIRMED', 'RETURNED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('STUDENT', 'WARDEN', 'HOD', 'PLACEMENT', 'SECURITY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ScanMethod" AS ENUM ('QR', 'RFID', 'MANUAL', 'ROLL_NUMBER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'HELD');

-- CreateEnum
CREATE TYPE "ParentCallMethod" AS ENUM ('MANUAL', 'IVR');

-- CreateEnum
CREATE TYPE "ParentResponse" AS ENUM ('APPROVED', 'REJECTED', 'NO_ANSWER', 'CONNECTED_WARDEN');

-- CreateEnum
CREATE TYPE "GateEventType" AS ENUM ('EXIT', 'ENTRY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "StaffRole" NOT NULL,
    "department" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "phone" TEXT,
    "fatherName" TEXT,
    "fatherPhone" TEXT NOT NULL,
    "motherName" TEXT,
    "motherPhone" TEXT,
    "email" TEXT,
    "roomId" TEXT,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT,
    "passwordHash" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "rfidUid" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_rooms" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" INTEGER,
    "block" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostel_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "reason" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "outDatetime" TIMESTAMP(3) NOT NULL,
    "expectedReturnDatetime" TIMESTAMP(3) NOT NULL,
    "actualReturnDatetime" TIMESTAMP(3),
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "requiresHodApproval" BOOLEAN NOT NULL,
    "requiresPlacementApproval" BOOLEAN NOT NULL,
    "ticketCode" TEXT,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "overdueNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_event_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" "StaffRole" NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_verifications" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "phoneCalled" TEXT NOT NULL,
    "callMethod" "ParentCallMethod" NOT NULL,
    "response" "ParentResponse",
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "calledById" TEXT,

    CONSTRAINT "parent_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestId" TEXT,
    "eventType" "GateEventType" NOT NULL,
    "scanMethod" "ScanMethod" NOT NULL,
    "scannedById" TEXT,
    "location" TEXT NOT NULL DEFAULT 'main_gate',
    "isAuthorized" BOOLEAN NOT NULL,
    "notes" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMsgId" TEXT,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "hostelName" TEXT NOT NULL DEFAULT 'Hostel Management System',
    "wardenPhone" TEXT,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "isPlacementActive" BOOLEAN NOT NULL DEFAULT false,
    "defaultOutingLimitHours" INTEGER NOT NULL DEFAULT 12,
    "overdueCheckIntervalMins" INTEGER NOT NULL DEFAULT 15,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_schedule" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "placementDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_rollNumber_key" ON "students"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "students_qrToken_key" ON "students"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "students_rfidUid_key" ON "students"("rfidUid");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_rooms_roomNumber_key" ON "hostel_rooms"("roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_ticketCode_key" ON "leave_requests"("ticketCode");

-- CreateIndex
CREATE INDEX "request_event_logs_requestId_idx" ON "request_event_logs"("requestId");

-- CreateIndex
CREATE INDEX "request_event_logs_createdAt_idx" ON "request_event_logs"("createdAt");

-- CreateIndex
CREATE INDEX "attendance_logs_studentId_idx" ON "attendance_logs"("studentId");

-- CreateIndex
CREATE INDEX "attendance_logs_scannedAt_idx" ON "attendance_logs"("scannedAt");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "hostel_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_event_logs" ADD CONSTRAINT "request_event_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_event_logs" ADD CONSTRAINT "request_event_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_verifications" ADD CONSTRAINT "parent_verifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_verifications" ADD CONSTRAINT "parent_verifications_calledById_fkey" FOREIGN KEY ("calledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
