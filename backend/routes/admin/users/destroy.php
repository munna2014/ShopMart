<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::delete('/admin/users/{id}', function (Request $request, $id) {
    $user = \App\Models\User::findOrFail($id);

    // Prevent deleting yourself
    if ($user->id === $request->user()->id) {
        return response()->json(['message' => 'You cannot delete your own account'], 403);
    }

    // Prevent deleting other admins
    if ($user->hasRole('admin')) {
        return response()->json(['message' => 'You cannot delete admin users'], 403);
    }

    $user->delete();

    return response()->json(['message' => 'User deleted successfully']);
});
