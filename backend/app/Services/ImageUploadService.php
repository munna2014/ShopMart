<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageUploadService
{
    protected string $disk = 'public';
    protected string $productImagesPath = 'products';
    protected string $defaultImageUrl = '/images/default-product.svg';

    /**
     * Upload a product image
     */
    public function uploadProductImage(UploadedFile $file): string
    {
        // Validate image
        $this->validateImage($file);

        // Generate unique filename
        $filename = $this->generateUniqueFilename($file);
        
        // Store the file
        $path = $file->storeAs($this->productImagesPath, $filename, $this->disk);
        
        // Return the public URL with correct base URL
        $url = Storage::disk($this->disk)->url($path);
        
        // Ensure the URL uses the correct app URL
        if (str_starts_with($url, '/storage/')) {
            $url = config('app.url') . $url;
        }
        
        return $url;
    }

    /**
     * Delete a product image
     */
    public function deleteProductImage(string $imageUrl): bool
    {
        if ($this->isDefaultImage($imageUrl)) {
            return true; // Don't delete default image
        }

        // Extract path from URL
        $path = $this->extractPathFromUrl($imageUrl);
        
        if ($path && Storage::disk($this->disk)->exists($path)) {
            return Storage::disk($this->disk)->delete($path);
        }

        return false;
    }

    /**
     * Validate uploaded image
     */
    public function validateImage(UploadedFile $file): bool
    {
        // Check file size (10MB max)
        if ($file->getSize() > 10 * 1024 * 1024) {
            throw new \InvalidArgumentException('Image file size must not exceed 10MB');
        }

        // Check file type
        $allowedMimes = ['image/png', 'image/jpg', 'image/jpeg'];
        if (!in_array($file->getMimeType(), $allowedMimes)) {
            throw new \InvalidArgumentException('Image must be PNG or JPG format');
        }

        // Check if file is actually an image
        $imageInfo = getimagesize($file->getPathname());
        if ($imageInfo === false) {
            throw new \InvalidArgumentException('Uploaded file is not a valid image');
        }

        return true;
    }

    /**
     * Get default image URL
     */
    public function getDefaultImageUrl(): string
    {
        return $this->defaultImageUrl;
    }

    /**
     * Check if image URL is the default image
     */
    public function isDefaultImage(string $imageUrl): bool
    {
        return $imageUrl === $this->defaultImageUrl;
    }

    /**
     * Generate unique filename for uploaded image
     */
    protected function generateUniqueFilename(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        $timestamp = now()->format('Y-m-d_H-i-s');
        $random = Str::random(8);
        
        return "product_{$timestamp}_{$random}.{$extension}";
    }

    /**
     * Extract storage path from public URL
     */
    protected function extractPathFromUrl(string $url): ?string
    {
        // Remove the storage URL prefix to get the relative path
        $storageUrl = Storage::disk($this->disk)->url('');
        
        if (str_starts_with($url, $storageUrl)) {
            return str_replace($storageUrl, '', $url);
        }

        // Handle relative URLs
        if (str_starts_with($url, '/storage/')) {
            return str_replace('/storage/', '', $url);
        }

        return null;
    }

    /**
     * Get image dimensions
     */
    public function getImageDimensions(UploadedFile $file): array
    {
        $imageInfo = getimagesize($file->getPathname());
        
        return [
            'width' => $imageInfo[0] ?? 0,
            'height' => $imageInfo[1] ?? 0,
        ];
    }

    /**
     * Resize image if needed (optional enhancement)
     */
    public function resizeImageIfNeeded(UploadedFile $file, int $maxWidth = 1200, int $maxHeight = 1200): UploadedFile
    {
        $dimensions = $this->getImageDimensions($file);
        
        // If image is within limits, return as-is
        if ($dimensions['width'] <= $maxWidth && $dimensions['height'] <= $maxHeight) {
            return $file;
        }

        // For now, just return the original file
        // In a production environment, you might want to implement actual image resizing
        return $file;
    }
}