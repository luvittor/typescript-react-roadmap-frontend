import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cardTitleSchema, type CardTitleInput } from "../../../lib/validators";
import type { Column } from "../types";
import { useCreateCard } from "../hooks/useBoard";

export const AddCardForm = ({ column, year, month }: { column: Column; year: number; month: number }) => {
  const form = useForm<CardTitleInput>({
    resolver: zodResolver(cardTitleSchema),
    defaultValues: { title: "" },
  });

  const { mutateAsync, isPending } = useCreateCard(year, month);

  const onSubmit = async ({ title }: CardTitleInput) => {
    try {
      await mutateAsync({ column_id: column.id, order: 1, title });
      form.reset();
    } catch (error) {
      // handled by mutation onError
    }
  };

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={form.handleSubmit(onSubmit)}
      aria-label={`Add card to ${month}/${year}`}
    >
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add card"
          {...form.register("title")}
          aria-invalid={Boolean(form.formState.errors.title)}
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding" : "Add"}
        </Button>
      </div>
      {form.formState.errors.title && (
        <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
      )}
    </form>
  );
};
