<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ImportProductsFromCsv extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:import-csv
                            {path : Path to the CSV file}
                            {--update : Update existing products by SKU}
                            {--dry-run : Parse and report without writing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import products from a CSV file';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $path = $this->argument('path');
        $resolvedPath = $this->resolvePath($path);

        if (!is_file($resolvedPath)) {
            $this->error("CSV file not found: {$resolvedPath}");
            return Command::FAILURE;
        }

        $handle = fopen($resolvedPath, 'r');
        if (!$handle) {
            $this->error("Unable to open CSV file: {$resolvedPath}");
            return Command::FAILURE;
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            $this->error('CSV file is empty or missing a header row.');
            return Command::FAILURE;
        }

        $columns = array_map(static function ($value) {
            return strtolower(trim((string) $value));
        }, $header);

        $allowed = [
            'name',
            'sku',
            'description',
            'price',
            'currency',
            'stock_quantity',
            'image_url',
            'is_active',
            'category_id',
            'color',
            'material',
            'brand',
            'size',
            'weight',
            'dimensions',
            'highlight_1',
            'highlight_2',
            'highlight_3',
            'highlight_4',
            'discount_percent',
            'discount_starts_at',
            'discount_ends_at',
        ];
        $allowedMap = array_flip($allowed);

        $dryRun = (bool) $this->option('dry-run');
        $updateExisting = (bool) $this->option('update');
        $validCategoryIds = Category::pluck('id')->all();
        $validCategoryMap = array_flip($validCategoryIds);
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $total = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $total++;
            if ($this->isEmptyRow($row)) {
                $skipped++;
                continue;
            }

            $data = [];
            foreach ($columns as $index => $column) {
                if (!isset($allowedMap[$column])) {
                    continue;
                }
                $value = $row[$index] ?? null;
                $data[$column] = is_string($value) ? trim($value) : $value;
            }

            $data = $this->normalizeData($data);

            if (!empty($data['category_id']) && !isset($validCategoryMap[$data['category_id']])) {
                $this->warn("Row {$total}: category_id {$data['category_id']} not found. Setting to null.");
                $data['category_id'] = null;
            }

            if (empty($data['name']) || $data['price'] === null) {
                $this->warn("Row {$total}: missing required name or price.");
                $skipped++;
                continue;
            }

            if ($updateExisting && !empty($data['sku'])) {
                $existing = Product::where('sku', $data['sku'])->first();
                if ($existing) {
                    $updateData = $this->stripEmpty($data);
                    if (!$dryRun) {
                        $existing->update($updateData);
                    }
                    $updated++;
                    continue;
                }
            }

            if (!$dryRun) {
                Product::create($data);
            }
            $created++;
        }

        fclose($handle);

        $this->info("Processed {$total} rows.");
        $this->info("Created: {$created}");
        $this->info("Updated: {$updated}");
        $this->info("Skipped: {$skipped}");

        if ($dryRun) {
            $this->warn('Dry run mode enabled: no records were written.');
        }

        return Command::SUCCESS;
    }

    private function resolvePath(string $path): string
    {
        if (str_starts_with($path, DIRECTORY_SEPARATOR) || preg_match('/^[A-Za-z]:\\\\/', $path)) {
            return $path;
        }

        $base = base_path();
        $candidate = $base . DIRECTORY_SEPARATOR . $path;
        if (is_file($candidate)) {
            return $candidate;
        }

        $fallback = base_path('..' . DIRECTORY_SEPARATOR . $path);
        return $fallback;
    }

    private function normalizeData(array $data): array
    {
        $data['price'] = $this->toFloat($data['price'] ?? null);
        $data['stock_quantity'] = $this->toInt($data['stock_quantity'] ?? null);
        $data['category_id'] = $this->toInt($data['category_id'] ?? null);
        $data['discount_percent'] = $this->toFloat($data['discount_percent'] ?? null);
        $data['discount_starts_at'] = $this->parseDate($data['discount_starts_at'] ?? null);
        $data['discount_ends_at'] = $this->parseDate($data['discount_ends_at'] ?? null);

        foreach ([
            'description',
            'sku',
            'image_url',
            'color',
            'material',
            'brand',
            'size',
            'weight',
            'dimensions',
            'highlight_1',
            'highlight_2',
            'highlight_3',
            'highlight_4',
        ] as $nullableField) {
            if (array_key_exists($nullableField, $data) && $data[$nullableField] === '') {
                $data[$nullableField] = null;
            }
        }

        if (array_key_exists('currency', $data) && $data['currency'] === '') {
            unset($data['currency']);
        }

        if (array_key_exists('is_active', $data)) {
            $data['is_active'] = $this->toBool($data['is_active']);
        }

        return $data;
    }

    private function parseDate($value): ?Carbon
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        $formats = [
            'n/j/Y H:i',
            'm/d/Y H:i',
            'n/j/Y G:i',
            'm/d/Y G:i',
            'Y-m-d H:i:s',
            'Y-m-d H:i',
        ];

        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $value);
            } catch (\Exception $e) {
                // Try next format.
            }
        }

        try {
            return Carbon::parse($value);
        } catch (\Exception $e) {
            return null;
        }
    }

    private function toFloat($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }

    private function toInt($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $value = strtolower(trim((string) $value));
        return in_array($value, ['1', 'true', 'yes', 'y'], true);
    }

    private function stripEmpty(array $data): array
    {
        foreach ($data as $key => $value) {
            if ($value === '') {
                unset($data[$key]);
            }
        }

        return $data;
    }

    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }
}
