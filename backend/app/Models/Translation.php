<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Translation extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'object_type',
        'object_id',
        'field_name',
        'locale',
        'translated_text',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * Get the translatable model (polymorphic)
     */
    public function translatable()
    {
        $modelMap = [
            'PRODUCT' => Product::class,
            'CATEGORY' => Category::class,
        ];

        $modelClass = $modelMap[$this->object_type] ?? null;

        if ($modelClass) {
            return $this->belongsTo($modelClass, 'object_id');
        }

        return null;
    }

    /**
     * Scope for specific locale
     */
    public function scopeForLocale($query, string $locale)
    {
        return $query->where('locale', $locale);
    }

    /**
     * Scope for specific object type
     */
    public function scopeForObjectType($query, string $objectType)
    {
        return $query->where('object_type', $objectType);
    }

    /**
     * Get translation for a specific object
     */
    public static function getTranslation(string $objectType, int $objectId, string $fieldName, string $locale)
    {
        return self::where('object_type', $objectType)
            ->where('object_id', $objectId)
            ->where('field_name', $fieldName)
            ->where('locale', $locale)
            ->value('translated_text');
    }

    /**
     * Set translation for a specific object
     */
    public static function setTranslation(string $objectType, int $objectId, string $fieldName, string $locale, string $text)
    {
        return self::updateOrCreate(
            [
                'object_type' => $objectType,
                'object_id' => $objectId,
                'field_name' => $fieldName,
                'locale' => $locale,
            ],
            [
                'translated_text' => $text,
            ]
        );
    }
}
