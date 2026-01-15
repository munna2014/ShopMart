<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Exception;

class HealthCheckController extends Controller
{
    public function check()
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'storage' => $this->checkStorage(),
            'mail' => $this->checkMail(),
        ];

        $allHealthy = collect($checks)->every(fn($check) => $check['status'] === 'healthy');
        $status = $allHealthy ? 'healthy' : 'unhealthy';

        return response()->json([
            'status' => $status,
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ], $allHealthy ? 200 : 503);
    }

    private function checkDatabase()
    {
        try {
            DB::connection()->getPdo();
            DB::connection()->getDatabaseName();
            return [
                'status' => 'healthy',
                'message' => 'Database connection successful',
            ];
        } catch (Exception $e) {
            return [
                'status' => 'unhealthy',
                'message' => 'Database connection failed: ' . $e->getMessage(),
            ];
        }
    }

    private function checkCache()
    {
        try {
            $key = 'health_check_' . time();
            Cache::put($key, 'test', 10);
            $value = Cache::get($key);
            Cache::forget($key);
            
            if ($value === 'test') {
                return [
                    'status' => 'healthy',
                    'message' => 'Cache is working',
                ];
            }
            
            return [
                'status' => 'unhealthy',
                'message' => 'Cache read/write failed',
            ];
        } catch (Exception $e) {
            return [
                'status' => 'unhealthy',
                'message' => 'Cache error: ' . $e->getMessage(),
            ];
        }
    }

    private function checkStorage()
    {
        try {
            $testFile = 'health_check_' . time() . '.txt';
            Storage::put($testFile, 'test');
            $exists = Storage::exists($testFile);
            Storage::delete($testFile);
            
            if ($exists) {
                return [
                    'status' => 'healthy',
                    'message' => 'Storage is working',
                ];
            }
            
            return [
                'status' => 'unhealthy',
                'message' => 'Storage write/read failed',
            ];
        } catch (Exception $e) {
            return [
                'status' => 'unhealthy',
                'message' => 'Storage error: ' . $e->getMessage(),
            ];
        }
    }

    private function checkMail()
    {
        try {
            $config = config('mail');
            if (empty($config['mailers']['smtp']['host'])) {
                return [
                    'status' => 'warning',
                    'message' => 'Mail not configured',
                ];
            }
            
            return [
                'status' => 'healthy',
                'message' => 'Mail configuration present',
            ];
        } catch (Exception $e) {
            return [
                'status' => 'unhealthy',
                'message' => 'Mail check failed: ' . $e->getMessage(),
            ];
        }
    }
}
