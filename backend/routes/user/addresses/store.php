<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AddressController;

Route::post('/addresses', [AddressController::class, 'store']);
