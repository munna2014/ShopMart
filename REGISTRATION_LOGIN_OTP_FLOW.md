# ShopMart Authentication System Documentation

## Complete Registration & Login Flow with OTP Verification

This document explains the complete authentication system including registration, OTP verification, login, and password reset functionality.

---

## 🔐 System Overview

The ShopMart authentication system uses a **secure two-step verification process**:

1. **Registration** → User stored in `pending_users` table
2. **Email OTP Verification** → User moved to main `users` table
3. **Login** → Only verified users can login
4. **Password Reset** → Email OTP verification required

---

## 📊 Database Schema

### Tables Used

#### 1. `pending_users` (Temporary Storage)
```sql
CREATE TABLE pending_users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL
);
```

#### 2. `users` (Verified Users Only)
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. `otp_codes` (OTP Management)
```sql
CREATE TABLE otp_codes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    pending_user_id BIGINT NULL,
    code VARCHAR(100) NOT NULL,
    purpose ENUM('LOGIN', 'PASSWORD_RESET', 'GENERAL', 'RESET_TOKEN'),
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pending_user_id) REFERENCES pending_users(id) ON DELETE CASCADE
);
```

#### 4. `personal_access_tokens` (Session Management)
```sql
CREATE TABLE personal_access_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🚀 Registration Flow

### Step 1: User Registration Request

**Frontend:** `/register` page
**File:** `frontend/app/register/page.js`

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const response = await api.post("/register", {
    name: formData.name,
    email: formData.email,
    password: formData.password,
    password_confirmation: formData.password_confirmation,
  });
  
  // Redirect to OTP verification
  router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
};
```

### Step 2: Backend Registration Processing

**API Endpoint:** `POST /api/register`
**File:** `backend/app/Http/Controllers/AuthController.php`

```php
public function register(Request $request)
{
    // 1. Validate input
    $fields = $request->validate([
        'name' => 'required|string',
        'email' => 'required|string|email|unique:users,email|unique:pending_users,email',
        'password' => 'required|string|confirmed'
    ]);

    // 2. Create PENDING user (NOT in main users table yet)
    $pendingUser = \App\Models\PendingUser::create([
        'full_name' => $fields['name'],
        'email' => $fields['email'],
        'password_hash' => bcrypt($fields['password']),
        'expires_at' => now()->addHours(24) // Expires in 24 hours
    ]);

    // 3. Generate 6-digit OTP
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // 4. Store OTP linked to pending user
    \App\Models\OtpCode::create([
        'pending_user_id' => $pendingUser->id,
        'code' => $otp,
        'purpose' => 'GENERAL',
        'expires_at' => now()->addMinutes(2) // 2-minute expiry
    ]);

    // 5. Send OTP email
    Mail::to($pendingUser->email)->send(new OtpEmail($otp, $pendingUser->full_name));

    return response()->json([
        'message' => 'Registration successful. Please check your email for verification code.',
        'email' => $pendingUser->email,
    ], 201);
}
```

**Database Operations:**
1. ✅ Insert into `pending_users` table
2. ✅ Insert OTP into `otp_codes` table
3. ✅ Send email with OTP
4. ❌ **NO insertion into main `users` table yet**

### Step 3: OTP Verification

**Frontend:** `/verify-otp` page
**File:** `frontend/app/verify-otp/page.js`

```javascript
const handleOtpSubmit = async (e) => {
  e.preventDefault();
  
  const response = await api.post("/verify-otp", {
    email: email,
    code: otp,
  });
  
  // Store token and redirect to customer dashboard
  localStorage.setItem("token", response.data.token);
  router.push("/components/customer");
};
```

### Step 4: Backend OTP Verification & User Creation

**API Endpoint:** `POST /api/verify-otp`
**File:** `backend/app/Http/Controllers/AuthController.php`

