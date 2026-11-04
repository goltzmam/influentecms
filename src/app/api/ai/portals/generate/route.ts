import sharp from "sharp";
import { apiOwner, jsonBody, apiError, ApiFailure } from "@/lib/ai/access";
import { briefSchema } from "@/lib/ai/schema";
import { generateBlueprint, AiError } from "@/lib/ai/gemini";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  let auth: Awaited<ReturnType<typeof apiOwner>> | undefined,
    jobId: string | undefined;
  try {
    auth = await apiOwner(request, true);
    const input = briefSchema.safeParse(await jsonBody(request, 4400000));
    if (!input.success)
      throw new ApiFailure(
        400,
        input.error.issues[0]?.message || "Confira a descrição e os links.",
      );
    if (
      !process.env.GEMINI_API_KEY &&
      !process.env.GEMINI_API &&
      !process.env.GOOGLE_API_KEY
    )
      throw new ApiFailure(
        503,
        "A FLUE está temporariamente indisponível. Tente novamente em instantes.",
      );
    for (const image of input.data.referenceImages) {
      try {
        const metadata = await sharp(Buffer.from(image.data, "base64"), {
          limitInputPixels: 20000000,
        }).metadata();
        if (
          Buffer.from(image.data, "base64").length > 1048576 ||
          (metadata.pages || 1) > 1 ||
          !["png", "jpeg", "webp"].includes(metadata.format || "") ||
          (metadata.width || 0) * (metadata.height || 0) > 20000000
        )
          throw new Error();
      } catch {
        throw new ApiFailure(
          400,
          "Uma das imagens de referência é inválida ou grande demais. Use PNG, JPG ou WebP de até 1 MB.",
        );
      }
    }
    const start = await auth.client.rpc("start_portal_ai_job", {
      p_organization: auth.organizationId,
      p_brief: input.data.brief,
      p_references: input.data.references,
    });
    if (start.error) {
      if (start.error.message.includes("ai_rate_limit"))
        throw new ApiFailure(
          429,
          "Você atingiu o limite de 5 projetos por hora. Aguarde para gerar novamente.",
        );
      if (start.error.message.includes("ai_busy"))
        throw new ApiFailure(
          409,
          "Já existe um projeto sendo gerado. Aguarde sua conclusão.",
        );
      throw new ApiFailure(
        503,
        "Não foi possível iniciar a criação. Tente novamente em instantes.",
      );
    }
    jobId = start.data;
    const result = await generateBlueprint(input.data, {
      signal: request.signal,
    });
    const saved = await auth.client.rpc("finish_portal_ai_job", {
      p_job: jobId,
      p_plan: result.plan,
      p_model: result.model,
      p_references: result.references,
      p_warnings: result.warnings,
      p_failed: false,
    });
    if (saved.error)
      throw new ApiFailure(
        500,
        "O resultado não pôde ser salvo. Tente abrir o projeto pelo histórico antes de gerar novamente.",
      );
    return Response.json(
      {
        jobId,
        plan: result.plan,
        references: result.references,
        warnings: result.warnings,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AiError)
      console.warn(
        JSON.stringify({
          event: "flue_generation_failed",
          jobId,
          code: error.code,
          status: error.diagnostic?.status,
        }),
      );
    if (auth && jobId)
      await auth.client.rpc("finish_portal_ai_job", {
        p_job: jobId,
        p_plan: null,
        p_model: null,
        p_references: [],
        p_warnings: [
          error instanceof AiError ? error.code : "generation_failed",
        ],
        p_failed: true,
      });
    if (error instanceof AiError)
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.code === "provider_quota" ? 429 : 502 },
      );
    return apiError(error);
  }
}
