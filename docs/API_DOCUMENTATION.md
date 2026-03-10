# API Documentation - PWIOI Placement Portal

Complete API reference for migrated backend (Express + Prisma + PostgreSQL)

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.your-domain.com/api
```

## Authentication

All protected routes require JWT token in Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST `/api/auth/register`

Register new user.

**Request:**
```json
{
  "email": "student@pwioi.com",
  "password": "password123",
  "role": "STUDENT",
  "profile": {
    "fullName": "John Doe",
    "phone": "1234567890",
    "enrollmentId": "EN001",
    "school": "SOT",
    "center": "BANGALORE",
    "batch": "25-29"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "student@pwioi.com",
    "role": "STUDENT",
    "status": "ACTIVE"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

### POST `/api/auth/login`

Login user.

**Request:**
```json
{
  "email": "student@pwioi.com",
  "password": "password123",
  "selectedRole": "STUDENT"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "student@pwioi.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "emailVerified": false
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

### POST `/api/auth/refresh`

Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "accessToken": "new_jwt_token"
}
```

---

### GET `/api/auth/me`

Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "student@pwioi.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "student": {
      "fullName": "John Doe",
      ...
    }
  }
}
```

---

## Student Endpoints

### GET `/api/students/profile`

Get own student profile.

**Auth:** Required (Student)

**Response:**
```json
{
  "id": "uuid",
  "fullName": "John Doe",
  "email": "student@pwioi.com",
  "phone": "1234567890",
  "enrollmentId": "EN001",
  "school": "SOT",
  "center": "BANGALORE",
  "batch": "25-29",
  "cgpa": 8.5,
  "skills": [...],
  "education": [...],
  ...
}
```

---

### PUT `/api/students/profile`

Update student profile.

**Auth:** Required (Student)

**Request:**
```json
{
  "fullName": "John Doe",
  "phone": "1234567890",
  "cgpa": 8.5,
  "linkedin": "https://linkedin.com/in/johndoe",
  ...
}
```

---

### GET `/api/students/skills`

Get student skills.

**Auth:** Required (Student)

**Response:**
```json
[
  {
    "id": "uuid",
    "skillName": "JavaScript",
    "rating": 4
  },
  ...
]
```

---

### POST `/api/students/skills`

Add or update skill.

**Auth:** Required (Student)

**Request:**
```json
{
  "skillName": "React",
  "rating": 5
}
```

---

### POST `/api/students/resume`

Upload resume PDF.

**Auth:** Required (Student)

**Request:** `multipart/form-data`
- `resume`: PDF file

**Response:**
```json
{
  "url": "https://s3.amazonaws.com/bucket/resumes/uuid/file.pdf",
  "fileName": "resume.pdf",
  "uploadedAt": "2024-01-01T00:00:00Z"
}
```

---

### GET `/api/students`

Get all students (admin).

**Auth:** Required (Admin)

**Query Params:**
- `school`: Filter by school
- `center`: Filter by center
- `batch`: Filter by batch
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**
```json
{
  "students": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

---

## Job Endpoints

### GET `/api/jobs/targeted`

Get targeted jobs for student (filtered by profile).

**Auth:** Required (Student)

**Response:**
```json
[
  {
    "id": "uuid",
    "jobTitle": "Software Engineer",
    "company": {
      "name": "Tech Corp",
      "logo": "https://..."
    },
    "salary": "10 LPA",
    "driveDate": "2024-02-01T00:00:00Z",
    "location": "Bangalore",
    ...
  },
  ...
]
```

---

### GET `/api/jobs`

Get all jobs with filters.

**Auth:** Required

**Query Params:**
- `status`: Filter by status
- `recruiterId`: Filter by recruiter
- `isPosted`: Filter posted jobs
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "jobs": [...],
  "pagination": {...}
}
```

---

### GET `/api/jobs/:jobId`

Get single job details.

**Auth:** Required

**Response:**
```json
{
  "id": "uuid",
  "jobTitle": "Software Engineer",
  "description": "...",
  "company": {...},
  "recruiter": {...},
  ...
}
```

---

### POST `/api/jobs`

Create job posting.

**Auth:** Required (Recruiter/Admin)

**Request:**
```json
{
  "jobTitle": "Software Engineer",
  "description": "Job description...",
  "companyName": "Tech Corp",
  "requiredSkills": ["JavaScript", "React"],
  "salary": "10 LPA",
  "driveDate": "2024-02-01",
  "spocs": [
    {
      "fullName": "Jane Doe",
      "email": "jane@techcorp.com",
      "phone": "1234567890"
    }
  ],
  ...
}
```

**Response:**
```json
{
  "id": "uuid",
  "jobTitle": "Software Engineer",
  "status": "IN_REVIEW",
  ...
}
```

---

### POST `/api/jobs/:jobId/post`

Post job with targeting (admin only).

**Auth:** Required (Admin)

**Request:**
```json
{
  "selectedSchools": ["SOT", "SOM"],
  "selectedCenters": ["BANGALORE", "NOIDA"],
  "selectedBatches": ["25-29", "ALL"]
}
```

**Response:**
```json
{
  "success": true,
  "job": {...},
  "message": "Job posted and distribution queued"
}
```

---

### POST `/api/jobs/:jobId/approve`

Approve job (admin).

**Auth:** Required (Admin)

**Response:**
```json
{
  "success": true,
  "job": {...}
}
```

---

### POST `/api/jobs/:jobId/reject`

Reject job (admin).

**Auth:** Required (Admin)

**Request:**
```json
{
  "rejectionReason": "Incomplete information"
}
```

---

## Application Endpoints

### GET `/api/applications`

Get student's applications.

**Auth:** Required (Student)

**Response:**
```json
[
  {
    "id": "uuid",
    "jobId": "job_uuid",
    "status": "APPLIED",
    "appliedDate": "2024-01-01",
    "company": {
      "name": "Tech Corp"
    },
    "job": {
      "jobTitle": "Software Engineer",
      ...
    }
  },
  ...
]
```

---

### POST `/api/applications/jobs/:jobId`

Apply to job.

**Auth:** Required (Student)

**Response:**
```json
{
  "id": "uuid",
  "studentId": "uuid",
  "jobId": "uuid",
  "status": "APPLIED",
  "appliedDate": "2024-01-01"
}
```

---

### PATCH `/api/applications/:applicationId/status`

Update application status.

**Auth:** Required (Admin/Recruiter)

**Request:**
```json
{
  "status": "SHORTLISTED",
  "interviewDate": "2024-02-15T10:00:00Z"
}
```

---

## Notification Endpoints

### GET `/api/notifications`

Get user notifications.

**Auth:** Required

**Query Params:**
- `isRead`: Filter by read status
- `limit`: Number of notifications

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Application Status Updated",
    "body": "Your application has been shortlisted",
    "isRead": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "data": {...}
  },
  ...
]
```

