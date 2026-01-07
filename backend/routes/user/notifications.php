<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerNotificationController;

Route::get('/notifications', [CustomerNotificationController::class, 'index']);
Route::patch('/notifications/{id}/read', [CustomerNotificationController::class, 'markRead']);
Route::patch('/notifications/read-all', [CustomerNotificationController::class, 'markAllRead']);
Route::delete('/notifications', [CustomerNotificationController::class, 'destroyAll']);
Route::delete('/notifications/{id}', [CustomerNotificationController::class, 'destroy']);
