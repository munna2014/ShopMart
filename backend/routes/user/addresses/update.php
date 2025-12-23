<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AddressController;

Route::put('/addresses/{address}', [AddressController::class, 'update']);
Route::patch('/addresses/{address}', [AddressController::class, 'update']);
