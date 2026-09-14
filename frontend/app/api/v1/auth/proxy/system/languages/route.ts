import {
  handleSystemLanguageCreate,
  handleSystemLanguagesListGet,
} from "@/lib/bff-system-language-handlers";

export async function GET(request: Request) {
  return handleSystemLanguagesListGet(request);
}

export async function POST(request: Request) {
  return handleSystemLanguageCreate(request);
}
