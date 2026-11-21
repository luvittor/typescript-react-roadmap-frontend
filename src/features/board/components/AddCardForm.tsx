import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cardTitleSchema, type CardTitleInput } from "../../../lib/validators";
import type { Column } from "../types";
import { useCreateCard } from "../hooks/useBoard";

export const AddCardForm = ({ column, year, month }: { column: Column; year: number; month: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<CardTitleInput>({
    resolver: zodResolver(cardTitleSchema),
    defaultValues: { title: "" },
  });

  const { mutateAsync, isPending } = useCreateCard(year, month);

  const onSubmit = async ({ title }: CardTitleInput) => {
    try {
      await mutateAsync({ column_id: column.id, order: 1, title });
      form.reset();
      setIsOpen(false);
    } catch {
      // handled by mutation onError
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-9 justify-start px-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(true)}
        aria-label={`Add card to ${month}/${year}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add card
      </Button>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={form.handleSubmit(onSubmit)}
      aria-label={`Create card in ${month}/${year}`}
    >
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add card"
          {...form.register("title")}
          aria-invalid={Boolean(form.formState.errors.title)}
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding" : "Add card"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            form.reset();
            setIsOpen(false);
          }}
          aria-label="Cancel adding card"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {form.formState.errors.title && (
        <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
      )}
    </form>
  );
};
