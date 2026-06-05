# Phase 1 API Test Sequences
# Test these EXACTLY in this order after the server boots.
# Use Postman, Insomnia, Bruno, or curl.

BASE_URL = http://localhost:3000/api/v1

---

## ═══════════════════════════════════════════════════
## TEST BLOCK 0 — Health Check (no auth)
## ═══════════════════════════════════════════════════

### 0.1 API Health
GET http://localhost:3000/api/health
Expected: { "success": true, "data": { "status": "healthy" } }


---

## ═══════════════════════════════════════════════════
## TEST BLOCK 1 — Authentication
## ═══════════════════════════════════════════════════

### 1.1 Student Login (MUST PASS)
POST {{BASE_URL}}/auth/student/login
Content-Type: application/json

{
  "rollNumber": "22BIT0001",
  "password": "password123"
}

Expected:
  - 200 OK
  - accessToken present
  - user.role = "STUDENT"
  - user.name = "Navaneethan R"

Save accessToken as: STUDENT_TOKEN


### 1.2 Student Login — Wrong Password (MUST FAIL)
POST {{BASE_URL}}/auth/student/login
Content-Type: application/json

{
  "rollNumber": "22BIT0001",
  "password": "wrongpassword"
}

Expected: 401 Unauthorized
  - "Invalid roll number or password"


### 1.3 Warden Login (MUST PASS)
POST {{BASE_URL}}/auth/staff/login
Content-Type: application/json

{
  "email": "warden@hostel.edu",
  "password": "password123"
}

Expected:
  - 200 OK
  - user.role = "WARDEN"

Save accessToken as: WARDEN_TOKEN


### 1.4 HOD Login (MUST PASS)
POST {{BASE_URL}}/auth/staff/login
Content-Type: application/json

{
  "email": "hod.it@hostel.edu",
  "password": "password123"
}

Expected:
  - 200 OK
  - user.role = "HOD"
  - user.department = "IT"

Save accessToken as: HOD_TOKEN


### 1.5 Admin Login (MUST PASS)
POST {{BASE_URL}}/auth/staff/login
Content-Type: application/json

{
  "email": "admin@hostel.edu",
  "password": "password123"
}

Expected:
  - 200 OK
  - user.role = "ADMIN"

Save accessToken as: ADMIN_TOKEN


---

## ═══════════════════════════════════════════════════
## TEST BLOCK 2 — Role Guard Enforcement
## ═══════════════════════════════════════════════════

### 2.1 Student accessing warden route (MUST FAIL)
PATCH {{BASE_URL}}/warden/requests/fake-id/approve
Authorization: Bearer {{STUDENT_TOKEN}}

Expected: 403 Forbidden
  - code: FORBIDDEN


### 2.2 No token accessing protected route (MUST FAIL)
GET {{BASE_URL}}/student/me

Expected: 401 Unauthorized
  - code: UNAUTHORIZED


### 2.3 Student profile (MUST PASS)
GET {{BASE_URL}}/student/me
Authorization: Bearer {{STUDENT_TOKEN}}

Expected:
  - 200 OK
  - rollNumber = "22BIT0001"
  - department = "IT"
  - room.roomNumber = "A-101"


---

## ═══════════════════════════════════════════════════
## TEST BLOCK 3 — Leave Request Creation
## ═══════════════════════════════════════════════════

### 3.1 Submit valid outing request (MUST PASS)
POST {{BASE_URL}}/requests
Authorization: Bearer {{STUDENT_TOKEN}}
Content-Type: application/json

{
  "type": "OUTING",
  "reason": "Family function at hometown",
  "place": "Salem, Tamil Nadu",
  "outDatetime": "2026-05-25T17:00:00.000Z",
  "expectedReturnDatetime": "2026-05-25T21:00:00.000Z"
}

Expected:
  - 201 Created
  - status = "PENDING_WARDEN"   ← Must be this, not DRAFT
  - requiresHodApproval = true  ← isWorkingDay=true in settings
  - requiresPlacementApproval = false

Save request id as: REQUEST_ID_1


