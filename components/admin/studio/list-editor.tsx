"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError, apiSend } from "@/lib/api-client";
import { t } from "@/lib/i18n/admin";

/**
 * A list kept as text, one entry per line: stop words, blocked domains.
 * The server lowercases, drops repeats and sorts; the field then shows the
 * list as saved.
 */
export function ListEditor({
  title,
  hint,
  initial,
  endpoint,
  field,
}: {
  title: string;
  hint: string;
  initial: string[];
  endpoint: "/api/admin/stop-words" | "/api/admin/blocked-domains";
  field: "words" | "domains";
}) {
  const toast = useToast();
  const [value, setValue] = useState(initial.join("\n"));
  const [count, setCount] = useState(initial.length);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const lines = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      const result = await apiSend<{
        added: number;
        removed: number;
        list: string[];
      }>("PUT", endpoint, { [field]: lines });
      toast({
        title:
          result.added + result.removed === 0
            ? t("admin.lists.noChanges")
            : t("admin.lists.saved", {
                added: result.added,
                removed: result.removed,
              }),
        tone: "success",
      });
      // Back as saved: lowercase, no repeats, sorted.
      setValue(result.list.join("\n"));
      setCount(result.list.length);
    } catch (failure) {
      if (failure instanceof ApiRequestError) {
        const [path, message] = Object.entries(failure.fields)[0] ?? [];
        const index = Number(path?.split(".")[1]);
        setError(
          path && Number.isInteger(index) && lines[index]
            ? t("admin.lists.line", { value: lines[index]!, error: message! })
            : failure.message,
        );
      } else {
        setError(t("errors.internal"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-h4">{title}</h2>
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <Field
          label={title}
          hint={`${hint} ${t("admin.lists.count", { count })}`}
          error={error}
        >
          {(control) => (
            <Textarea
              {...control}
              rows={12}
              spellCheck={false}
              autoCapitalize="none"
              className="font-mono text-sm"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          )}
        </Field>
        <Button type="submit" loading={saving} className="self-start">
          {t("admin.lists.save")}
        </Button>
      </form>
    </Card>
  );
}
