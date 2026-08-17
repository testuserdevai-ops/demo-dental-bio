import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { selectProfileTreatmentServices } from "../app/[username]/_lib/profile-treatment-services";
import type { PublicProfileViewModel } from "../app/[username]/_lib/public-profile";

const execFileAsync = promisify(execFile);
const showcases = [
  {
    name: "Direct Booking",
    email: "template-direct-booking@dentalbio.local",
    userId: "db010000-0000-4000-8000-000000000001",
    treatmentTitle: "Treatments chosen for you",
    serviceTitle: "Appointment services",
    treatmentIds: [
      "db010000-0000-4000-8000-000000000007",
      "db010000-0000-4000-8000-000000000006",
      "db010000-0000-4000-8000-000000000008",
      "8648cd71-0736-42e5-8af7-3ec780d7c163",
      "ff93ae84-c953-469e-8261-69b7fa69e1ed",
      "abc50f71-b074-4845-848b-50495f4c8799",
    ],
    serviceIds: [
      "da6f2415-7954-4025-872a-0bd94dce8688",
      "bab62dba-28b3-487c-8bb0-338f8506ea58",
    ],
  },
  {
    name: "Clinic Commerce",
    email: "template-clinic-commerce@dentalbio.local",
    userId: "c11c0000-0000-4000-8000-000000000001",
    treatmentTitle: "Clinical treatments",
    serviceTitle: "Clinic services",
    treatmentIds: [
      "c11c0000-0000-4000-8000-000000000007",
      "7ef7cbb1-5487-4164-80b2-c860a4122b60",
      "48bf1766-4996-4b73-8eff-c2a86bf3c50b",
      "592a56be-4229-44e1-8d2d-a9005310118e",
    ],
    serviceIds: [
      "c11c0000-0000-4000-8000-000000000006",
      "c11c0000-0000-4000-8000-000000000008",
      "d1f92332-84dc-42d6-8efc-e3ebe543e8f5",
      "894f4828-0f03-432b-8b08-679402d2084a",
    ],
  },
  {
    name: "Cosmetic Transformation",
    email: "template-cosmetic-results@dentalbio.local",
    userId: "c051e71c-0000-4000-8000-000000000001",
    treatmentTitle: "Smile treatments",
    serviceTitle: "Planning services",
    treatmentIds: [
      "c051e71c-0000-4000-8000-000000000007",
      "c051e71c-0000-4000-8000-000000000006",
      "c051e71c-0000-4000-8000-000000000008",
      "50101f61-5eaa-4a31-8d59-8af54023b620",
      "8173d762-8ec2-4fb8-868e-a460955e07be",
      "e24ddec3-2b17-4ebc-8642-bfeb91e5d668",
    ],
    serviceIds: [
      "96786744-278b-47d6-8861-527dce8eeeef",
      "26b8b48c-dc6e-40a7-8d76-59a7aff21940",
    ],
  },
  {
    name: "Trust First",
    email: "template-trust-first@dentalbio.local",
    userId: "7f570000-0000-4000-8000-000000000001",
    treatmentTitle: "Family treatments",
    serviceTitle: "Family services",
    treatmentIds: [
      "7f570000-0000-4000-8000-000000000006",
      "7f570000-0000-4000-8000-000000000007",
      "7f570000-0000-4000-8000-000000000008",
      "80f7b165-73f9-4752-87d0-ec595baafbd9",
      "b40f4baf-2362-4cec-81eb-a968e93b8eb2",
      "a33ca4e4-2e76-4187-8bd4-159d1ed4e732",
    ],
    serviceIds: [
      "c4f048f1-e2df-47d5-8dab-1722c6a360ed",
      "112dc1df-3510-41a2-8294-d80b011a4e9f",
    ],
  },
  {
    name: "Specialist Assessment",
    email: "template-specialist-assessment@dentalbio.local",
    userId: "5a5e5500-0000-4000-8000-000000000001",
    treatmentTitle: "Specialist treatments chosen by the owner",
    serviceTitle: "Assessment services",
    treatmentIds: [
      "5a5e5500-0000-4000-8000-000000000201",
      "5a5e5500-0000-4000-8000-000000000202",
      "5a5e5500-0000-4000-8000-000000000203",
      "c3b42dc4-3d42-4041-868d-8076b149c218",
      "d30e6a59-5893-471b-8cd0-d0a05bb3c6d4",
      "c9e64b2f-e4a0-4499-87d1-2c3c273aa95b",
    ],
    serviceIds: [
      "62e5ff1d-8f17-4e0d-81e2-2c07a79b7e92",
      "680d42d8-1040-4793-8903-1d469917994a",
    ],
  },
  {
    name: "Location Router",
    email: "template-location-router@dentalbio.local",
    userId: "10ca7100-0000-4000-8000-000000000001",
    treatmentTitle: "Available treatments",
    serviceTitle: "Available services",
    treatmentIds: [
      "8f23e61b-ffa8-4e65-8f7f-108d0f80811d",
      "6e37c61a-1812-49b7-8feb-685fe7a3fabd",
      "8ebba5e8-5e80-465e-8022-7e6c6dada6e4",
      "173acee4-07b1-4f1f-82a6-e3b6377994ba",
    ],
    serviceIds: [
      "d3c17788-aec5-45c0-8499-0cce3814c728",
      "72438a17-42d8-48e3-8ffa-df8b16547ba8",
    ],
  },
  {
    name: "Expert Educator",
    email: "template-expert-educator@dentalbio.local",
    userId: "ed0ca700-0000-4000-8000-000000000001",
    treatmentTitle: "Clinical treatments",
    serviceTitle: "Education and consultation services",
    treatmentIds: [
      "ed0ca700-0000-4000-8000-000000000006",
      "ed0ca700-0000-4000-8000-000000000007",
      "ed0ca700-0000-4000-8000-000000000008",
      "7278c4e4-6747-47fd-8237-2096722ebee3",
      "14915a12-9915-4a47-8736-7062dd88408c",
      "4fa0fd77-ec4f-417f-886f-f30524b1fca5",
    ],
    serviceIds: [
      "6a65b178-fd21-4d8c-8882-bc41cd9187a4",
      "412f8082-07cc-493b-8bc4-411be9972bfd",
    ],
  },
  {
    name: "Services Catalogue",
    email: "template-services-catalogue@dentalbio.local",
    userId: "5e010000-0000-4000-8000-000000000001",
    treatmentTitle: "Treatments explained clearly",
    serviceTitle: "Appointment services",
    treatmentIds: [
      "5e010000-0000-4000-8000-000000000006",
      "5e010000-0000-4000-8000-000000000007",
      "5e010000-0000-4000-8000-000000000008",
      "7c1b749a-9782-4dae-88ba-3145b1cdba4e",
      "c48e8345-220e-4e56-8b2b-a556d04af7d4",
      "aa1a3dd7-6a3d-4883-85c0-2e5a894346e0",
    ],
    serviceIds: [
      "5e010000-0000-4000-8000-000000000009",
      "5e010000-0000-4000-8000-00000000000a",
      "5e010000-0000-4000-8000-00000000000b",
      "75dbd5f1-3850-4d8b-851c-2642a8784006",
      "932584bb-f5f9-492e-8c59-baa5a9c1ffc4",
    ],
  },
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertExact(
  actual: readonly string[],
  expected: readonly string[],
  message: string,
) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message}: expected ${expected.join(",")}; received ${actual.join(",")}`,
  );
}

function loopbackOrigin(input: string) {
  const url = new URL(input);
  assert(
    url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname) &&
      Boolean(url.port) &&
      !url.username &&
      !url.password,
    "Refusing to verify a non-loopback Supabase API.",
  );
  return url.origin;
}

async function environment() {
  const url = process.env.E2E_SUPABASE_URL?.trim();
  const key = process.env.E2E_SUPABASE_ANON_KEY?.trim();
  if (url || key) {
    assert(url && key, "Set both E2E Supabase credentials.");
    return { url: loopbackOrigin(url), key };
  }
  const configured = process.env.LOCAL_SUPABASE_WORKDIR?.trim();
  assert(
    configured,
    "Set an isolated LOCAL_SUPABASE_WORKDIR or explicit loopback credentials.",
  );
  const workdir = realpathSync(resolve(process.cwd(), configured));
  assert(
    statSync(workdir).isDirectory(),
    "LOCAL_SUPABASE_WORKDIR must be a directory.",
  );
  const { stdout } = await execFileAsync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "--output", "json", "--workdir", workdir],
  );
  const status = JSON.parse(stdout) as { API_URL?: string; ANON_KEY?: string };
  assert(
    status.API_URL && status.ANON_KEY,
    "Isolated Supabase status is incomplete.",
  );
  return { url: loopbackOrigin(status.API_URL), key: status.ANON_KEY };
}

const local = await environment();
for (const showcase of showcases) {
  const client = createClient(local.url, local.key, {
    auth: { persistSession: false },
  });
  const { data: session, error: signInError } =
    await client.auth.signInWithPassword({
      email: showcase.email,
      password: "DentalBioPro123!",
    });
  if (signInError) throw signInError;
  assert(
    session.user.id === showcase.userId,
    `${showcase.name} identity is not stable.`,
  );

  const { data: dentistry, error: dentistryError } = await client
    .from("dentistries")
    .select("dentistry_id,treatment_section_title,service_section_title")
    .eq("user_id", showcase.userId)
    .single();
  if (dentistryError) throw dentistryError;
  assert(
    dentistry.treatment_section_title === showcase.treatmentTitle,
    `${showcase.name} treatment title is not owner-managed.`,
  );
  assert(
    dentistry.service_section_title === showcase.serviceTitle,
    `${showcase.name} service title is not owner-managed.`,
  );

  const { data, error } = await client
    .from("dentistry_treatments")
    .select("treatment_id,rank,treatments(title,description,isService)")
    .eq("dentistry_id", dentistry.dentistry_id)
    .order("rank")
    .order("treatment_id");
  if (error) throw error;
  const inventory = selectProfileTreatmentServices(
    data as unknown as PublicProfileViewModel["treatments"],
  );
  assertExact(
    inventory.treatments.map(({ id }) => id),
    showcase.treatmentIds,
    `${showcase.name} treatment order is incomplete`,
  );
  assertExact(
    inventory.services.map(({ id }) => id),
    showcase.serviceIds,
    `${showcase.name} service order is incomplete`,
  );
  assertExact(
    inventory.treatments.map(({ position }) => String(position)),
    showcase.treatmentIds.map((_, index) => String(index + 1)),
    `${showcase.name} treatment positions are invalid`,
  );
  assertExact(
    inventory.services.map(({ position }) => String(position)),
    showcase.serviceIds.map((_, index) => String(index + 1)),
    `${showcase.name} service positions are invalid`,
  );
  assert(
    new Set([...showcase.treatmentIds, ...showcase.serviceIds]).size ===
      showcase.treatmentIds.length + showcase.serviceIds.length,
    `${showcase.name} inventories overlap.`,
  );

  await client.auth.signOut();
  console.log(
    `Verified ${showcase.treatmentIds.length} treatments and ${showcase.serviceIds.length} services for ${showcase.name}.`,
  );
}
