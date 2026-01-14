<?php

namespace App\Services;

use App\Models\LoyaltyPoint;
use App\Models\LoyaltyTransaction;
use App\Models\User;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

class LoyaltyService
{
    /**
     * Award points to user for an order
     */
    public function awardPoints(User $user, Order $order): void
    {
        DB::transaction(function () use ($user, $order) {
            // Calculate points (5% of order amount)
            $pointsToAward = LoyaltyPoint::calculatePointsFromAmount($order->total_amount);

            // Get or create loyalty points record
            $loyaltyPoints = LoyaltyPoint::firstOrCreate(
                ['user_id' => $user->id],
                ['points' => 0, 'total_earned' => 0, 'total_redeemed' => 0]
            );

            // Update points
            $loyaltyPoints->points += $pointsToAward;
            $loyaltyPoints->total_earned += $pointsToAward;
            $loyaltyPoints->save();

            // Create transaction record
            LoyaltyTransaction::create([
                'user_id' => $user->id,
                'order_id' => $order->id,
                'type' => 'earned',
                'points' => $pointsToAward,
                'order_amount' => $order->total_amount,
                'description' => "Earned {$pointsToAward} points from order #{$order->id}",
            ]);

            // Update order with earned points
            $order->update(['loyalty_points_earned' => $pointsToAward]);
        });
    }

    /**
     * Redeem points for discount
     */
    public function redeemPoints(User $user, int $pointsToRedeem): array
    {
        if ($pointsToRedeem < 100) {
            throw new \Exception('Minimum 100 points required for redemption');
        }

        if ($pointsToRedeem % 100 !== 0) {
            throw new \Exception('Points must be in multiples of 100');
        }

        $loyaltyPoints = LoyaltyPoint::where('user_id', $user->id)->first();

        if (!$loyaltyPoints || !$loyaltyPoints->canRedeem($pointsToRedeem)) {
            throw new \Exception('Insufficient points for redemption');
        }

        $discount = LoyaltyPoint::calculateDiscountFromPoints($pointsToRedeem);

        return [
            'points_to_redeem' => $pointsToRedeem,
            'discount_amount' => $discount,
            'remaining_points' => $loyaltyPoints->points - $pointsToRedeem,
        ];
    }

    /**
     * Apply redeemed points to order
     */
    public function applyPointsToOrder(User $user, int $pointsToRedeem): void
    {
        DB::transaction(function () use ($user, $pointsToRedeem) {
            $loyaltyPoints = LoyaltyPoint::where('user_id', $user->id)->lockForUpdate()->first();

            if (!$loyaltyPoints || !$loyaltyPoints->canRedeem($pointsToRedeem)) {
                throw new \Exception('Insufficient points for redemption');
            }

            $discount = LoyaltyPoint::calculateDiscountFromPoints($pointsToRedeem);

            // Deduct points
            $loyaltyPoints->points -= $pointsToRedeem;
            $loyaltyPoints->total_redeemed += $pointsToRedeem;
            $loyaltyPoints->save();

            // Create transaction record
            LoyaltyTransaction::create([
                'user_id' => $user->id,
                'type' => 'redeemed',
                'points' => -$pointsToRedeem,
                'description' => "Redeemed {$pointsToRedeem} points for \${$discount} discount",
            ]);
        });
    }

    /**
     * Get user's loyalty points balance
     */
    public function getBalance(User $user): array
    {
        $loyaltyPoints = LoyaltyPoint::where('user_id', $user->id)->first();

        if (!$loyaltyPoints) {
            return [
                'points' => 0,
                'total_earned' => 0,
                'total_redeemed' => 0,
                'available_discount' => 0,
                'can_redeem' => false,
            ];
        }

        $availableDiscount = LoyaltyPoint::calculateDiscountFromPoints($loyaltyPoints->points);

        return [
            'points' => $loyaltyPoints->points,
            'total_earned' => $loyaltyPoints->total_earned,
            'total_redeemed' => $loyaltyPoints->total_redeemed,
            'available_discount' => $availableDiscount,
            'can_redeem' => $loyaltyPoints->points >= 100,
        ];
    }

    /**
     * Get user's loyalty transaction history
     */
    public function getTransactionHistory(User $user, int $limit = 50): array
    {
        $transactions = LoyaltyTransaction::where('user_id', $user->id)
            ->with('order')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return $transactions->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'points' => $transaction->points,
                'order_id' => $transaction->order_id,
                'order_amount' => $transaction->order_amount,
                'description' => $transaction->description,
                'created_at' => $transaction->created_at->toISOString(),
            ];
        })->toArray();
    }
}
