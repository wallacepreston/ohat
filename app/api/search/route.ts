import { SerpAPI } from "@langchain/community/tools/serpapi"

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    const serpApi = new SerpAPI(process.env.SERPAPI_API_KEY)
    const results = await serpApi.call(query)
    return Response.json({ results })
  } catch (error) {
    return Response.json({ error: "Failed to perform search" }, { status: 500 })
  }
}

