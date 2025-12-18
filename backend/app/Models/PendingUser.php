<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingUser extends Model
{
    protected $fillable = [
        'full_name',
        'email',
        'password_hash',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public $timestamps = false; // We only use created_at

    /**
     * OTP codes relationship
     */
    public function otpCodes()
    {
        return $this->hasMany(OtpCode::class, 'pending_user_id');
    }

    /**
     * Check if the pending user has expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at < now();
    }

    /**
     * Move pending user to main users table
     */
    public function moveToUsers(): User
    {
        $user = User::create([
            'full_name' => $this->full_name,
            'email' => $this->email,
            'password_hash' => $this->password_hash,
            'is_active' => true,
        ]);

        // Delete the pending user record
        $this->delete();

        return $user;
    }
}