### 3.2 Submit duplicate request while active (MUST FAIL)
POST {{BASE_URL}}/requests
Authorization: Bearer {{STUDENT_TOKEN}}
Content-Type: application/json

{
  "type": "LEAVE",
  "reason": "Medical appointment",
  "place": "Chennai",
  "outDatetime": "2026-05-26T09:00:00.000Z",
  "expectedReturnDatetime": "2026-05-26T18:00:00.000Z"
}

Expected: 409 Conflict
  - "You already have an active request..."


### 3.3 Submit request with past date (MUST FAIL)
POST {{BASE_URL}}/requests
Authorization: Bearer {{STUDENT_TOKEN}}
Content-Type: application/json

{
  "type": "OUTING",
  "reason": "Test",
  "place": "Coimbatore",
  "outDatetime": "2024-01-01T10:00:00.000Z",
  "expectedReturnDatetime": "2024-01-01T18:00:00.000Z"
}

Expected: 400 Bad Request
  - "Out date/time must be in the future"


### 3.4 View my requests (MUST PASS)
GET {{BASE_URL}}/requests
Authorization: Bearer {{STUDENT_TOKEN}}

Expected:
  - items array with REQUEST_ID_1
  - status = "PENDING_WARDEN"


### 3.5 View request detail with event log (MUST PASS)
GET {{BASE_URL}}/requests/{{REQUEST_ID_1}}
Authorization: Bearer {{STUDENT_TOKEN}}

Expected:
  - eventLogs array has 2 entries:
    Entry 1: fromStatus=null, toStatus="DRAFT"
    Entry 2: fromStatus="DRAFT", toStatus="PENDING_WARDEN"
  ← This proves the audit trail works


---

## ═══════════════════════════════════════════════════
## TEST BLOCK 4 — Warden Dashboard & Approval
## ═══════════════════════════════════════════════════

### 4.1 Warden views all pending requests (MUST PASS)
GET {{BASE_URL}}/warden/requests?status=PENDING_WARDEN
Authorization: Bearer {{WARDEN_TOKEN}}

Expected:
  - REQUEST_ID_1 appears
  - student.name present
  - student.fatherPhone present


### 4.2 Warden views presence stats (MUST PASS)
GET {{BASE_URL}}/warden/presence
Authorization: Bearer {{WARDEN_TOKEN}}

Expected:
  - totalStudents = 5
  - counts by year


### 4.3 Warden views settings (MUST PASS)
GET {{BASE_URL}}/warden/settings
Authorization: Bearer {{WARDEN_TOKEN}}

Expected:
  - isWorkingDay = true
  - isPlacementActive = false


### 4.4 Warden rejects WITHOUT reason (MUST FAIL)
PATCH {{BASE_URL}}/warden/requests/{{REQUEST_ID_1}}/reject
Authorization: Bearer {{WARDEN_TOKEN}}
Content-Type: application/json

{}

Expected: 400 Validation Error
  - "Rejection reason required"


### 4.5 Warden approves request (MUST PASS)
PATCH {{BASE_URL}}/warden/requests/{{REQUEST_ID_1}}/approve
Authorization: Bearer {{WARDEN_TOKEN}}
Content-Type: application/json

{
  "note": "Verified. Proceeding to parent call."
}

Expected:
  - 200 OK
  - status = "PARENT_VERIFICATION"  ← NOT APPROVED yet
  - Event log now has 3 entries


### 4.6 Try to approve AGAIN (MUST FAIL — invalid transition)
PATCH {{BASE_URL}}/warden/requests/{{REQUEST_ID_1}}/approve
Authorization: Bearer {{WARDEN_TOKEN}}
Content-Type: application/json

{}

Expected: 409 Conflict
  - code: INVALID_ACTION
  - "Action 'WARDEN_APPROVE' is not valid from state 'PARENT_VERIFICATION'"


---

## ═══════════════════════════════════════════════════
## TEST BLOCK 5 — Parent Verification → State Branching
## ═══════════════════════════════════════════════════

### 5.1 Record parent approval (MUST PASS)
POST {{BASE_URL}}/warden/requests/{{REQUEST_ID_1}}/parent-verify
Authorization: Bearer {{WARDEN_TOKEN}}
Content-Type: application/json

