ShopMart - {{ $purpose }}

Hi {{ $userName }},

@if($purpose === 'Password Reset')
You requested a password reset for your ShopMart account.
Use the 6-digit code below to continue:
@else
Welcome to ShopMart!
Use the 6-digit verification code below to verify your email:
@endif

Verification code: {{ $otp }}

This code expires in 2 minutes.

If you did not request this, you can ignore this email.
