<?php

require_once 'vendor/autoload.php';

echo "Testing Password Reset Flow\n";
echo "===========================\n\n";

$testEmail = 'testuser@example.com';

// Test 1: Request password reset
echo "1. Testing forgot password request...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://127.0.0.1:8000/api/forgot-password');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'email' => $testEmail
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

if ($httpCode === 200) {
    echo "✅ Password reset request successful!\n";
    echo "📧 Check your email for the reset code.\n\n";
    
    echo "Next steps:\n";
    echo "1. Check email for 6-digit reset code\n";
    echo "2. Use /api/verify-reset-otp to verify the code\n";
    echo "3. Use /api/reset-password to set new password\n\n";
} else {
    echo "❌ Password reset request failed.\n\n";
}

echo "Test completed!\n";