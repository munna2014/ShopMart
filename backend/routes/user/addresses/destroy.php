<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AddressController;

Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);
Route::post('/addresses/{id}/set-default', [AddressController::class, 'setDefault']);
