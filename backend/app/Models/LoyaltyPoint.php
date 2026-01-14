<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyPoint extends Model
{
    protected $fillable = [
        'user_id',
        'points',
        'total_earned',
        'total_redeemed',
    ];

    protected $casts = [
        'points' => 'integer',
        'total_earned' => 'decimal:2',
        'total_redeemed' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class, 'user_id', 'user_id');
    }

    /**
     * Calculate points earned from order amount (5% of order)
     */
    public static function calculatePointsFromAmount(float $amount): int
    {
        return (int) floor($amount * 0.05);
    }

    /**
     * Calculate discount from points (100 points = $10)
     */
    public static function calculateDiscountFromPoints(int $points): float
    {
        return floor($points / 100) * 10;
    }

    /**
     * Check if user has enough points for redemption
     */
    public function canRedeem(int $pointsToRedeem): bool
    {
        return $this->points >= $pointsToRedeem && $pointsToRedeem >= 100;
    }
}
