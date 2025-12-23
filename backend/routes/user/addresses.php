<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AddressController;

Route::apiResource('addresses', AddressController::class);
Route::post('/addresses/{id}/set-default', [AddressController::class, 'setDefault']);
