import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../../../utils/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useTheme } from "../../../components/common/ThemeToggle";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import Layout from "@/components/layout/Layout";

const userSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    phone: z.string().optional(),
    role: z.enum(["admin", "siteincharge"]),
    locations: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.role === "siteincharge") {
        return data.locations && data.locations.length > 0;
      }
      return true;
    },
    {
      message: "At least one location is required for Site Incharge",
      path: ["locations"],
    }
  )
  .refine(
    (data) => {
      if (data.role === "admin") {
        return !data.locations || data.locations.length === 0;
      }
      return true;
    },
    {
      message: "Admins cannot be assigned locations",
      path: ["locations"],
    }
  );

const SuperAdminUserManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      name: "",
      phone: "",
      role: "admin",
      locations: [],
    },
  });

  const watchedRole = form.watch("role");

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, []);

  // Clear locations when role changes to admin
  useEffect(() => {
    if (watchedRole === "admin") {
      form.setValue("locations", []);
    }
  }, [watchedRole, form]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/superadmin/users");
      setUsers(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get("/auth/locations");
      setLocations(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch locations");
    }
  };

  const handleUpdateUser = async (data) => {
    setLoading(true);
    try {
      const response = await api.put(
        `/superadmin/users/${editingUserId}`,
        data
      );
      toast.success("User updated successfully");
      setUsers(users.map((u) => (u._id === editingUserId ? response.data : u)));
      setEditingUserId(null);
      form.reset();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/superadmin/users/${id}`);
      toast.success("User deleted successfully");
      setUsers(users.filter((u) => u._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user._id);
    form.setValue("email", user.email);
    form.setValue("name", user.name);
    form.setValue("phone", user.phone || "");
    form.setValue("role", user.role);
    form.setValue(
      "locations",
      user.locations?.map((loc) => loc._id.toString()) || []
    );
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    form.reset();
  };

  const handleLocationChange = (locationId, checked) => {
    const currentLocations = form.getValues("locations") || [];
    if (checked) {
      form.setValue("locations", [...currentLocations, locationId]);
    } else {
      form.setValue(
        "locations",
        currentLocations.filter((id) => id !== locationId)
      );
    }
  };

  return (
    <Layout title="user-management">
      <div
        className={cn(
          "min-h-screen p-8",
          theme === "dark"
            ? "bg-gray-900 text-gray-200"
            : "bg-gray-50 text-gray-800"
        )}
      >
        <Card
          className={cn(
            "max-w-4xl mx-auto",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}
        >
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              User Management (Super Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && <LoadingSpinner />}

            <div className="mb-4">
              <Link to="/superadmin/create-user">
                <Button
                  className={cn(
                    "bg-accent text-white hover:bg-accent-hover h-10",
                    loading && "opacity-75"
                  )}
                  disabled={loading}
                >
                  Create New User
                </Button>
              </Link>
            </div>

            {editingUserId && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleUpdateUser)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email <span className="text-error">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            className="w-full bg-complementary text-body border-accent h-10"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Name <span className="text-error">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="w-full bg-complementary text-body border-accent h-10"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="w-full bg-complementary text-body border-accent h-10"
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage className="text-error" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Role <span className="text-error">*</span>
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full bg-complementary text-body border-accent h-10">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-complementary text-body">
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="siteincharge">
                                Site Incharge
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-error" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Locations{" "}
                          {watchedRole === "siteincharge" && (
                            <span className="text-error">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <div
                            className={cn(
                              "border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto",
                              "bg-complementary border-accent",
                              watchedRole === "admin" &&
                                "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {watchedRole === "admin" ? (
                              <p className="text-sm text-gray-500">
                                Admins cannot be assigned locations
                              </p>
                            ) : locations.length > 0 ? (
                              locations.map((location) => (
                                <div
                                  key={location._id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`location-${location._id}`}
                                    checked={
                                      field.value?.includes(
                                        location._id.toString()
                                      ) || false
                                    }
                                    onCheckedChange={(checked) =>
                                      handleLocationChange(
                                        location._id.toString(),
                                        checked
                                      )
                                    }
                                    disabled={loading}
                                  />
                                  <label
                                    htmlFor={`location-${location._id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {location.name}
                                  </label>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">
                                No locations available
                              </p>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage className="text-error" />
                      </FormItem>
                    )}
                  />

                  <div className="flex space-x-3 pt-2">
                    <Button
                      type="submit"
                      className={cn(
                        "flex-1 bg-accent text-white hover:bg-accent-hover h-10",
                        loading && "opacity-75"
                      )}
                      disabled={loading}
                    >
                      Update User
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCancelEdit}
                      className={cn(
                        "px-6 bg-gray-500 text-white hover:bg-gray-600 h-10",
                        loading && "opacity-75"
                      )}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Users</h3>
              {users.length === 0 ? (
                <p>No users found.</p>
              ) : (
                <ul className="space-y-2">
                  {users.map((user) => (
                    <li
                      key={user._id}
                      className={cn(
                        "p-4 rounded-lg border",
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-100 border-gray-200"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p>
                            <strong>Name:</strong> {user.name}
                          </p>
                          <p>
                            <strong>Email:</strong> {user.email}
                          </p>
                          <p>
                            <strong>Role:</strong> {user.role}
                          </p>
                          <p>
                            <strong>Locations:</strong>{" "}
                            {user.locations
                              ?.map((loc) => loc.name)
                              .join(", ") || "None"}
                          </p>
                        </div>
                        <div className="space-x-2">
                          <Button
                            onClick={() => handleEditUser(user)}
                            className="bg-blue-500 text-white hover:bg-blue-600"
                            disabled={loading || editingUserId === user._id}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(user._id)}
                            className="bg-red-500 text-white hover:bg-red-600"
                            disabled={loading}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SuperAdminUserManagement;
