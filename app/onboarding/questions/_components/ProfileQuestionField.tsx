"use client";

import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { buttonVariants } from "@/app/components/ui/button";
import type {
  ProfileQuestion,
  QuestionContentOptions,
  QuestionOption,
} from "@/lib/profile-presentation/questions/registry";
import { cn } from "@/lib/utils";

type ProfileQuestionFieldProps = {
  question: ProfileQuestion;
  value: unknown;
  contentOptions: QuestionContentOptions;
  error?: string;
  disabled: boolean;
  onChange(field: string, value: unknown): void;
};

function Choice({
  checked,
  description,
  disabled,
  inputId,
  label,
  multiple,
  name,
  onChange,
}: {
  checked: boolean;
  description?: string;
  disabled: boolean;
  inputId: string;
  label: string;
  multiple: boolean;
  name: string;
  onChange(): void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-[var(--radius-md)] border bg-card p-4 transition-colors motion-reduce:transition-none",
        checked
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/60",
        disabled && "cursor-wait opacity-60",
      )}
      htmlFor={inputId}
    >
      <input
        checked={checked}
        className="mt-1 size-4 shrink-0 accent-primary"
        disabled={disabled}
        id={inputId}
        name={name}
        onChange={onChange}
        type={multiple ? "checkbox" : "radio"}
      />
      <span className="min-w-0">
        <span className="block font-semibold text-card-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function Options({
  question,
  options,
  value,
  disabled,
  onChange,
}: {
  question: Extract<
    ProfileQuestion,
    { kind: "choice" | "multiple-choice" | "entity-single" | "entity-multiple" }
  >;
  options: readonly QuestionOption[];
  value: unknown;
  disabled: boolean;
  onChange(field: string, value: unknown): void;
}) {
  const multiple =
    question.kind === "multiple-choice" || question.kind === "entity-multiple";
  const selected = Array.isArray(value) ? value : [];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const checked = multiple
          ? selected.includes(option.id)
          : value === option.id;
        return (
          <Choice
            checked={checked}
            description={option.description}
            disabled={disabled}
            inputId={`${question.id}-${option.id}`}
            key={option.id}
            label={option.label}
            multiple={multiple}
            name={question.field}
            onChange={() => {
              if (!multiple) {
                onChange(question.field, option.id);
                return;
              }
              const next = checked
                ? selected.filter((id) => id !== option.id)
                : [...selected, option.id];
              onChange(question.field, next);
            }}
          />
        );
      })}
    </div>
  );
}

export function ProfileQuestionField({
  question,
  value,
  contentOptions,
  error,
  disabled,
  onChange,
}: ProfileQuestionFieldProps) {
  const descriptionId = `${question.id}-description`;
  const errorId = `${question.id}-error`;
  const describedBy = [descriptionId, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  if (question.kind === "content-review") {
    return (
      <section aria-labelledby={`${question.id}-title`}>
        <h2 className="text-2xl font-bold" id={`${question.id}-title`}>
          {question.title}
        </h2>
        <p className="mt-2 leading-7 text-muted-foreground">
          {question.helpText}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {question.builderLinks.map((link) => (
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto min-h-12 justify-start whitespace-normal py-3 text-left",
              )}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  const options =
    question.kind === "entity-single" || question.kind === "entity-multiple"
      ? contentOptions[question.source]
      : "options" in question
        ? question.options
        : undefined;

  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={Boolean(error)}
      className="scroll-mb-36"
    >
      <legend className="text-2xl font-bold text-foreground">
        {question.title}
        {question.required ? (
          <span className="ml-2 text-sm font-semibold text-primary">
            Required
          </span>
        ) : (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            Optional
          </span>
        )}
      </legend>
      <p className="mt-2 leading-7 text-muted-foreground" id={descriptionId}>
        {question.helpText}
      </p>
      {error ? (
        <p
          className="mt-3 scroll-mb-36 text-sm font-semibold text-destructive outline-none"
          id={errorId}
          role="alert"
          tabIndex={-1}
        >
          {error}
        </p>
      ) : null}

      {options?.length === 0 &&
      (question.kind === "entity-single" ||
        question.kind === "entity-multiple") ? (
        <Alert className="mt-6">
          <AlertTitle>No saved options yet</AlertTitle>
          <AlertDescription>
            <p>{question.emptyMessage}</p>
            <Link
              className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
              href={question.builderHref}
            >
              Open the existing builder
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6">
        {question.kind === "boolean" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              checked={value === true}
              disabled={disabled}
              inputId={`${question.id}-yes`}
              label={question.trueLabel}
              multiple={false}
              name={question.field}
              onChange={() => onChange(question.field, true)}
            />
            <Choice
              checked={value === false}
              disabled={disabled}
              inputId={`${question.id}-no`}
              label={question.falseLabel}
              multiple={false}
              name={question.field}
              onChange={() => onChange(question.field, false)}
            />
          </div>
        ) : options && options.length > 0 ? (
          <Options
            disabled={disabled}
            onChange={onChange}
            options={options}
            question={question}
            value={value}
          />
        ) : null}
      </div>
    </fieldset>
  );
}
