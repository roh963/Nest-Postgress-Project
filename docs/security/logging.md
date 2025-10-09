# Logging and PII Protection

## Logged Fields
- requestId: UUID per request
- userId: Authenticated user ID
- action: LOGIN_SUCCESS, LOGIN_FAIL, PASSWORD_RESET, FEEDBACK_DELETE
- method, url, status

## Masked Fields
- Authorization headers (JWT tokens)
- req.body.email
- req.body.password

## Audit Trail
- Table: AuditLog
- Fields: id, userId, action, details, requestId, createdAt
- Actions logged: LOGIN_SUCCESS, LOGIN_FAIL, PASSWORD_RESET, FEEDBACK_DELETE