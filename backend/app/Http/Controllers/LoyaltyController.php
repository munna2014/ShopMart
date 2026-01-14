<?php

namespace App\Http\Controllers;

use App\Services\LoyaltyService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LoyaltyController extends Controller
{
    protected $loyaltyService;

    public function __construct(LoyaltyService $loyaltyService)
    {
        $this->loyaltyService = $loyaltyService;
    }

    /**
     * Get user's loyalty points balance
     */
    public function getBalance(Request $request): JsonResponse
    {
        try {
            $balance = $this->loyaltyService->getBalance($request->user());

            return response()->json([
                'status' => 'success',
                'data' => $balance,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get loyalty transaction history
     */
    public function getHistory(Request $request): JsonResponse
    {
        try {
            $limit = $request->input('limit', 50);
            $transactions = $this->loyaltyService->getTransactionHistory($request->user(), $limit);

            return response()->json([
                'status' => 'success',
                'transactions' => $transactions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Calculate redemption preview
     */
    public function calculateRedemption(Request $request): JsonResponse
    {
        $request->validate([
            'points' => 'required|integer|min:100',
        ]);

        try {
            $result = $this->loyaltyService->redeemPoints(
                $request->user(),
                $request->input('points')
            );

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}