```php
public function verifyOtp(Request $request)
{
    // 1. Find pending user
    $pendingUser = \App\Models\PendingUser::where('email', $request->email)->first();
    
    if ($pendingUser) {
        // 2. Check if expired
        if ($pendingUser->isExpired()) {
            $pendingUser->delete();
            return response()->json(['message' => 'Registration has expired. Please register again.'], 422);
        }

        // 3. Validate OTP
        $otpCode = \App\Models\OtpCode::where('pending_user_id', $pendingUser->id)
            ->where('code', $request->code)
            ->where('purpose', 'GENERAL')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$otpCode) {
            return response()->json(['message' => 'Invalid or expired OTP'], 422);
        }

        // 4. Mark OTP as used
        $otpCode->markAsUsed();
        
        // 5. MOVE TO MAIN USERS TABLE (This is when user is actually created!)
        $user = $pendingUser->moveToUsers();
        
        // 6. Create session token
        $token = $user->createToken('myapptoken')->plainTextToken;

        return response()->json([
            'message' => 'Email verified successfully',
            'user' => $user,
            'token' => $token
        ], 200);
    }
}
```

**Database Operations:**
1. ✅ Find pending user in `pending_users`
2. ✅ Validate OTP in `otp_codes`
3. ✅ Mark OTP as used (`used_at = now()`)
4. ✅ **INSERT into main `users` table**
5. ✅ **DELETE from `pending_users` table**
6. ✅ Create session token in `personal_access_tokens`

---

## 🔑 Login Flow

### Step 1: User Login Request

**Frontend:** `/login` page
**File:** `frontend/app/login/page.js`

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const response = await api.post("/login", { email, password });
  
  // Store token in both localStorage and cookies
  const token = response.data.token;
  localStorage.setItem("token", token);
  document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  
  router.push("/components/customer");
};
```

### Step 2: Backend Login Processing

**API Endpoint:** `POST /api/login`
**File:** `backend/app/Http/Controllers/AuthController.php`

```php
public function login(Request $request)
{
    $fields = $request->validate([
        'email' => 'required|email',
        'password' => 'required|string'
    ]);

    // 1. Find user in MAIN users table only
    $user = \App\Models\User::where('email', $fields['email'])->first();

    // 2. Check password
    if (!$user || !\Illuminate\Support\Facades\Hash::check($fields['password'], $user->password)) {
        return response()->json(['message' => 'Bad creds'], 401);
    }

    // 3. Check if user is verified
    if (!$user->is_active) {
        return response()->json([
            'message' => 'Please verify your email before logging in.',
            'not_verified' => true
        ], 403);
    }

    // 4. Create session token
    $token = $user->createToken('myapptoken')->plainTextToken;

    return response()->json([
        'user' => $user,
        'token' => $token
    ], 201);
}
```

**Database Operations:**
1. ✅ Query `users` table (NOT `pending_users`)
2. ✅ Verify password hash
3. ✅ Check `is_active` status
4. ✅ Create session token in `personal_access_tokens`

---

## 🔄 Password Reset Flow

### Step 1: Forgot Password Request

**Frontend:** `/forgot-password` page
**File:** `frontend/app/forgot-password/page.js`

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const response = await api.post("/forgot-password", { email });
  
  // Redirect to reset password page
  router.push(`/reset-password?email=${encodeURIComponent(email)}`);
};
```

### Step 2: Backend Password Reset OTP

**API Endpoint:** `POST /api/forgot-password`

```php
public function forgotPassword(Request $request)
{
    // 1. Find verified user
    $user = \App\Models\User::where('email', $request->email)->first();

    // 2. Generate password reset OTP
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    \App\Models\OtpCode::create([
        'user_id' => $user->id,
        'code' => $otp,
        'purpose' => 'PASSWORD_RESET',
        'expires_at' => now()->addMinutes(2)
    ]);

    // 3. Send reset email
    Mail::to($user->email)->send(new OtpEmail($otp, $user->full_name, 'Password Reset'));
}
```

### Step 3: Reset Password Verification

**API Endpoint:** `POST /api/verify-reset-otp`

