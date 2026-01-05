<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Electronics',
                'slug' => 'electronics',
                'description' => 'Electronic devices and gadgets',
                'icon' => 'M2 7h20M2 7v13a2 2 0 002 2h16a2 2 0 002-2V7M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
                'color' => 'from-purple-500 to-purple-600',
                'sort_order' => 1,
            ],
            [
                'name' => 'Fashion',
                'slug' => 'fashion',
                'description' => 'Clothing, accessories, and fashion items',
                'icon' => 'M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
                'color' => 'from-blue-500 to-blue-600',
                'sort_order' => 2,
            ],
            [
                'name' => 'Home & Living',
                'slug' => 'home-living',
                'description' => 'Home decor, furniture, and living essentials',
                'icon' => 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
                'color' => 'from-green-500 to-green-600',
                'sort_order' => 3,
            ],
            [
                'name' => 'Sports & Outdoors',
                'slug' => 'sports-outdoors',
                'description' => 'Sports equipment and outdoor gear',
                'icon' => 'M5 20h14l-7-14-7 14zM7 16l5-8 5 8M9 14h6',
                'color' => 'from-orange-500 to-orange-600',
                'sort_order' => 4,
            ],
            [
                'name' => 'Beauty & Health',
                'slug' => 'beauty-health',
                'description' => 'Beauty products and health essentials',
                'icon' => 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
                'color' => 'from-pink-500 to-pink-600',
                'sort_order' => 5,
            ],
            [
                'name' => 'Books & Media',
                'slug' => 'books-media',
                'description' => 'Books, magazines, and media content',
                'icon' => 'M2 7h20M2 7v15h20V7M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16M6 11h12M6 15h12',
                'color' => 'from-teal-500 to-teal-600',
                'sort_order' => 6,
            ],
        ];

        foreach ($categories as $category) {
            \App\Models\Category::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
