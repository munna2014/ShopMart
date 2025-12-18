# Authentication & Data Flow Documentation

## ShopMart: Next.js + Laravel Sanctum + MySQL

This document details the complete flow of data for user registration, login, and session management using JWT Tokens (Sanctum) between the Frontend (Next.js) and Backend (Laravel).

### 1. User Registration Flow (Email Verification Required)

**Goal:** Create a new user in the MySQL database ONLY after email verification succeeds.

#### **Step 1: Frontend Request (Next.js)**

User enters details in the Register form (`app/register/page.js`).
When the "Create account" button is clicked, `handleSubmit` executes:

```javascript
// frontend/app/register/page.js
const handleSubmit = async (e) => {
  // ... validation logic
  // Sends POST request to Laravel API
  const response = await api.post("/register", {
    name: " ",
    email: " ",
    password: " ",
    password_confirmation: " ",
  });
  // ... handle response
};
```

#### **Step 2: API Route Handling (Laravel)**

Laravel receives the request at `routes/api.php`:   

```php
Route::post('/register', [AuthController::class, 'register']);
```

#### **Step 3: Pending User Creation (Laravel Controller)**

The `AuthController` validates and creates a PENDING user (NOT in main users table):

```php
// backend/app/Http/Controllers/AuthController.php
public function register(Request $request) {
    // 1. Validate Input (including unique email check in both users and pending_users)
    $fields = $request->validate([
        'email' => 'required|string|email|unique:users,email|unique:pending_users,email',
        // ... other fields
    ]);

    // 2. Insert into 'pending_users' table (temporary storage)
    $pendingUser = PendingUser::create([
        'full_name' => $fields['name'],
        'email' => $fields['email'],
        'password_hash' => bcrypt($fields['password']),
        'expires_at' => now()->addHours(24) // Expires in 24 hours
    ]);

    // 3. Generate and send OTP
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    OtpCode::create([
        'pending_user_id' => $pendingUser->id, // Linked to pending user
        'code' => $otp,
        'expires_at' => now()->addMinutes(10)
    ]);

    // 4. Send email with OTP
    Mail::to($pendingUser->email)->send(new OtpEmail($otp, $pendingUser->full_name));

    // 5. Return success (NO token yet, NO user in main table)
    return response()->json([
        'message' => 'Registration successful. Please check your email for verification code.',
        'email' => $pendingUser->email,
    ], 201);
}
```

#### **Step 4: Email Verification (Critical Step)**

User receives OTP via email and submits it through `/api/verify-otp`:

```php
public function verifyOtp(Request $request) {
    // 1. Find pending user by email
    $pendingUser = PendingUser::where('email', $request->email)->first();
    
    // 2. Validate OTP
    $otpCode = OtpCode::where('pending_user_id', $pendingUser->id)
        ->where('code', $request->code)
        ->where('expires_at', '>', now())
        ->first();

    if (!$otpCode) {
        return response()->json(['message' => 'Invalid or expired OTP'], 422);
    }

    // 3. ONLY NOW: Move to main users table
    $user = $pendingUser->moveToUsers(); // Creates user in main table, deletes pending

    // 4. Create session token
    $token = $user->createToken('myapptoken')->plainTextToken;

    return response()->json(['user' => $user, 'token' => $token], 200);
}
```

---

### 2. Login & Token Storage Flow

**Goal:** Authenticate user and start a session using a database-backed token.

#### **Step 1: User Login (Next.js)**

User enters credentials in `app/login/page.js`.
The frontend sends a POST request to `/api/login`.

#### **Step 2: Verification (Laravel)**

Laravel checks the credentials against the MySQL `users` table.

```php
if (!Hash::check($fields['password'], $user->password)) {
    return response(['message' => 'Bad creds'], 401);
}
```

#### **Step 3: Token Generation**

If valid, Laravel generates a **Sanctum Token**:

1.  Creates a new row in `personal_access_tokens` table.
2.  Stores the **hashed** version of the token in the database.
3.  Sends the **plain text** token back to Next.js.

#### **Step 4: Session Storage (Next.js)**

Next.js receives the token and saves it to the Browser's LocalStorage:

```javascript
// frontend/app/login/page.js
localStorage.setItem("token", response.data.token);
```

_This token is now the user's "Session ID"._

---

### 3. Session Validation Flow (Protected Routes)

**Goal:** Verify if a user is logged in before showing the `Customer Profile` page.

#### **Step 1: Page Load (Next.js)**

User visits `/components/customer`. The page runs a check immediately:

```javascript
// frontend/app/components/customer/page.js
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login"); // Redirect if no token found locally
  } else {
    fetchUser(); // Validates token with API
  }
}, []);
```

#### **Step 2: API Request with Token**

Next.js makes a request to get user details, attaching the token in the Header:

```javascript
// Request Headers
Authorization: "Bearer 4|somerandomstring...";
```

#### **Step 3: Database Validation (Laravel)**

Laravel intercepts the request (via `auth:sanctum` middleware):

1.  Extracts the token from the Header.
2.  Hashes it using SHA-256.
3.  **looks up the token in the MySQL `personal_access_tokens` table.**
4.  If found and valid -> Returns User Data.
5.  If not found -> Returns `401 Unauthorized`.

#### **Step 4: Frontend Reaction**

- **Success (200):** Display Customer Profile.
- **Fail (401):** Force Logout (`localStorage.removeItem` + Redirect).

---

### Database Diagram

**Pending Users Table (`pending_users`)** - Temporary storage before verification
| id | full_name | email | password_hash | expires_at |
|---|---|---|---|---|
| 1 | John | john@ex.. | $2y$10$... | 2024-12-19 12:00:00 |

**Users Table (`users`)** - Only verified users
| id | full_name | email | password_hash | is_active |
|---|---|---|---|---|
| 1 | Jane | jane@ex.. | $2y$10$... | true |

**OTP Codes Table (`otp_codes`)**
| id | user_id | pending_user_id | code | expires_at | used_at |
|---|---|---|---|---|---|
| 1 | null | 1 | 123456 | 2024-12-18 12:10:00 | null |
| 2 | 1 | null | 654321 | 2024-12-18 12:15:00 | 2024-12-18 12:05:00 |

**Tokens Table (`personal_access_tokens`)** - Only for verified users
| id | tokenable_id (User ID) | token (hashed) | last_used_at |
|---|---|---|---|
| 5 | 1 | 8f3g9a... | 2024-12-17... |

### Security Benefits

1. **No Database Pollution**: Unverified users don't clutter the main users table
2. **Automatic Cleanup**: Pending users expire after 24 hours
3. **Email Verification Required**: Users MUST verify email before account creation
4. **No Login Without Verification**: Login endpoint only checks main users table
5. **Secure Token Generation**: Tokens only created after successful verification

_The link between Next.js and MySQL is entirely managed via these secure Tokens, but ONLY after email verification._