```php
public function verifyResetOtp(Request $request)
{
    // 1. Validate reset OTP
    $otpCode = \App\Models\OtpCode::where('user_id', $user->id)
        ->where('code', $request->code)
        ->where('purpose', 'PASSWORD_RESET')
        ->whereNull('used_at')
        ->where('expires_at', '>', now())
        ->first();

    // 2. Generate reset token
    $resetToken = bin2hex(random_bytes(32));
    
    \App\Models\OtpCode::create([
        'user_id' => $user->id,
        'code' => $resetToken,
        'purpose' => 'RESET_TOKEN',
        'expires_at' => now()->addMinutes(15)
    ]);

    return response()->json(['reset_token' => $resetToken]);
}
```

### Step 4: Update Password

**API Endpoint:** `POST /api/reset-password`

```php
public function resetPassword(Request $request)
{
    // 1. Verify reset token
    $resetToken = \App\Models\OtpCode::where('user_id', $user->id)
        ->where('code', $request->reset_token)
        ->where('purpose', 'RESET_TOKEN')
        ->whereNull('used_at')
        ->where('expires_at', '>', now())
        ->first();

    // 2. Update password in users table
    $user->password_hash = bcrypt($request->password);
    $user->save();

    // 3. Revoke all existing tokens for security
    $user->tokens()->delete();
}
```

---

## 🛡️ Security Features

### 1. **Two-Table System**
- **Pending users** → Temporary storage until verification
- **Main users** → Only verified users

### 2. **OTP Security**
- ⏰ **2-minute expiration** for all OTPs
- 🔒 **Single-use** OTPs (marked as used)
- 🎯 **Purpose-specific** OTPs (registration, password reset)

### 3. **Token Management**
- 🔑 **Laravel Sanctum** for session management
- 🚫 **Token revocation** after password reset
- ⏳ **Automatic cleanup** of expired tokens

### 4. **Data Protection**
- 🔐 **Password hashing** with bcrypt
- 📧 **Email verification** required
- 🗑️ **Automatic cleanup** of expired pending users (24h)

---

## 📁 File Structure

### Frontend Files
```
frontend/app/
├── register/page.js          # Registration form
├── verify-otp/page.js        # OTP verification
├── login/page.js             # Login form
├── forgot-password/page.js   # Password reset request
├── reset-password/page.js    # Password reset form
└── components/customer/page.js # Protected dashboard
```

### Backend Files
```
backend/
├── app/Http/Controllers/AuthController.php  # Main auth logic
├── app/Models/
│   ├── User.php              # Main users model
│   ├── PendingUser.php       # Temporary users model
│   └── OtpCode.php           # OTP management
├── app/Mail/OtpEmail.php     # Email template
├── resources/views/emails/otp.blade.php  # Email HTML
└── routes/api.php            # API endpoints
```

---

## 🔗 API Endpoints Summary

| Method | Endpoint | Purpose | Database Operations |
|--------|----------|---------|-------------------|
| `POST` | `/api/register` | Create pending user | Insert `pending_users`, `otp_codes` |
| `POST` | `/api/verify-otp` | Verify & create user | Move to `users`, delete `pending_users` |
| `POST` | `/api/resend-otp` | Resend verification | Update `otp_codes` |
| `POST` | `/api/login` | User authentication | Query `users`, create token |
| `POST` | `/api/forgot-password` | Request password reset | Insert `otp_codes` |
| `POST` | `/api/verify-reset-otp` | Verify reset OTP | Validate & create reset token |
| `POST` | `/api/reset-password` | Update password | Update `users`, delete tokens |
| `GET` | `/api/user` | Get user profile | Query `users` (protected) |
| `POST` | `/api/logout` | End session | Delete tokens |

---

## ⚡ Key Points

1. **Users are NOT added to main database until email verification**
2. **Only verified users can login**
3. **OTPs expire in 2 minutes**
4. **Pending users expire in 24 hours**
5. **Password reset requires email verification**
6. **All tokens revoked after password change**
7. **Automatic cleanup of expired data**

This system ensures maximum security while providing a smooth user experience with proper email verification at every critical step.