{
  "phoneCalled": "9222221001",
  "callMethod": "MANUAL",
  "response": "APPROVED",
  "note": "Father confirmed. Said student can go."
}

Expected:
  - 200 OK
  - status = "PENDING_HOD"   ← Because requiresHodApproval=true
  ← This is the branching logic working correctly


### 5.2 Check request detail — audit trail
GET {{BASE_URL}}/warden/requests/{{REQUEST_ID_1}}
Authorization: Bearer {{WARDEN_TOKEN}}

Expected eventLogs:
  1. null → DRAFT (STUDENT)
  2. DRAFT → PENDING_WARDEN (STUDENT)
  3. PENDING_WARDEN → PARENT_VERIFICATION (WARDEN)
  4. PARENT_VERIFICATION → PENDING_HOD (WARDEN)

4 events = correct lifecycle tracking.


---

## ═══════════════════════════════════════════════════
## TEST BLOCK 6 — Terminal State Protection
## ═══════════════════════════════════════════════════

### 6.1 Create a second request for terminal state testing
# First cancel the active request, then create new one
DELETE {{BASE_URL}}/requests/{{REQUEST_ID_1}}
Authorization: Bearer {{STUDENT_TOKEN}}

Expected: 409 Conflict
  - "Action 'STUDENT_CANCEL' is not valid from state 'PENDING_HOD'"
  ← Student CANNOT cancel after HOD is involved


### 6.2 Try to jump to APPROVED directly (MUST FAIL)
# This tests that the API never accepts arbitrary status changes
PATCH {{BASE_URL}}/warden/requests/{{REQUEST_ID_1}}/approve
Authorization: Bearer {{WARDEN_TOKEN}}

Expected: 409 Conflict
  - INVALID_ACTION  ← Warden cannot approve from PENDING_HOD


---

## ═══════════════════════════════════════════════════
## TEST BLOCK 7 — Settings Toggle
## ═══════════════════════════════════════════════════

### 7.1 Switch to HOLIDAY mode
PATCH {{BASE_URL}}/warden/settings
Authorization: Bearer {{WARDEN_TOKEN}}
Content-Type: application/json

{
  "isWorkingDay": false
}

Expected: 200 OK — isWorkingDay = false


### 7.2 Create new request on holiday (with different student)
POST {{BASE_URL}}/requests
Authorization: Bearer <STUDENT_2_TOKEN>  ← Login as 22BIT0002 first
Content-Type: application/json

{
  "type": "OUTING",
  "reason": "Weekend visit home",
  "place": "Madurai",
  "outDatetime": "2026-05-25T17:00:00.000Z",
  "expectedReturnDatetime": "2026-05-25T22:00:00.000Z"
}

Expected:
  - requiresHodApproval = false  ← Holiday mode, skip HOD
  - requiresPlacementApproval = false


### 7.3 Restore working day
PATCH {{BASE_URL}}/warden/settings
Authorization: Bearer {{WARDEN_TOKEN}}
Content-Type: application/json

{
  "isWorkingDay": true
}


---

## ═══════════════════════════════════════════════════
## PHASE 1 PASS CRITERIA
## ═══════════════════════════════════════════════════

All of these must be true before Phase 2 begins:

✅ All login endpoints return correct tokens and roles
✅ Role guards block wrong-role access with 403
✅ Request submission → PENDING_WARDEN (not DRAFT)
✅ Duplicate active request blocked
✅ Warden approval → PARENT_VERIFICATION (not APPROVED)
✅ Parent approval branches correctly:
     - isWorkingDay=true  → PENDING_HOD
     - isWorkingDay=false → APPROVED directly
✅ Invalid transitions return 409 with INVALID_ACTION code
✅ Terminal states cannot transition (COMPLETED, REJECTED, etc.)
✅ Every transition logged in request_event_logs
✅ Settings toggle works and affects NEW requests only
✅ Old requests keep their locked requiresHodApproval flag

If any item fails: FIX IT before Phase 2.
