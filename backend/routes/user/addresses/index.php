<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AddressController;

Route::get('/addresses', [AddressController::class, 'index']);
