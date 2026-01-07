<!DOCTYPE html>
<html>
<head>
    <title>Order Shipped</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #059669; font-size: 28px; margin: 0; font-weight: bold;">ShopMart</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Order Shipped</p>
            </div>

            <h2 style="color: #059669; text-align: center; margin-bottom: 20px;">
                Your order is on the way
            </h2>

            <p style="font-size: 16px; margin-bottom: 16px;">
                Hi {{ $order->user?->full_name ?? 'Customer' }},
            </p>

            <p style="font-size: 16px; margin-bottom: 16px;">
                Your order <strong>{{ $orderLabel }}</strong> has been shipped.
            </p>

            <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #059669; margin: 24px 0;">
                <p style="margin: 0; font-size: 14px; color: #065f46;">
                    We will notify you as soon as your order is delivered.
                </p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Item</th>
                        <th style="text-align: center; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Qty</th>
                        <th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($order->items as $item)
                        <tr>
                            <td style="padding: 8px 0;">
                                {{ $item->product->name ?? 'Product' }}
                            </td>
                            <td style="text-align: center; padding: 8px 0;">
                                {{ $item->quantity }}
                            </td>
                            <td style="text-align: right; padding: 8px 0;">
                                {{ $order->currency }} {{ number_format((float) $item->total_price, 2) }}
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3" style="padding: 8px 0; color: #6b7280;">
                                Items are being prepared for shipment.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>

            <p style="font-size: 16px; margin-top: 20px; text-align: right;">
                <strong>Total:</strong> {{ $order->currency }} {{ number_format((float) $order->total_amount, 2) }}
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;">

            <div style="text-align: center;">
                <p style="font-size: 14px; color: #6b7280; margin: 0;">
                    Thank you for shopping with ShopMart.
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 20px 0 0 0;">
                    &copy; {{ date('Y') }} ShopMart. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
