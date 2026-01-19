import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import logo from '@/assets/trinetra-logo.png';

const Signup = () => {
  const [form, setForm] = useState({
    newEmail: '',
    newPassword: '',
    confirmPassword: '',
    newRole: 'user',
    adminEmail: '',
    adminPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    setIsLoading(true);

    if (
      !form.newEmail ||
      !form.newPassword ||
      !form.confirmPassword ||
      !form.newRole ||
      !form.adminEmail ||
      !form.adminPassword
    ) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'error',
      });
      setIsLoading(false);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'error',
        duration: 3000,
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_email: form.newEmail,
          new_password: form.newPassword,
          new_role: form.newRole,
          admin_email: form.adminEmail,
          admin_password: form.adminPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'User registered successfully',
          variant: 'success',
          duration: 3000,
        });
        navigate('/login');
      } else {
        toast({
          title: 'Error',
          description: data.detail || 'Signup failed',
          variant: 'error',
          duration: 3000,
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <img src={logo} alt="TriNetra Logo" className="w-8 h-8" />
            <h1 className="text-3xl font-extrabold text-gray-800">Tri<span className="text-indigo-600">Netra</span></h1>
          </div>
          <p className="text-gray-500 mt-2 text-sm">Admin-only user creation</p>
        </div>

        <Card className="shadow-md bg-white">
          <CardHeader>
            <CardTitle>User Registration</CardTitle>
            <CardDescription>Only admins can register users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New User Fields */}
            <div>
              <Label>Email (New User)</Label>
              <Input
                type="email"
                value={form.newEmail}
                onChange={(e) => setForm({ ...form, newEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                value={form.newRole}
                onChange={(e) => setForm({ ...form, newRole: e.target.value })}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Admin Credentials */}
            <div className="pt-2 border-t mt-4">
              <h4 className="font-medium text-sm mb-2">Admin Authentication</h4>
              <div>
                <Label>Admin Email</Label>
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </div>
              <div>
                <Label>Admin Password</Label>
                <Input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                />
              </div>
            </div>

            <Button
              className="w-full bg-indigo-600 text-white"
              onClick={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register User'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
