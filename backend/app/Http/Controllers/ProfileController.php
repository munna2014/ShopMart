<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Update user profile
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $validatedData = $request->validate([
                'full_name' => 'sometimes|required|string|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
                'date_of_birth' => 'sometimes|nullable|date|before:today',
            ]);

            $user->update($validatedData);

            return response()->json([
                'status' => 'success',
                'data' => $user,
                'message' => 'Profile updated successfully'
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
                'message' => 'Failed to update profile',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload profile avatar
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max
            ]);

            $user = $request->user();

            // Delete old avatar if exists
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            // Store new avatar
            $avatarPath = $request->file('avatar')->store('avatars', 'public');

            // Update user avatar
            $user->update(['avatar' => $avatarPath]);

            // Generate full URL
            $avatarUrl = url('storage/' . $avatarPath);

            return response()->json([
                'status' => 'success',
                'data' => [
                    'avatar' => $avatarPath,
                    'avatar_url' => $avatarUrl
                ],
                'message' => 'Avatar uploaded successfully'
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
                'message' => 'Failed to upload avatar',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete profile avatar
     */
    public function deleteAvatar(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Delete avatar file if exists
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }

            // Remove avatar from user
            $user->update(['avatar' => null]);

            return response()->json([
                'status' => 'success',
                'message' => 'Avatar deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete avatar',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $validatedData = $request->validate([
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:8',
                'new_password_confirmation' => 'required|string|same:new_password',
            ]);

            // Verify current password
            if (!password_verify($validatedData['current_password'], $user->password_hash)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Current password is incorrect',
                    'errors' => ['current_password' => ['Current password is incorrect']]
                ], 422);
            }

            // Update password
            $user->update([
                'password_hash' => bcrypt($validatedData['new_password'])
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Password updated successfully'
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
                'message' => 'Failed to update password',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
