# Security Specification & Threat Model (TDD)

## 1. Data Invariants
- **User Record Authenticity**: A user profile document (`/users/{userId}`) can only be created or modified by the owner whose Firebase Auth UID matches `{userId}`.
- **Strict Size/Type Bounds**: All textual fields (name, email, plate, company, CPF, origin, destination) must be strictly validated for maximum length and correct types to prevent Denial of Wallet and Resource Poisoning attacks.
- **Operational Status / Immutability**: Critical profile identifiers (uid, cpf, email, createdAt) must be protected from random mutation or cross-user overwriting.

---

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: Privilege Escalation (Setting another user's profile)
- **Path**: `/users/legit-user-id`
- **Auth**: `{ uid: "attacker-user-id", email: "attacker@attacker.com" }`
- **Action**: Create / Write
- **Expected**: `PERMISSION_DENIED`

### Payload 2: Hostile ID Poisoning (Massive document ID string size)
- **Path**: `/users/extremely-long-hostile-id-designed-to-poison-the-database-indexes-and-drain-the-owners-wallet-with-billions-of-reads-and-writes-aaaaaaaaa`
- **Auth**: `{ uid: "attacker-user-id" }`
- **Action**: Create
- **Expected**: `PERMISSION_DENIED`

### Payload 3: Spoofed Identity (Injecting another user's email)
- **Path**: `/users/victim-user-id`
- **Auth**: `{ uid: "victim-user-id", email: "attacker@attacker.com" }`
- **Payload**: `{ uid: "victim-user-id", email: "admin@port.com", name: "Spoofer", cpf: "123.456.789-00" }`
- **Action**: Create
- **Expected**: `PERMISSION_DENIED` (Email in payload must match auth token)

### Payload 4: Invalid Email Verification State
- **Path**: `/users/verified-only-user-id`
- **Auth**: `{ uid: "verified-only-user-id", email: "driver@driver.com", email_verified: false }`
- **Action**: Create
- **Expected**: `PERMISSION_DENIED` (If verification is strictly required)

### Payload 5: Missing Required Schema Fields (Missing CPF)
- **Path**: `/users/user-123`
- **Auth**: `{ uid: "user-123", email: "driver@driver.com" }`
- **Payload**: `{ uid: "user-123", name: "João", email: "driver@driver.com" }`
- **Action**: Create
- **Expected**: `PERMISSION_DENIED`

### Payload 6: Field Size Overflow Attack (1MB Name)
- **Path**: `/users/user-123`
- **Auth**: `{ uid: "user-123", email: "driver@driver.com" }`
- **Payload**: `{ uid: "user-123", name: "A..." (100,000 characters), email: "driver@driver.com", cpf: "123" }`
- **Action**: Create
- **Expected**: `PERMISSION_DENIED`

### Payload 7: Shadow Update / Ghost Field Injection
- **Path**: `/users/user-123`
- **Auth**: `{ uid: "user-123", email: "driver@driver.com" }`
- **Existing**: `{ uid: "user-123", name: "João", email: "driver@driver.com", cpf: "123" }`
- **Payload**: `{ uid: "user-123", name: "João", email: "driver@driver.com", cpf: "123", isAdmin: true }`
- **Action**: Update
- **Expected**: `PERMISSION_DENIED` (Ghost fields blocked by validation size limit and diff check)

### Payload 8: Illegal Multi-Key Mass Update (Overwriting Name and Plate in same update)
- **Path**: `/users/user-123`
- **Auth**: `{ uid: "user-123" }`
- **Payload**: `{ uid: "user-123", name: "New Name", plate: "XYZ-9999", email: "driver@driver.com", cpf: "123" }`
- **Action**: Update (violating affectedKeys)
- **Expected**: `PERMISSION_DENIED`

### Payload 9: Malicious Appointment Status Manipulation
- **Path**: `/users/user-123`
- **Auth**: `{ uid: "user-123" }`
- **Payload**: `{ ..., lastAppointment: { origin: "X", destination: "Y", date: "D", time: "T", status: "super-user-hacker" } }`
- **Action**: Update
- **Expected**: `PERMISSION_DENIED`

### Payload 10: Coordinate Value Type Poisoning (String in Latitude)
- **Path**: `/users/user-123`
- **Auth**: `{ uid: "user-123" }`
- **Payload**: `{ ..., lastOriginCoords: { lat: "not-a-number", lng: -46.22, name: "Santos Port" } }`
- **Action**: Update
- **Expected**: `PERMISSION_DENIED`

### Payload 11: Bulk Database Scraping (Blanket Reads)
- **Path**: `/users`
- **Auth**: `{ uid: "random-user-id" }`
- **Action**: List (without querying own user ID)
- **Expected**: `PERMISSION_DENIED`

### Payload 12: Orphaned/Unsigned Writes
- **Path**: `/users/user-123`
- **Auth**: `null` (Anonymous or unauthenticated)
- **Action**: Create
- **Expected**: `PERMISSION_DENIED`

---

## 3. Test Runner Definition (`firestore.rules.test.ts`)

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "amazing-epoch-mv8b6",
    firestore: {
      rules: require("fs").readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("SmartLine Firestore Security Rules", () => {
  it("denies unauthenticated writes", async () => {
    const context = testEnv.unauthenticatedContext();
    const db = context.firestore();
    await assertFails(setDoc(doc(db, "users/test-user"), { uid: "test-user", name: "Hack" }));
  });

  it("denies access to other users profile data", async () => {
    const context = testEnv.authenticatedContext("attacker-id");
    const db = context.firestore();
    await assertFails(getDoc(doc(db, "users/victim-id")));
  });

  it("allows owner to fetch their own profile", async () => {
    const context = testEnv.authenticatedContext("driver-123");
    const db = context.firestore();
    await assertSucceeds(getDoc(doc(db, "users/driver-123")));
  });
});
```
