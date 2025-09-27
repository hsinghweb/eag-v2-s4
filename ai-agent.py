import asyncio
import os
import re
import logging
from typing import Any, Dict, List

from dotenv import load_dotenv

import google.generativeai as genai
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

load_dotenv()

logging.basicConfig(
    filename="math_agent_mcp.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _extract_params(schema: Dict[str, Any]) -> List[str]:
    """Return parameter names in order from a JSON schema."""
    if not schema or "properties" not in schema:
        return []
    return list(schema["properties"].keys())


def _tool_description(index: int, name: str, params: List[str], desc: str) -> str:
    sig = ", ".join(params)
    return f"{index}. {name}({sig}) - {desc}"


def _safe_eval(expr: str):
    try:
        return eval(expr, {"__builtins__": {}})
    except Exception:
        return expr.strip().strip("\"").strip("'")

# ---------------------------------------------------------------------------
# MCP Math Agent class
# ---------------------------------------------------------------------------

class MCPMathAgent:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.client = genai.GenerativeModel("gemini-2.5-flash")
        self.results: Dict[str, Any] = {}
        self.max_iterations = 6
        self.tool_metadata: Dict[str, Dict[str, Any]] = {}
        self.system_prompt: str = ""

    # ----------------------- MCP Connection ------------------------------

    async def _start_mcp(self) -> ClientSession:
        """Launch mcp-server in dev mode via stdio and return session."""
        params = StdioServerParameters(command="python", args=["mcp-server.py", "dev"])
        read, write = await stdio_client(params).__aenter__()
        session = ClientSession(read, write)
        await session.__aenter__()
        await session.initialize()
        return session

    async def _prepare_tools(self, session: ClientSession):
        resp = await session.list_tools()
        descriptions = []
        for idx, t in enumerate(resp.tools, 1):
            params = _extract_params(t.inputSchema)
            descriptions.append(_tool_description(idx, t.name, params, t.description or ""))
            self.tool_metadata[t.name] = {"params": params}
        tool_block = "\n".join(descriptions)
        self.system_prompt = (
            "You are a math agent. Respond with EXACTLY ONE of these formats:\n"
            "1. FUNCTION_CALL: tool_name|input\n"
            "2. FINAL_ANSWER: [number]\n\n"
            "where tool_name is one of the following functions:\n" + tool_block + "\n\n"
            "DO NOT include multiple responses. Give ONE response at a time."
        )

    # ----------------------- Tool Execution ------------------------------

    async def _call_tool(self, session: ClientSession, call_str: str):
        name, param_part = call_str.split("|", 1)
        # Substitute previous results
        param_part = re.sub(r"\$result_(\d+)", lambda m: str(self.results.get(f"result_{m.group(1)}", "")), param_part)
        evaluated = _safe_eval(param_part)
        params_schema = self.tool_metadata[name]["params"]
        if isinstance(evaluated, dict):
            args = evaluated
        elif isinstance(evaluated, (list, tuple)):
            args = {params_schema[i]: evaluated[i] for i in range(len(evaluated))}
        else:
            args = {params_schema[0]: evaluated} if params_schema else {}
        res_msg = await session.call_tool(name, arguments=args)
        texts = [c.text for c in res_msg.content if hasattr(c, "text")]
        return "\n".join(texts)

    # ----------------------- Solve Loop ----------------------------------

    async def solve(self, query: str):
        async with (await self._start_mcp()) as session:  # type: ignore
            await self._prepare_tools(session)
            iteration = 0
            context: List[str] = []
            iteration_response: List[str] = []
            last_response = None
            result = None
            while iteration < self.max_iterations:
                if last_response is None:
                    current_query = query
                else:
                    current_query = query + "\n\n" + " ".join(iteration_response) + "  What should I do next?"
                prompt = f"{self.system_prompt}\n\nQuery: {current_query}\nContext: {context}"
                resp = self.client.generate_content(prompt)
                text = resp.text.strip()
                logging.info(f"Iteration {iteration+1} LLM response: {text}")
                if text.startswith("FUNCTION_CALL:"):
                    call_str = text.split("FUNCTION_CALL:", 1)[1].strip()
                    try:
                        tool_result = await self._call_tool(session, call_str)
                        step = len(self.results) + 1
                        self.results[f"result_{step}"] = tool_result
                        name, params = call_str.split("|", 1)
                        iteration_response.append(f"In iteration {iteration+1}, you called {name} with {params} and got {tool_result}.")
                        context.append(f"Step {step} result: {tool_result}")
                        last_response = tool_result
                        iteration += 1
                        continue
                    except Exception as e:
                        return f"Error executing tool: {e}"
                elif text.startswith("FINAL_ANSWER:"):
                    ans_part = text.split("FINAL_ANSWER:", 1)[1].strip()
                    try:
                        return _safe_eval(ans_part.strip("[]"))
                    except Exception:
                        return ans_part
                else:
                    return "Error: Unexpected LLM response format"
            return result

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    q = input("Enter math query: ")
    agent = MCPMathAgent()
    res = asyncio.run(agent.solve(q))
    print("Result:", res)

if __name__ == "__main__":
    main()
