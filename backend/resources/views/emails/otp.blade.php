<!DOCTYPE html>
<html>
<head>
    <title>Email Verification</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #059669; font-size: 28px; margin: 0; font-weight: bold;">ShopMart</h1>
                <p style="color: #666; margin: 5px 0 0 0;">{{ $purpose }}</p>
            </div>

            <!-- Content -->
            @if($purpose === 'Password Reset')
                <h2 style="color: #059669; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Hi {{ $userName }},</p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                    We received a request to reset your password for your ShopMart account. 
                    Please use the following 6-digit code to proceed with password reset:
                </p>
            @else
                <h2 style="color: #059669; text-align: center; margin-bottom: 20px;">Welcome to ShopMart!</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">Hi {{ $userName }},</p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                    Thank you for registering with ShopMart! To complete your registration and verify your email address, 
                    please use the following 6-digit verification code:
                </p>
            @endif

            <!-- OTP Code -->
            <div style="text-align: center; margin: 40px 0;">
                <div style="display: inline-block; padding: 20px 40px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ffffff; background: linear-gradient(135deg, #059669, #10b981); border-radius: 12px; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
                    {{ $otp }}
                </div>
            </div>

            <!-- Instructions -->
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: #065f46;">
                    <strong>Important:</strong> This verification code will expire in 2 minutes for security reasons.
                </p>
            </div>

            @if($purpose === 'Password Reset')
                <p style="font-size: 16px; margin-bottom: 20px;">
                    If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                </p>
            @else
                <p style="font-size: 16px; margin-bottom: 20px;">
                    If you didn't create an account with ShopMart, please ignore this email. No further action is required.
                </p>
            @endif

            <!-- Footer -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0 20px 0;">
            
            <div style="text-align: center;">
                <p style="font-size: 14px; color: #6b7280; margin: 0;">
                    This email was sent by ShopMart<br>
                    If you have any questions, please contact our support team.
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 20px 0 0 0;">
                    &copy; {{ date('Y') }} ShopMart. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>