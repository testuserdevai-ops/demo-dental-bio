import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

mock.module("@/utils/loadScript", () => ({
  loadGoogleMapsScript: () => new Promise<void>(() => {}),
}));

const { default: GoogleMapAutocomplete } =
  await import("./GoogleMapAutocomplete");

afterEach(cleanup);

function renderAutocomplete(defaultAddress = "10 Old Street") {
  return render(
    <GoogleMapAutocomplete
      id="location"
      defaultAddress={defaultAddress}
      cityname="Old City"
      defaultBusinessName="Old Practice"
      defaultCountry="Old Country"
      defaultArea="Old Area"
      defaultLatitude={1}
      defaultLongitude={2}
    />,
  );
}

describe("GoogleMapAutocomplete authoritative location drafts", () => {
  it("retains local typing across unrelated rerenders and resets on authoritative address changes", () => {
    const view = renderAutocomplete();
    const address = screen.getByLabelText("Enter your address");

    fireEvent.change(address, { target: { value: "Typed locally" } });
    view.rerender(
      <GoogleMapAutocomplete
        id="location"
        defaultAddress="10 Old Street"
        cityname="Old City"
        defaultBusinessName="Old Practice"
        defaultCountry="Old Country"
        defaultArea="Old Area"
        defaultLatitude={1}
        defaultLongitude={2}
        errors={{ address: "Review this address" }}
      />,
    );
    expect((address as HTMLInputElement).value).toBe("Typed locally");

    view.rerender(
      <GoogleMapAutocomplete
        id="location"
        defaultAddress="20 New Street"
        cityname="New City"
        defaultBusinessName="New Practice"
        defaultCountry="New Country"
        defaultArea="New Area"
        defaultLatitude={3}
        defaultLongitude={4}
      />,
    );

    expect((address as HTMLInputElement).value).toBe("20 New Street");
    expect(
      (screen.getByLabelText("Business Name") as HTMLInputElement).value,
    ).toBe("New Practice");
    expect(screen.getAllByDisplayValue("New City")).toHaveLength(2);
    expect(
      (document.querySelector('input[name="country"]') as HTMLInputElement)
        .value,
    ).toBe("New Country");
    expect(
      (document.querySelector('input[name="latitude"]') as HTMLInputElement)
        .value,
    ).toBe("3");
    expect(
      (document.querySelector('input[name="longitude"]') as HTMLInputElement)
        .value,
    ).toBe("4");
  });
});
