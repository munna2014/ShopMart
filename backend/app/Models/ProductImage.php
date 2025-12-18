<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'url',
        'alt_text',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * Product relationship
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Set as primary image
     */
    public function setAsPrimary()
    {
        // Remove primary flag from other images
        ProductImage::where('product_id', $this->product_id)
            ->update(['is_primary' => false]);

        // Set this as primary
        $this->is_primary = true;
        $this->save();
    }
}
