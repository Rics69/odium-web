"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Doodle, type DoodleName } from "@/components/doodles/doodle";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { BracketLabel } from "@/components/ui/bracket-label";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { climateCrisis, delaGothic, unbounded } from "./fonts";

type Accent = "ember" | "blue" | "olive";
type Face = "unbounded" | "dela" | "climate";
type MotionMode = "on" | "reduce";

const accents: { value: Accent; label: string; swatch: string }[] = [
  { value: "ember", label: "Оранжево-красный", swatch: "#c93d15" },
  { value: "blue", label: "Электрический синий", swatch: "#2d46e6" },
  { value: "olive", label: "Оливковый", swatch: "#56652a" },
];

const faces: { value: Face; label: string; fontFamily: string }[] = [
  {
    value: "unbounded",
    label: "Unbounded",
    fontFamily: unbounded.style.fontFamily,
  },
  {
    value: "dela",
    label: "Dela Gothic One",
    fontFamily: delaGothic.style.fontFamily,
  },
  {
    value: "climate",
    label: "Climate Crisis",
    fontFamily: climateCrisis.style.fontFamily,
  },
];

export function Showcase() {
  const [accent, setAccent] = useState<Accent>("ember");
  const [face, setFace] = useState<Face>("unbounded");
  const [motionMode, setMotionMode] = useState<MotionMode>("on");
  const fontFamily = faces.find((f) => f.value === face)?.fontFamily ?? "";

  // The pickers write to <html>, so portals (dialogs, toasts) follow them too.
  useEffect(() => {
    const root = document.documentElement;
    if (accent === "ember") delete root.dataset.accent;
    else root.dataset.accent = accent;
    if (motionMode === "reduce") root.dataset.motion = "reduce";
    else delete root.dataset.motion;
    root.style.setProperty("--font-display-face", fontFamily);
  }, [accent, motionMode, fontFamily]);

  useEffect(() => {
    const root = document.documentElement;
    return () => {
      delete root.dataset.accent;
      delete root.dataset.motion;
      root.style.removeProperty("--font-display-face");
    };
  }, []);

  return (
    <MotionConfig reducedMotion={motionMode === "reduce" ? "always" : "user"}>
      <div className="min-h-dvh pb-24">
        <header className="z-40 border-b border-line bg-paper/90 backdrop-blur lg:sticky lg:top-0">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <p className="font-display text-h4">Витрина Odium</p>
            <div className="flex flex-wrap gap-4">
              <SegmentedControl
                label="Акцентный цвет"
                value={accent}
                onChange={setAccent}
                options={accents.map((a) => ({
                  value: a.value,
                  label: (
                    <>
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: a.swatch }}
                      />
                      <span className="hidden md:inline">{a.label}</span>
                    </>
                  ),
                }))}
              />
              <SegmentedControl
                label="Акцидентный шрифт"
                value={face}
                onChange={setFace}
                options={faces.map((f) => ({
                  value: f.value,
                  label: (
                    <span style={{ fontFamily: f.fontFamily }}>{f.label}</span>
                  ),
                }))}
              />
              <SegmentedControl
                label="Анимации"
                value={motionMode}
                onChange={setMotionMode}
                options={[
                  { value: "on", label: "С анимациями" },
                  { value: "reduce", label: "Без" },
                ]}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pt-16 md:px-8">
          <TypeSection face={face} />
          <PaletteSection accent={accent} />
          <DoodleSection />
          <ButtonSection />
          <LinkSection />
          <FormSection />
          <BadgeSection />
          <CardSection />
          <OverlaySection />
          <StateSection />
          <RevealSection />
        </main>
      </div>
    </MotionConfig>
  );
}

