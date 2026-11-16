# Nepal Patro Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document under `/users/{userId}/...` can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Identity Integrity**: Every `UserProfile.uid`, `UserNote.ownerUid`, and `UserPreferences.ownerUid` must strictly match `request.auth.uid` on create and remain immutable on update.
3. **PII Isolation**: User email and display details are stored exclusively under `/users/{userId}/profile/info` and are never readable by any other authenticated or unauthenticated client.
4. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time` (server timestamps). `createdAt` is immutable on updates.
5. **Bounded Payload Sizes & Strict Keys**: Every string has strict `.size()` bounds; `bsKey` must match `^\d{4}-\d{2}-\d{2}$`; `category` must belong to `['personal', 'puja', 'birthday', 'reminder']`; shadow/extra fields are rejected via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.

## 2. Adversarial "Dirty Dozen" Payloads (All Must Fail with PERMISSION_DENIED)
1. Unauthenticated read or write on `/users/user123/notes/note1`.
2. Unverified email user (`email_verified == false`) attempting to create a note.
3. Cross-tenant read (`userA` reading `/users/userB/profile/info` or `/users/userB/notes/note1`).
4. Cross-tenant list (`userA` listing `/users/userB/notes`).
5. Identity spoofing on create (`userA` creating `/users/userA/notes/note1` with `ownerUid: "userB"`).
6. Shadow field injection on create (adding `"isAdmin": true` to `UserNote` or `UserProfile`).
7. Shadow field injection on update (adding `"extra": "x"` when updating a `UserNote`).
8. Oversized ID poisoning (creating a note with `noteId` of 200 characters or invalid chars like `note$1`).
9. Oversized string payload (`title` > 120 chars or `note` > 1000 chars).
10. Invalid `bsKey` format (`"2083/07/30"` instead of `"2083-07-30"`).
11. Invalid `category` value (`"system"` instead of `['personal', 'puja', 'birthday', 'reminder']`).
12. Client-forged `createdAt` or mutating `createdAt`/`ownerUid` during an update.
