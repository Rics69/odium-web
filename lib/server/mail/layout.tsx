import "server-only";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";

// Mail clients know nothing of our CSS variables and fonts, so the colours
// of app/globals.css are repeated here and the type falls back to system
// faces. Everything is inline, as mail clients want it.
const color = {
  paper: "#f7f3eb",
  surface: "#fffdf9",
  ink: "#1c1a17",
  ink2: "#5e5850",
  ink3: "#8f887d",
  line: "#e5dfd3",
  accent: "#2d46e6",
  white: "#ffffff",
};

const sans =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const display = "'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const style = {
  body: {
    margin: 0,
    backgroundColor: color.paper,
    color: color.ink,
    fontFamily: sans,
  },
  // Some clients (Gmail among them) drop the styles of <body>: the paper
  // background is repeated on a full-width table.
  page: { padding: "32px 0", backgroundColor: color.paper },
  container: { maxWidth: "560px", padding: "0 16px" },
  wordmark: {
    margin: "0 0 24px",
    fontFamily: display,
    fontSize: "26px",
    fontWeight: 900,
    letterSpacing: "-0.02em",
    color: color.ink,
  },
  card: {
    padding: "32px",
    backgroundColor: color.surface,
    border: `1px solid ${color.line}`,
    borderRadius: "16px",
  },
  label: {
    margin: "0 0 8px",
    fontSize: "13px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: color.accent,
  },
  heading: {
    margin: "0 0 24px",
    fontFamily: display,
    fontSize: "28px",
    lineHeight: "1.15",
    fontWeight: 900,
    color: color.ink,
  },
  paragraph: {
    margin: "0 0 16px",
    fontSize: "16px",
    lineHeight: "1.5",
    color: color.ink,
  },
  button: {
    display: "inline-block",
    margin: "8px 0 24px",
    padding: "14px 24px",
    backgroundColor: color.accent,
    borderRadius: "12px",
    color: color.white,
    fontSize: "16px",
    fontWeight: 600,
    textDecoration: "none",
  },
  note: {
    margin: "0 0 8px",
    fontSize: "14px",
    lineHeight: "1.5",
    color: color.ink2,
  },
  link: { color: color.accent, wordBreak: "break-all" },
  footer: {
    margin: "24px 0 0",
    fontSize: "13px",
    lineHeight: "1.5",
    color: color.ink3,
  },
} satisfies Record<string, CSSProperties>;

/** The frame of every letter: the ODIUM wordmark, a card, the footer. */
export function Letter({
  preview,
  label,
  title,
  children,
}: {
  /** The line mail apps show next to the subject. */
  preview: string;
  label: string;
  title: string;
  children: ReactNode;
}) {
  const site = new URL(env.SITE_URL);
  return (
    <Html lang="ru">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={style.body}>
        <Section style={style.page}>
          <Container style={style.container}>
            <Text style={style.wordmark}>
              ODIUM<span style={{ color: color.accent }}> ✦</span>
            </Text>
            <Section style={style.card}>
              <Text style={style.label}>[ {label} ]</Text>
              <Heading as="h1" style={style.heading}>
                {title}
              </Heading>
              {children}
            </Section>
            <Text style={style.footer}>
              {t("emails.footer")}{" "}
              <Link href={site.origin} style={{ color: color.ink3 }}>
                {site.host}
              </Link>
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={style.paragraph}>{children}</Text>;
}

/** The main button, with the address spelled out for when it does not work. */
export function Action({ href, children }: { href: string; children: string }) {
  return (
    <>
      <Button href={href} style={style.button}>
        {children}
      </Button>
      <Text style={style.note}>
        {t("emails.linkHint")}{" "}
        <Link href={href} style={style.link}>
          {href}
        </Link>
      </Text>
    </>
  );
}

/** Small print: how long a link lives, what to do if it was not you. */
export function Note({ children }: { children: ReactNode }) {
  return <Text style={style.note}>{children}</Text>;
}