function Section({
  label,
  title,
  note,
  children,
}: {
  label: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BracketLabel className="text-ink-2">{label}</BracketLabel>
        <h2 className="font-display text-h2">{title}</h2>
        {note && <p className="max-w-2xl text-ink-2">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function TypeSection({ face }: { face: Face }) {
  return (
    <section className="flex flex-col gap-12">
      <div className="relative">
        <h1 className="font-display text-display">ODIUM</h1>
        <Doodle
          name="underline"
          draw="view"
          className="mt-2 h-4 w-2/3 text-accent md:h-6"
          strokeWidth={3}
        />
        <Doodle
          name="sparkle"
          draw="view"
          className="absolute top-0 right-4 size-10 text-accent md:right-1/4 md:size-16"
        />
      </div>
      <p className="font-display text-display-sm">
        Делаем игры, которые хочется трогать
      </p>
      {face === "climate" && (
        <p className="font-display text-h1 transition-[font-variation-settings] duration-1000 ease-out [font-variation-settings:'YEAR'_1979] hover:[font-variation-settings:'YEAR'_2050]">
          Наведи — буквы тают
        </p>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="font-display text-h1">Заголовок H1</p>
          <p className="font-display text-h2">Заголовок H2</p>
          <p className="font-display text-h3">Заголовок H3</p>
          <p className="text-h4 font-semibold">Заголовок H4 — Inter</p>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-lg">
            Крупный текст: короткое вступление к разделу, одна-две строки, не
            больше.
          </p>
          <p>
            Основной текст — Inter 16 px, межстрочный 1,5. Съешь ещё этих мягких
            французских булок, да выпей же чаю. Ёлки, щука, ъ, ы — кириллица на
            месте.
          </p>
          <p className="text-sm text-ink-2">
            Подпись 14 px: дата, автор, служебная строка.
          </p>
        </div>
      </div>
    </section>
  );
}

const palette: {
  name: string;
  variable: string;
  className: string;
  text?: boolean;
}[] = [
  { name: "paper", variable: "--color-paper", className: "bg-paper" },
  { name: "surface", variable: "--color-surface", className: "bg-surface" },
  { name: "line", variable: "--color-line", className: "bg-line" },
  {
    name: "line-strong",
    variable: "--color-line-strong",
    className: "bg-line-strong",
  },
  { name: "ink", variable: "--color-ink", className: "bg-ink", text: true },
  {
    name: "ink-2",
    variable: "--color-ink-2",
    className: "bg-ink-2",
    text: true,
  },
  {
    name: "ink-3",
    variable: "--color-ink-3",
    className: "bg-ink-3",
    text: true,
  },
  { name: "accent", variable: "--accent", className: "bg-accent", text: true },
  {
    name: "accent-deep",
    variable: "--accent-deep",
    className: "bg-accent-deep",
    text: true,
  },
  { name: "add", variable: "--color-add", className: "bg-add", text: true },
  {
    name: "remove",
    variable: "--color-remove",
    className: "bg-remove",
    text: true,
  },
];

function luminance(hex: string) {
  const channels = (hex.match(/[0-9a-f]{2}/gi) ?? []).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

function PaletteSection({ accent }: { accent: Accent }) {
  const [values, setValues] = useState<Record<string, string>>({});

  // Read on the next frame: child effects run before the parent's, which is
  // where the accent picker updates <html>.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const styles = getComputedStyle(document.documentElement);
      setValues(
        Object.fromEntries(
          palette.map((p) => [
            p.name,
            styles.getPropertyValue(p.variable).trim(),
          ]),
        ),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [accent]);

  const paper = values.paper ?? "#f7f3eb";

  return (
    <Section
      label="Цвета"
      title="Серые, один акцент и две метки"
      note="Для цветов текста — контраст с фоном-бумагой. AA — от 4,5:1; ink-3 только для декора и подсказок в полях."
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        {palette.map((p) => {
          const hex = values[p.name] ?? "";
          const ratio = p.text && hex ? contrast(hex, paper) : null;
          return (
            <div key={p.name} className="flex flex-col gap-2">
              <div
                className={cn(
                  "h-16 rounded-md border border-line",
                  p.className,
                )}
              />
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-sm text-ink-2 uppercase tabular-nums">
                {hex}
                {ratio !== null && (
                  <span
                    className={cn(
                      "ml-2",
                      ratio >= 4.5 ? "text-add" : "text-ink-3",
                    )}
                  >
                    {ratio.toFixed(1)}:1 {ratio >= 4.5 ? "AA" : "декор"}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

const doodles: { name: DoodleName; label: string; className: string }[] = [
  { name: "outline", label: "Обводка", className: "h-16 w-40" },
  { name: "underline", label: "Подчёркивание", className: "h-4 w-40" },
  { name: "arrow", label: "Стрелка", className: "h-16 w-24" },
  { name: "sparkle", label: "Звёздочка", className: "size-12" },
  { name: "scribble", label: "Каракуля", className: "h-12 w-36" },
  { name: "check", label: "Галочка", className: "size-12" },
];

function DoodleSection() {
  const [round, setRound] = useState(0);
  return (
    <Section
      label="Рисунки"
      title="Линии от руки"
      note="Рисуются сами, когда попадают на экран. Цвет — как у текста или акцента, линия всегда тонкая."
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {doodles.map((d) => (
          <Card
            key={`${d.name}-${round}`}
            className="flex flex-col items-center gap-4"
          >
            <div className="grid h-20 place-items-center text-ink">
              <Doodle name={d.name} draw="view" className={d.className} />
            </div>
            <p className="text-sm text-ink-2">{d.label}</p>
          </Card>
        ))}
      </div>
      <div>
        <Button variant="secondary" onClick={() => setRound((r) => r + 1)}>
          Нарисовать заново
        </Button>
      </div>
    </Section>
  );
}

function ButtonSection() {
  const [loading, setLoading] = useState(false);
  return (
    <Section
      label="Кнопки"
      title="Нажимаются упруго"
      note="Главная кнопка с рисованной обводкой — одна на экран. При наведении кнопка приподнимается, обводка покачивается."
    >
      <div className="flex flex-wrap items-center gap-6">
        <Button doodle>Оставить пожелание</Button>
        <Button>Голосовать</Button>
        <Button variant="secondary">Показать ещё</Button>
        <Button variant="ghost">Отмена</Button>
        <Button disabled>Недоступно</Button>
        <Button
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        >
          Сохранить
        </Button>
        <LinkButton href="/" variant="secondary">
          Ссылка-кнопка
        </LinkButton>
      </div>
    </Section>
  );
}

function LinkSection() {
  return (
    <Section label="Ссылки и подписи" title="Ссылки, скобки">
      <p className="max-w-xl text-lg">
        Ссылка в тексте подчёркнута спокойно, а при наведении под ней{" "}
        <TextLink href="/">рисуется волна</TextLink>. Подписи в скобках
        раздвигаются, когда на них наводишь.
      </p>
      <div className="flex flex-wrap gap-6 text-ink">
        <BracketLabel>Игры</BracketLabel>
        <BracketLabel>В разработке</BracketLabel>
        <BracketLabel>Android · iOS</BracketLabel>
        <BracketLabel className="text-accent">Ответ Odium</BracketLabel>
      </div>
    </Section>
  );
}

function FormSection() {
  const [kind, setKind] = useState<"add" | "remove">("add");
  const [title, setTitle] = useState("Добавить кооперативный режим");
  const [body, setBody] = useState("");
  return (
    <Section
      label="Формы"
      title="Поля и переключатели"
      note="Фокус — рамка цвета акцента с мягким свечением. Ошибка — красная рамка и текст под полем."
    >
      <div className="grid max-w-3xl gap-8 md:grid-cols-2">
        <Field label="Email" hint="На него придёт письмо для подтверждения">
          {(control) => (
            <Input type="email" placeholder="you@example.com" {...control} />
          )}
        </Field>
        <Field label="Ник" error="Ник уже занят">
          {(control) => <Input defaultValue="odium" {...control} />}
        </Field>
        <Field label="Заголовок" count={{ value: title.length, max: 100 }}>
          {(control) => (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              {...control}
            />
          )}
        </Field>
        <Field label="Недоступное поле">
          {(control) => (
            <Input disabled defaultValue="Только для чтения" {...control} />
          )}
        </Field>
        <Field
          label="Описание"
          hint="Простой текст, переносы строк сохраняются"
          count={{ value: body.length, max: 2000 }}
          className="md:col-span-2"
        >
          {(control) => (
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Что именно добавить и зачем"
              {...control}
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Тип пожелания</p>
          <SegmentedControl
            label="Тип пожелания"
            value={kind}
            onChange={setKind}
            options={[
              { value: "add", label: "Добавить" },
              { value: "remove", label: "Убрать" },
            ]}
          />
        </div>
      </div>
    </Section>
  );
}

function BadgeSection() {
  return (
    <Section label="Метки" title="Тип и статус пожелания">
      <div className="flex flex-wrap gap-2">
        <Badge tone="add">Добавить</Badge>
        <Badge tone="remove">Убрать</Badge>
        <Badge>Новое</Badge>
        <Badge>На рассмотрении</Badge>
        <Badge>Запланировано</Badge>
        <Badge>В работе</Badge>
        <Badge>Сделано</Badge>
        <Badge>Отклонено</Badge>
        <Badge tone="accent">
          <Doodle name="sparkle" className="size-4" />
          Ответ Odium
        </Badge>
      </div>
    </Section>
  );
}

function CardSection() {
  return (
    <Section label="Карточки" title="Рамка или тень, не вместе">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-h4 font-semibold">Обычная карточка</p>
          <p className="mt-2 text-ink-2">
            Тонкая рамка, скругление 16 px, отступы 24 px.
          </p>
        </Card>
        <Card interactive className="group cursor-pointer">
          <div className="mb-4 grid h-32 place-items-center rounded-md bg-paper text-ink-3">
            <Doodle
              name="sparkle"
              className="size-10 transition-[rotate] duration-500 group-hover:rotate-90"
            />
          </div>
          <BracketLabel className="text-ink-2">Головоломка</BracketLabel>
          <p className="mt-2 text-h4 font-semibold">Карточка-ссылка</p>
          <p className="mt-2 text-ink-2">
            Наведи: приподнимается, рамка меняется на тень.
          </p>
        </Card>
        <Card className="flex flex-col gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      </div>
    </Section>
  );
}

function OverlaySection() {
  const toast = useToast();
  return (
    <Section
      label="Окна и сообщения"
      title="Диалог и уведомления"
      note="На телефоне диалог выезжает снизу шторкой, на компьютере появляется по центру."
    >
      <div className="flex flex-wrap gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Открыть диалог</Button>
          </DialogTrigger>
          <DialogContent
            title="Войдите, чтобы голосовать и предлагать идеи"
            description="После входа вернём вас на эту же доску."
            closeLabel="Закрыть"
          >
            <div className="flex flex-col gap-4 md:flex-row">
              <Button className="flex-1">Войти</Button>
              <Button variant="secondary" className="flex-1">
                Регистрация
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          variant="secondary"
          onClick={() => toast({ title: "Голос учтён", tone: "success" })}
        >
          Успех
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast({
              title: "Слишком часто",
              description: "Попробуйте через 2 минуты",
              tone: "error",
            })
          }
        >
          Ошибка
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast({ title: "Ссылка скопирована" })}
        >
          Обычное
        </Button>
      </div>
    </Section>
  );
}

function StateSection() {
  return (
    <Section label="Пусто" title="Пустое состояние">
      <Card>
        <EmptyState
          title="Пожеланий пока нет"
          text="Будьте первым — расскажите, что добавить в игру."
          action={<Button doodle>Новое пожелание</Button>}
        />
      </Card>
    </Section>
  );
}

function RevealSection() {
  return (
    <Section
      label="Прокрутка"
      title="Появление при прокрутке"
      note="Блоки поднимаются и проявляются по очереди, один раз."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {["Раз", "Два", "Три"].map((word, index) => (
          <Reveal key={word} delay={index * 0.1}>
            <Card className="grid h-40 place-items-center">
              <p className="font-display text-h2">{word}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
