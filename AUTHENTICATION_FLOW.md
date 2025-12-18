# Authentication & Data Flow Documentation

## ShopMart: Next.js + Laravel Sanctum + MySQL

This document details the complete flow of data for user registration, login, and session management using JWT Tokens (Sanctum) between the Frontend (Next.js) and Backend (Laravel).

### 1. User Registration Flow (Adding User to Database)

**Goal:** Create a new user in the MySQL database from the Next.js frontend.

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

#### **Step 3: Database Insertion (Laravel Controller)**

The `AuthController` validates and creates the user in MySQL:

```php
// backend/app/Http/Controllers/AuthController.php
public function register(Request $request) {
    // 1. Validate Input
    $fields = $request->validate([...]);

    // 2. Insert into 'users' table in MySQL
    $user = User::create([
        'name' => $fields['name'],
        'email' => $fields['email'],
        'password' => bcrypt($fields['password']) // Password is hashed!
    ]);

    // 3. Create Token (Session)
    $token = $user->createToken('myapptoken')->plainTextToken;

    // 4. Return Data to Frontend
    return response()->json(['user' => $user, 'token' => $token], 201);
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

**Users Table (`users`)**
| id | name | email | password (hashed) |
|---|---|---|---|
| 1 | John | john@ex.. | $2y$10$... |

**Tokens Table (`personal_access_tokens`)**
| id | tokenable_id (User ID) | token (hashed) | last_used_at |
|---|---|---|---|
| 5 | 1 | 8f3g9a... | 2024-12-17... |

_The link between Next.js and MySQL is entirely managed via these secure Tokens._
