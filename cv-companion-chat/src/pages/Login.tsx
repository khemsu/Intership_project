import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/logo.svg';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: 'admin@amoebalabs.co', password: 'admin123' });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setIsLoading(true);

    if (!credentials.email || !credentials.password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'error',
        duration: 2000,
      });
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(credentials.email, credentials.password);
      if (success) {
        toast({ title: 'Success', description: `Logged in as ${credentials.email}`, variant: 'success', duration: 2000 });
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/user');
          }
        } else {
          navigate('/user');
        }
        return;
      } else {
        toast({ title: 'Error', description: 'Invalid credentials', variant: 'error', duration: 2000 });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Login failed. Please try again.', variant: 'error', duration: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-[#ecf0ff] via-[#e4ecf9] to-[#d8e1f4] flex items-center justify-center px-4">
      {/* Animated background blobs */}
      <motion.div
        className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-indigo-300 rounded-full blur-3xl opacity-30 z-0"
        animate={{ x: [0, 50, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-blue-300 rounded-full blur-3xl opacity-30 z-0"
        animate={{ x: [0, -30, 0], y: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <img src={logo} alt="CvAnalyser Logo" className="h-10 sm:h-12" />
          </div>
          <p className="text-gray-500 mt-2 text-sm">Secure access to your CV dashboard</p>
        </div>

        <Card className="bg-white/60 backdrop-blur-xl shadow-xl border border-gray-200 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
              <LogIn className="w-5 h-5 text-indigo-600" />
              <span>Sign In</span>
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Welcome back! Please enter your credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="rounded-xl"
                  value={credentials.email}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 rounded-xl font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} AmoebaLabs. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
