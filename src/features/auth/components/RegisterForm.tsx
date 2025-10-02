import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { registerSchema, type RegisterInput } from "../../../lib/validators";
import { useRegister } from "../hooks/useAuth";

export const RegisterForm = () => {
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const { mutateAsync, isPending } = useRegister();

  const onSubmit = async (values: RegisterInput) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      // handled by mutation onError
    }
  };

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
};
