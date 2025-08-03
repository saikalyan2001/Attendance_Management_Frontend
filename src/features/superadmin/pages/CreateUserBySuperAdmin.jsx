import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createUserBySuperAdmin } from "../../../redux/slices/authSlice";
import { fetchLocations } from "../redux/locationsSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  role: z.enum(["admin", "siteincharge"], { required_error: "Role is required" }),
  locations: z.array(z.string()).optional(),
}).refine(
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
).refine(
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

const CreateUserBySuperAdmin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const { locations } = useSelector((state) => state.superAdminLocations);

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      phone: "",
      role: "admin",
      locations: [],
    },
  });

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      if (error.includes("Forbidden: Insufficient role")) {
        toast.error("Insufficient permissions. Please contact support.");
      } else {
        toast.error(error);
      }
    }
  }, [error]);

  const handleSubmit = (data) => {
    dispatch(createUserBySuperAdmin(data)).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        toast.success(`${data.role === "admin" ? "Admin" : "Site Incharge"} ${data.name} created successfully`);
        navigate("/superadmin/users"); // Navigate to user management page
      }
    });
  };

  const selectedRole = form.watch("role");

  return (
    <Layout title="create-user-account">
      <div className="min-h-screen flex items-center justify-center bg-body text-body">
        <Card className="w-full max-w-md bg-complementary text-body">
          <CardHeader>
            <CardTitle>Create User</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                {error && (
                  <Alert
                    variant="destructive"
                    className="border-error text-error"
                  >
                    <AlertDescription>{error.includes("Forbidden: Insufficient role") ? "Insufficient permissions. Please contact support." : error}</AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
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
                          className="bg-complementary text-body border-accent"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-complementary text-body border-accent">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-complementary text-body">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="siteincharge">Site Incharge</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locations {selectedRole === "siteincharge" ? "*" : "(Not applicable)"}</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange([value])}
                        value={field.value[0] || ""}
                        disabled={loading || locations.length === 0 || selectedRole === "admin"}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-complementary text-body border-accent">
                            <SelectValue
                              placeholder={
                                locations.length === 0
                                  ? "No locations available. Add locations first."
                                  : selectedRole === "admin"
                                    ? "Not applicable for Admins"
                                    : "Select location"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-complementary text-body">
                          {locations.map((loc) => (
                            <SelectItem key={loc._id} value={loc._id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {locations.length === 0 && (
                        <p className="text-sm text-error">
                          No locations available. Please{" "}
                          <Link
                            to="/superadmin/locations"
                            className="underline text-accent hover:text-accent-hover"
                          >
                            add locations
                          </Link>{" "}
                          first.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-accent text-body hover:bg-accent-hover"
                  disabled={loading || (selectedRole === "siteincharge" && locations.length === 0)}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Create User"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateUserBySuperAdmin;