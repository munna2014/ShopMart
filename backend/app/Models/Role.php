<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * Users with this role
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_roles')
            ->withPivot('assigned_at')
            ->withTimestamps();
    }

    /**
     * Permissions for this role
     */
    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'role_permissions')
            ->withPivot('granted_at')
            ->withTimestamps();
    }

    /**
     * Grant a permission to this role
     */
    public function grantPermission(Permission $permission)
    {
        return $this->permissions()->attach($permission);
    }

    /**
     * Revoke a permission from this role
     */
    public function revokePermission(Permission $permission)
    {
        return $this->permissions()->detach($permission);
    }

    /**
     * Check if role has a specific permission
     */
    public function hasPermission(string $permissionName): bool
    {
        return $this->permissions()->where('name', $permissionName)->exists();
    }
}
