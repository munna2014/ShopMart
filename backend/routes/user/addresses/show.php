<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AddressController;

Route::get('/addresses/{address}', [AddressController::class, 'show']);
