// @ts-nocheck -- Bun provides its test module at runtime.
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Switch } from "./switch";

afterEach(cleanup);

describe("owned overlays and controls", () => {
  it("keeps keyboard focus in a dialog and restores it after Escape", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open profile</DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your public details.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Open profile" });
    await user.tab();
    expect(document.activeElement).toBe(trigger);
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeTruthy();
    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(document.activeElement).toBe(close);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("uses a deliberate cancel path for alert dialogs", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete bio</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this bio?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete bio" }));
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancel);
    fireEvent.click(cancel);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("supports switch Space activation and select keyboard selection", async () => {
    const user = userEvent.setup();
    function Controls() {
      const [checked, setChecked] = useState(false);
      const [value, setValue] = useState("");
      return (
        <>
          <Switch
            aria-label="Publish profile"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Select name="profession" value={value} onValueChange={setValue}>
            <SelectTrigger aria-label="Profession">
              <SelectValue placeholder="Choose profession" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dentist">Dentist</SelectItem>
            </SelectContent>
          </Select>
        </>
      );
    }
    render(<Controls />);
    const switchControl = screen.getByRole("switch", {
      name: "Publish profile",
    });
    await user.tab();
    expect(document.activeElement).toBe(switchControl);
    await user.keyboard(" ");
    expect(switchControl.getAttribute("aria-checked")).toBe("true");
    await user.tab();
    const select = screen.getByRole("combobox", { name: "Profession" });
    expect(document.activeElement).toBe(select);
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Dentist" })).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("combobox", { name: "Profession" }).textContent,
    ).toContain("Dentist");
  });
});
