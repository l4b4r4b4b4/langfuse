import { type NextApiRequest, type NextApiResponse } from "next";
import { z } from "zod";
import { cors, runMiddleware } from "@/src/features/public-api/server/cors";
import { prisma } from "@/src/server/db";
import { verifyAuthHeaderAndReturnScope } from "@/src/features/public-api/server/apiAuth";

const CreateDatasetSchema = z.object({
  name: z.string(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await runMiddleware(req, res, cors);

  // CHECK AUTH
  const authCheck = await verifyAuthHeaderAndReturnScope(
    req.headers.authorization,
  );
  if (!authCheck.validKey)
    return res.status(401).json({
      success: false,
      message: authCheck.error,
    });
  // END CHECK AUTH

  try {
    if (req.method === "POST") {
      console.log(
        "Trying to create dataset, project ",
        authCheck.scope.projectId,
        ", body:",
        JSON.stringify(req.body, null, 2),
      );

      const { name } = CreateDatasetSchema.parse(req.body);

      // CHECK ACCESS SCOPE
      if (authCheck.scope.accessLevel !== "all")
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      // END CHECK ACCESS SCOPE

      const dataset = await prisma.dataset.upsert({
        where: {
          projectId_name: {
            projectId: authCheck.scope.projectId,
            name,
          },
        },
        create: {
          name,
          projectId: authCheck.scope.projectId,
        },
        update: {},
      });

      res.status(200).json({ ...dataset, items: [], runs: [] });
    }
  } catch (error: unknown) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({
      success: false,
      message: "Invalid request data",
      error: errorMessage,
    });
  }
}
