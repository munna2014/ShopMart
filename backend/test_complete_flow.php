<?php
// Test complete OTP registration flow

echo "=== Testing Complete OTP Registration Flow ===\n\n";

// Generate unique test data
$timestamp = time();
$testEmail = "flowtest{$timestamp}@example.com";
$testName = "Flow Test User {$timestamp}";
$testPassword = "password123";

echo "Step 1: Testing Registration with OTP...\n";
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
    echo "✓ Registration successful!\n\n";
    
    // Check if OTP was created
    echo "Step 2: Checking OTP creation...\n";
    
    try {
        $pdo = new PDO('mysql:host=db;dbname=Next-laravel', 'laravel', 'root');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Get user
        $stmt = $pdo->prepare("SELECT id, is_active FROM users WHERE email = ?");
        $stmt->execute([$testEmail]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            echo "User created - ID: {$user['id']}, Active: " . ($user['is_active'] ? 'Yes' : 'No') . "\n";
            
            // Get OTP
            $stmt = $pdo->prepare("SELECT code, expires_at FROM otp_codes WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$user['id']]);
            $otpRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($otpRecord) {
                $otp = $otpRecord['code'];
                echo "✓ OTP Created: {$otp}\n";
                echo "Expires at: {$otpRecord['expires_at']}\n\n";
                
                echo "Step 3: Testing OTP Verification...\n";
                
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
                    echo "=== Complete Flow Test PASSED! ===\n";
                } else {
                    echo "✗ OTP Verification failed\n";
                }
            } else {
                echo "✗ No OTP found\n";
            }
        } else {
            echo "✗ User not created\n";
        }
    } catch (Exception $e) {
        echo "✗ Database Error: " . $e->getMessage() . "\n";
    }
} else {
    echo "✗ Registration failed\n";
}
?>