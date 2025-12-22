<?php

namespace App\Http\Controllers;

use App\Models\UserAddress;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AddressController extends Controller
{
    /**
     * Get all addresses for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $addresses = UserAddress::forUser($request->user()->id)
                ->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $addresses,
                'message' => 'Addresses retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve addresses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new address
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'type' => 'required|string|in:home,work,other',
                'full_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'address_line_1' => 'required|string|max:255',
                'address_line_2' => 'nullable|string|max:255',
                'city' => 'required|string|max:100',
                'state_province' => 'required|string|max:100',
                'postal_code' => 'required|string|max:20',
                'country' => 'required|string|max:100',
                'is_default' => 'boolean',
            ]);

            $validatedData['user_id'] = $request->user()->id;

            // If this is set as default, or if it's the user's first address, make it default
            $userAddressCount = UserAddress::forUser($request->user()->id)->count();
            if ($userAddressCount === 0 || ($validatedData['is_default'] ?? false)) {
                $validatedData['is_default'] = true;
            }

            $address = UserAddress::create($validatedData);

            // If this address is set as default, update other addresses
            if ($address->is_default) {
                $address->setAsDefault();
            }

            return response()->json([
                'status' => 'success',
                'data' => $address,
                'message' => 'Address created successfully'
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create address',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified address
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $address = UserAddress::forUser($request->user()->id)->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $address,
                'message' => 'Address retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Address not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified address
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $address = UserAddress::forUser($request->user()->id)->findOrFail($id);

            $validatedData = $request->validate([
                'type' => 'sometimes|required|string|in:home,work,other',
                'full_name' => 'sometimes|required|string|max:255',
                'phone' => 'sometimes|required|string|max:20',
                'address_line_1' => 'sometimes|required|string|max:255',
                'address_line_2' => 'nullable|string|max:255',
                'city' => 'sometimes|required|string|max:100',
                'state_province' => 'sometimes|required|string|max:100',
                'postal_code' => 'sometimes|required|string|max:20',
                'country' => 'sometimes|required|string|max:100',
                'is_default' => 'boolean',
            ]);

            $address->update($validatedData);

            // If this address is set as default, update other addresses
            if ($address->is_default) {
                $address->setAsDefault();
            }

            return response()->json([
                'status' => 'success',
                'data' => $address->fresh(),
                'message' => 'Address updated successfully'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update address',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified address
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $address = UserAddress::forUser($request->user()->id)->findOrFail($id);
            
            // If this was the default address, make another address default
            if ($address->is_default) {
                $nextAddress = UserAddress::forUser($request->user()->id)
                    ->where('id', '!=', $id)
                    ->first();
                
                if ($nextAddress) {
                    $nextAddress->setAsDefault();
                }
            }

            $address->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Address deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete address',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Set an address as default
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        try {
            $address = UserAddress::forUser($request->user()->id)->findOrFail($id);
            $address->setAsDefault();

            return response()->json([
                'status' => 'success',
                'data' => $address->fresh(),
                'message' => 'Address set as default successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to set address as default',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
