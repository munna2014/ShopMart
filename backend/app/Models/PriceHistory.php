<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PriceHistory extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'price_history';

    protected $fillable = [
        'product_id',
        'old_price',
        'new_price',
        'currency',
        'changed_by',
    ];

    protected $casts = [
        'old_price' => 'decimal:2',
        'new_price' => 'decimal:2',
        'changed_at' => 'datetime',
    ];

    /**
     * Product relationship
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * User who changed the price
     */
    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /**
     * Get price difference
     */
    public function getPriceDifference()
    {
        return $this->new_price - $this->old_price;
    }

    /**
     * Get percentage change
     */
    public function getPercentageChange()
    {
        if ($this->old_price == 0) {
            return 0;
        }

        return (($this->new_price - $this->old_price) / $this->old_price) * 100;
    }
}