---

### PATCH `/api/notifications/:notificationId/read`

Mark notification as read.

**Auth:** Required

**Response:**
```json
{
  "id": "uuid",
  "isRead": true,
  "readAt": "2024-01-01T00:00:00Z"
}
```

---

## Socket.IO Events

### Client → Server

- `subscribe:jobs` - Subscribe to job updates
- `subscribe:applications` - Subscribe to application updates
- `subscribe:notifications` - Subscribe to notifications

### Server → Client

- `application:created` - New application created
- `application:updated` - Application status updated
- `notification:new` - New notification
- `job:posted` - New job posted
- `job:updated` - Job updated

**Example:**
```javascript
socket.on('application:updated', (application) => {
  console.log('Application updated:', application);
});
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "errors": [  // For validation errors
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- **Default:** 100 requests per 15 minutes per IP
- **Headers:** Rate limit info in response headers
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

---

## Pagination

List endpoints support pagination:

**Query Params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

---

## File Upload

File uploads use `multipart/form-data`:

**Example:**
```javascript
const formData = new FormData();
formData.append('resume', file);

fetch('/api/students/resume', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});
```

**File Limits:**
- Resume PDF: 10MB max
- Profile Photo: 5MB max
- Supported types: PDF, JPG, PNG

---

**API Version:** 1.0  
**Last Updated:** 2024
