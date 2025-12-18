<?php
// Test OTP registration and verification flow

echo "=== ShopMart OTP Registration Flow Test ===\n\n";

// Generate unique test data
$timestamp = time();
$testEmail = "otptest{$timestamp}@example.com";
$testName = "OTP Test User {$timestamp}";
$testPassword = "password123";

echo "Step 1: Registering new user with OTP flow...\n";
echo "Email: {$testEmail}\n";

// Test registration
$registrationData = [
    'name' => $testName,
    'email' => $testEmail,
    'password' => $testPassword,
    'password_confirmation' => $testPassword
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://webserver/api/register');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($registrationData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Host: localhost'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Registration HTTP Code: {$httpCode}\n";
echo "Registration Response: {$response}\n";

if ($httpCode === 201) {
    echo "✓ Registration successful! User should receive OTP email.\n\n";
    
    // Get OTP from database
    echo "Step 2: Retrieving OTP from database...\n";
    
    try {
        $pdo = new PDO('mysql:host=db;dbname=Next-laravel', 'laravel', 'root');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Get user ID
        $stmt = $pdo->prepare("SELECT id, is_active FROM users WHERE email = ?");
        $stmt->execute([$testEmail]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            echo "User ID: {$user['id']}, Active: " . ($user['is_active'] ? 'Yes' : 'No') . "\n";
            
            // Get latest OTP
            $stmt = $pdo->prepare("SELECT code, expires_at, used_at FROM otp_codes WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$user['id']]);
            $otpRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($otpRecord) {
                $otp = $otpRecord['code'];
                echo "✓ OTP Retrieved: {$otp}\n";
                echo "Expires at: {$otpRecord['expires_at']}\n\n";
                
                // Test OTP verification
                echo "Step 3: Verifying OTP...\n";
                
                $verifyData = [
                    'email' => $testEmail,
                    'code' => $otp
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, 'http://webserver/api/verify-otp');
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($verifyData));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'Host: localhost'
                ]);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                
                $verifyResponse = curl_exec($ch);
                $verifyHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                echo "Verify HTTP Code: {$verifyHttpCode}\n";
                echo "Verify Response: {$verifyResponse}\n";
                
                if ($verifyHttpCode === 200) {
                    echo "✓ OTP Verification successful!\n\n";
                    
                    $verifyData = json_decode($verifyResponse, true);
                    $token = $verifyData['token'] ?? null;
                    
                    if ($token) {
                        echo "Token: " . substr($token, 0, 20) . "...\n\n";
                        
                        // Test login after verification
                        echo "Step 4: Testing login after verification...\n";
                        
                        $loginData = [
                            'email' => $testEmail,
                            'password' => $testPassword
                        ];
                        
                        $ch = curl_init();
                        curl_setopt($ch, CURLOPT_URL, 'http://webserver/api/login');
                        curl_setopt($ch, CURLOPT_POST, true);
                        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($loginData));
                        curl_setopt($ch, CURLOPT_HTTPHEADER, [
                            'Content-Type: application/json',
                            'Host: localhost'
                        ]);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        
                        $loginResponse = curl_exec($ch);
                        $loginHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);
                        
                        echo "Login HTTP Code: {$loginHttpCode}\n";
                        echo "Login Response: {$loginResponse}\n";
                        
                        if ($loginHttpCode === 201) {
                            echo "✓ Login successful after verification!\n\n";
                            echo "=== All OTP flow tests passed! ===\n";
                        } else {
                            echo "✗ Login failed after verification\n";
                        }
                    }
                } else {
                    echo "✗ OTP Verification failed\n";
                }
            } else {
                echo "✗ No OTP found for user\n";
            }
        } else {
            echo "✗ User not found in database\n";
        }
    } catch (Exception $e) {
        echo "✗ Database Error: " . $e->getMessage() . "\n";
    }
} else {
    echo "✗ Registration failed\n";
}
?>