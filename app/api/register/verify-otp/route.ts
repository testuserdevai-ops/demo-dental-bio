import { coordinateRegistrationCompletion } from "./_lib/coordinator";

export async function POST(request: Request) {
  return coordinateRegistrationCompletion(request);
}
