import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Trash2, User, AlertTriangle } from "lucide-react";
import { Card } from "./ui/card";

interface UserType {
  email: string;
  role: string;
}

const AdminAddUser = () => {
  const [form, setForm] = useState({ email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/users`,
        {
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.filter((u: UserType) => u.email));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load users",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    const email = form.email.trim().toLowerCase();

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ ...form, email }), // use cleaned email
        }
      );

      if (!res.ok) throw new Error((await res.json()).detail || "Failed");

      toast({
        title: "Success",
        description: `User ${email} added.`,
        variant: "default",
        duration: 5000,
      });
      setForm({ email: "", password: "", role: "user" });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "User creation failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    setIsDeleting(true);
    setUserToDelete(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/delete-user`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );

      if (!res.ok) throw new Error("Failed to delete user");

      toast({
        title: "Success",
        description: `User ${email} deleted.`,
        variant: "default",
        duration: 5000,
      });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Delete user failed",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) => u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            User Management Dashboard
          </h1>
          <p className="text-slate-600">
            Manage users for different use cases
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Add User Form */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-6 text-indigo-600 dark:text-indigo-300">
              Add New User
            </h3>

            <div className="space-y-6">
              <div>
                <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                />
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </Label>
                <Input
                  placeholder="Enter a strong password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-200 px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <Button
                onClick={handleAddUser}
                disabled={loading}
                className="w-full py-3 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-400 dark:focus:ring-indigo-300 transition-colors rounded-lg shadow-md"
              >
                {loading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>

          {/* User List & Search */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-300">
              Manage Existing Users
            </h3>

            <Input
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            {loadingUsers ? (
              <p className="text-center text-gray-500 dark:text-gray-400">
                Loading users...
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No users found.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm max-h-[450px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <li
                    key={user.email}
                    className="flex flex-col items-start justify-center gap-1 sm:flex-row sm:justify-between sm:items-center px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {user.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          Role: {user.role}
                        </p>
                      </div>
                    </div>

                    <AlertDialog
                      open={userToDelete === user.email}
                      onOpenChange={(open) =>
                        setUserToDelete(open ? user.email : null)
                      }
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                          {isDeleting && userToDelete === user.email
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete User Account
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the user account for{" "}
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {user.email}
                            </span>
                            ? This action cannot be undone and will permanently
                            remove the user's access to the system.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.email)}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isDeleting ? "Deleting..." : "Delete User"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AdminAddUser;